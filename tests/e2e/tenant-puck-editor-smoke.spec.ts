import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';
import { submitLoginAndCaptureToken, tenantOwnerCredentials } from './support/auth';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

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
