import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';
import { loginWithCredentials, tenantOwnerCredentials } from './support/auth';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

test('tenant owner can browse core dashboard routes without runtime errors', async ({ page }) => {
  test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable tenant dashboard smoke tests.');

  const issues = attachRuntimeGuards(page);

  await page.goto(`${tenantBaseUrl}/login`);
  await loginWithCredentials(page, tenantOwnerCredentials);
  await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/cms(/|$)`));

  const routes = [
    '/cms',
    '/cms/pages',
    '/cms/navigation',
    '/cms/media',
    '/cms/themes',
  ];

  for (const route of routes) {
    await page.goto(`${tenantBaseUrl}${route}`);
    await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}${route}(/|$)`));
  }

  expect(issues, `Runtime issues detected in tenant dashboard route sweep:\n${formatIssues(issues)}`).toEqual([]);
});
