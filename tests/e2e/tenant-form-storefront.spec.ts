import { test, expect, type APIRequestContext } from '@playwright/test';
import { submitLoginAndCaptureToken, tenantOwnerCredentials } from './support/auth';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

type ApiContext = APIRequestContext;

type PageRecord = {
  id: number;
  slug: string;
  title: string;
};

type PageResponse<T> = { data: T };

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

async function deleteIfPresent(request: ApiContext, token: string, url: string): Promise<void> {
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

function buildFormStorefrontPageData(seed: string) {
  return {
    content: [
      {
        type: 'Form',
        props: {
          id: `Form-${seed}`,
          formName: 'Playwright Contact Form',
          submitAction: 'email',
          emailTo: 'contact@example.com',
          webhookUrl: '',
          successMessage: 'Thanks, we received your message.',
          errorMessage: 'Something went wrong. Please try again.',
          display: { mobile: 'flex' },
          direction: 'column',
          justify: 'start',
          align: 'stretch',
          gap: '16',
          width: { mobile: { value: '100', unit: '%' } },
          backgroundColor: { type: 'custom', value: '#ffffff' },
          padding: { mobile: { top: '24', right: '24', bottom: '24', left: '24', unit: 'px', linked: true } },
          margin: { mobile: { top: '0', right: 'auto', bottom: '0', left: 'auto', unit: 'px', linked: false } },
          border: {
            top: { width: '1', style: 'solid', color: '#e5e7eb' },
            right: { width: '1', style: 'solid', color: '#e5e7eb' },
            bottom: { width: '1', style: 'solid', color: '#e5e7eb' },
            left: { width: '1', style: 'solid', color: '#e5e7eb' },
            unit: 'px',
            linked: true,
          },
          shadow: { preset: 'none' },
          formFields: [
            {
              type: 'TextInput',
              props: {
                id: `TextInput-name-${seed}`,
                name: 'name',
                label: 'Name',
                placeholder: 'Enter your name',
                inputType: 'text',
                required: true,
                helpText: '',
                display: { mobile: 'block' },
                margin: { mobile: { top: '0', right: '0', bottom: '12', left: '0', unit: 'px', linked: false } },
                labelColor: { type: 'custom', value: '#111827' },
                inputBackgroundColor: { type: 'custom', value: '#ffffff' },
                inputTextColor: { type: 'custom', value: '#111827' },
                inputBorderColor: { type: 'custom', value: '#d1d5db' },
                focusBorderColor: { type: 'custom', value: '#3b82f6' },
                errorColor: { type: 'custom', value: '#ef4444' },
                borderRadius: '6',
                size: 'md',
                fullWidth: true,
              },
            },
            {
              type: 'TextInput',
              props: {
                id: `TextInput-email-${seed}`,
                name: 'email',
                label: 'Email',
                placeholder: 'Enter your email',
                inputType: 'email',
                required: true,
                helpText: '',
                display: { mobile: 'block' },
                margin: { mobile: { top: '0', right: '0', bottom: '16', left: '0', unit: 'px', linked: false } },
                labelColor: { type: 'custom', value: '#111827' },
                inputBackgroundColor: { type: 'custom', value: '#ffffff' },
                inputTextColor: { type: 'custom', value: '#111827' },
                inputBorderColor: { type: 'custom', value: '#d1d5db' },
                focusBorderColor: { type: 'custom', value: '#3b82f6' },
                errorColor: { type: 'custom', value: '#ef4444' },
                borderRadius: '6',
                size: 'md',
                fullWidth: true,
              },
            },
            {
              type: 'SubmitButton',
              props: {
                id: `SubmitButton-${seed}`,
                text: 'Send',
                loadingText: 'Sending...',
                display: { mobile: 'block' },
                margin: { mobile: { top: '16', right: '0', bottom: '0', left: '0', unit: 'px', linked: false } },
                backgroundColor: { type: 'custom', value: '#3b82f6' },
                textColor: { type: 'custom', value: '#ffffff' },
                hoverBackgroundColor: { type: 'custom', value: '#2563eb' },
                disabledBackgroundColor: { type: 'custom', value: '#9ca3af' },
                borderRadius: '6',
                size: 'md',
                fullWidth: true,
                showIcon: false,
                iconPosition: 'right',
              },
            },
          ],
        },
      },
    ],
    root: { props: {} },
    zones: {},
  };
}

async function createPublishedFormPage(request: ApiContext, token: string, seed: string): Promise<PageRecord> {
  const res = await request.post(`${tenantBaseUrl}/api/pages`, {
    headers: authHeaders(token),
    data: {
      title: `Playwright Form Storefront ${seed}`,
      slug: `playwright-form-storefront-${seed}`,
      page_type: 'general',
      status: 'published',
      is_homepage: false,
      puck_data: buildFormStorefrontPageData(seed),
    },
  });

  expect(res.ok(), `Page creation should succeed: ${res.status()} ${res.statusText()}`).toBeTruthy();

  const body = await res.json() as PageResponse<PageRecord>;
  return body.data;
}

test('published storefront form submits successfully and shows the success message', async ({ page, request }) => {
  test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable storefront form smoke tests.');
  test.setTimeout(90000);

  const issues = attachRuntimeGuards(page);
  const seed = `${Date.now()}`;

  await page.goto(`${tenantBaseUrl}/login`);
  const ownerToken = await submitLoginAndCaptureToken(page, tenantOwnerCredentials);
  await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/cms(/|$)`));

  let publishedPage: PageRecord | null = null;

  try {
    publishedPage = await createPublishedFormPage(request, ownerToken, seed);

    const publicPageResponsePromise = page.waitForResponse((response) => {
      try {
        const url = new URL(response.url());

        return response.request().method() === 'GET'
          && url.pathname.endsWith(`/api/pages/public/${publishedPage?.slug}`);
      } catch {
        return false;
      }
    });

    await page.goto(`${tenantBaseUrl}/pages/${publishedPage.slug}`);
    await expect(page.locator('#public-app')).toBeAttached();
    const publicPageResponse = await publicPageResponsePromise;
    expect(
      publicPageResponse.ok(),
      `Public page fetch should succeed: ${publicPageResponse.status()} ${publicPageResponse.statusText()}`,
    ).toBeTruthy();

    const nameField = page.getByLabel('Name');
    const emailField = page.getByLabel('Email');

    await expect(nameField).toBeVisible();
    await expect(emailField).toBeVisible();

    await nameField.fill('Playwright Contact');
    await emailField.fill('playwright@example.com');

    const submitResponsePromise = page.waitForResponse((response) => {
      try {
        const url = new URL(response.url());
        return response.request().method() === 'POST' && url.pathname.endsWith('/api/form-submit/email');
      } catch {
        return false;
      }
    });

    await page.getByRole('button', { name: 'Send' }).click();

    const submitResponse = await submitResponsePromise;
    expect(submitResponse.ok(), `Form submit response should be OK: ${submitResponse.status()} ${submitResponse.statusText()}`).toBeTruthy();

    const submitPayload = await submitResponse.json() as { sent?: boolean };
    expect(submitPayload.sent).toBe(true);

    await expect(page.getByText('Thanks, we received your message.')).toBeVisible();
    expect(issues, `Runtime issues detected in storefront form submission flow:\n${formatIssues(issues)}`).toEqual([]);
  } finally {
    if (publishedPage) {
      await deleteIfPresent(request, ownerToken, `${tenantBaseUrl}/api/pages/${publishedPage.id}`);
    }
  }
});
