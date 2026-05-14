import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';
import { submitLoginAndCaptureToken, tenantOwnerCredentials } from './support/auth';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

type PageRecord = {
  id: number;
  slug: string;
};

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

async function deleteIfPresent(
  request: import('@playwright/test').APIRequestContext,
  token: string,
  url: string,
): Promise<void> {
  let res;

  try {
    res = await request.delete(url, { headers: authHeaders(token) });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Target page, context or browser has been closed')) {
      return;
    }

    throw error;
  }

  const responseText = await res.text();

  expect(
    [200, 204, 404],
    `Delete should succeed for ${url}, got ${res.status()} ${res.statusText()}${responseText ? `\n${responseText}` : ''}`,
  ).toContain(res.status());
}

function buildHeadingPageData(seed: string) {
  return {
    content: [
      {
        type: 'Heading',
        props: {
          id: `Heading-${seed}`,
          text: `Playwright Storefront Heading ${seed}`,
          level: '2',
          align: 'left',
        },
      },
    ],
    root: { props: {} },
    zones: {},
  };
}

test('tenant owner can create a page and open the Puck editor without runtime errors', async ({ page }) => {
  test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable tenant Puck editor smoke tests.');

  const issues = attachRuntimeGuards(page);
  const uniquePageTitle = `Playwright Puck Smoke ${Date.now()}`;

  await page.goto(`${tenantBaseUrl}/login`);
  const token = await submitLoginAndCaptureToken(page, tenantOwnerCredentials);
  await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/cms(/|$)`));

  const createResponse = await page.request.post(`${tenantBaseUrl}/api/pages`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    data: {
      title: uniquePageTitle,
      slug: `playwright-puck-smoke-${Date.now()}`,
      page_type: 'general',
      status: 'draft',
      is_homepage: false,
      puck_data: { content: [], root: {} },
    },
  });

  expect(createResponse.ok(), `Failed to create tenant page: ${createResponse.status()} ${createResponse.statusText()}`).toBeTruthy();

  const payload = await createResponse.json() as { data?: { id?: number } };
  const pageId = payload.data?.id;
  expect(pageId, 'Tenant page creation response did not include page id').toBeTruthy();

  await page.goto(`${tenantBaseUrl}/cms/pages/${pageId}/edit`);
  await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/cms/pages/${pageId}/edit(/|$)`));
  await expect(page.getByText(uniquePageTitle, { exact: false })).toBeVisible();

  expect(issues, `Runtime issues detected in tenant Puck editor flow:\n${formatIssues(issues)}`).toEqual([]);
});

test('tenant owner can publish a draft page from the editor and see it render on the storefront', async ({ page, request }) => {
  test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable tenant Puck editor smoke tests.');
  test.setTimeout(90000);

  const issues = attachRuntimeGuards(page);
  const seed = `${Date.now()}`;
  const uniquePageTitle = `Playwright Editor Storefront ${seed}`;
  const headingText = `Playwright Storefront Heading ${seed}`;

  await page.goto(`${tenantBaseUrl}/login`);
  const token = await submitLoginAndCaptureToken(page, tenantOwnerCredentials);
  await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/cms(/|$)`));

  let createdPage: PageRecord | null = null;

  try {
    const createResponse = await request.post(`${tenantBaseUrl}/api/pages`, {
      headers: authHeaders(token),
      data: {
        title: uniquePageTitle,
        slug: `playwright-editor-storefront-${seed}`,
        page_type: 'general',
        status: 'draft',
        is_homepage: false,
        puck_data: buildHeadingPageData(seed),
      },
    });

    expect(
      createResponse.ok(),
      `Failed to create tenant draft page: ${createResponse.status()} ${createResponse.statusText()}`,
    ).toBeTruthy();

    const payload = await createResponse.json() as { data?: PageRecord };
    createdPage = payload.data ?? null;
    expect(createdPage?.id, 'Tenant page creation response did not include page id').toBeTruthy();

    await page.goto(`${tenantBaseUrl}/cms/pages/${createdPage!.id}/edit`);
    await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/cms/pages/${createdPage!.id}/edit(/|$)`));
    await expect(page.getByText(uniquePageTitle, { exact: false })).toBeVisible();

    const publishResponsePromise = page.waitForResponse((response) => {
      const editorRequest = response.request();
      return response.url().includes(`/api/pages/${createdPage!.id}`)
        && ['PUT', 'PATCH'].includes(editorRequest.method())
        && response.ok();
    });

    await page.getByText('Publish', { exact: true }).click();
    await publishResponsePromise;

    const publicPageResponsePromise = page.waitForResponse((response) => {
      try {
        const url = new URL(response.url());
        return response.request().method() === 'GET'
          && url.pathname.endsWith(`/api/pages/public/${createdPage!.slug}`)
          && response.ok();
      } catch {
        return false;
      }
    });

    await page.goto(`${tenantBaseUrl}/pages/${createdPage!.slug}`);
    await expect(page.locator('#public-app')).toBeAttached();
    await publicPageResponsePromise;
    await expect(page.getByRole('heading', { name: headingText, level: 2 })).toBeVisible();

    expect(issues, `Runtime issues detected in editor-to-storefront smoke flow:\n${formatIssues(issues)}`).toEqual([]);
  } finally {
    if (createdPage) {
      await deleteIfPresent(request, token, `${tenantBaseUrl}/api/pages/${createdPage.id}`);
    }
  }
});
