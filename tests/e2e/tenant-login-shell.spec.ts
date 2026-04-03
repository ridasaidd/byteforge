import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

test('tenant login shell loads without runtime console errors', async ({ page }) => {
  test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable tenant-domain smoke tests.');

  const issues = attachRuntimeGuards(page);

  await page.goto(`${tenantBaseUrl}/login`);
  await expect(page.locator('#tenant-app')).toBeVisible();

  expect(issues, `Runtime issues detected on tenant login:\n${formatIssues(issues)}`).toEqual([]);
});
