import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';
import { loginWithCredentials, tenantViewerCredentials } from './support/auth';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

test('tenant viewer sees Access Denied on restricted settings route', async ({ page }) => {
  test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable tenant-domain permission tests.');

  const issues = attachRuntimeGuards(page);

  await page.goto(`${tenantBaseUrl}/login`);
  await loginWithCredentials(page, tenantViewerCredentials);
  await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/cms(/|$)`));

  await page.goto(`${tenantBaseUrl}/cms/settings`);
  await expect(page.getByText(/^Access Denied$/i)).toBeVisible();
  await expect(page.getByText(/You do not have permission to access this section\./i)).toBeVisible();

  expect(issues, `Runtime issues detected in tenant permission flow:\n${formatIssues(issues)}`).toEqual([]);
});
