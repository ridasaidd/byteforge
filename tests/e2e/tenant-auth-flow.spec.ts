import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';
import { loginWithCredentials, logoutFromUserMenu, tenantOwnerCredentials } from './support/auth';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

test('tenant owner can login and logout without runtime errors', async ({ page }) => {
  test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable tenant-domain auth flow test.');

  const issues = attachRuntimeGuards(page);

  await page.goto(`${tenantBaseUrl}/login`);
  await loginWithCredentials(page, tenantOwnerCredentials);

  await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/cms(/|$)`));

  await logoutFromUserMenu(page);
  await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/login(/|$)`));

  expect(issues, `Runtime issues detected in tenant auth flow:\n${formatIssues(issues)}`).toEqual([]);
});
