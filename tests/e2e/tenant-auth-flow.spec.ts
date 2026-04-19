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
  await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('auth_token'))).toBeNull();
  await expect.poll(async () => page.evaluate(() => window.sessionStorage.getItem('auth_token'))).toBeNull();

  await logoutFromUserMenu(page);
  await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/login(/|$)`));
  await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('auth_token'))).toBeNull();
  await expect.poll(async () => page.evaluate(() => window.sessionStorage.getItem('auth_token'))).toBeNull();

  expect(issues, `Runtime issues detected in tenant auth flow:\n${formatIssues(issues)}`).toEqual([]);
});
