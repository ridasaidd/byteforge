import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';
import { loginWithCredentials, tenantOwnerCredentials } from './support/auth';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

test('tenant settings save shows success toast', async ({ page }) => {
  test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable tenant settings toast test.');

  const issues = attachRuntimeGuards(page);

  await page.goto(`${tenantBaseUrl}/login`);
  await loginWithCredentials(page, tenantOwnerCredentials);
  await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/cms(/|$)`));

  await page.goto(`${tenantBaseUrl}/cms/settings`);
  await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/cms/settings(/|$)`));

  const siteTitle = page.locator('#site_title');
  await expect(siteTitle).toBeVisible();

  const originalSiteTitle = (await siteTitle.inputValue()).trim();
  const updatedSiteTitle = `${originalSiteTitle} e2e`;
  await siteTitle.fill(updatedSiteTitle);

  await page.getByRole('button', { name: /save changes|spara ändringar|حفظ التغييرات/i }).click();
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: /Settings updated|Inställningar uppdaterade|تم تحديث الإعدادات/i }).first()
  ).toBeVisible();

  // Restore original state to keep fixture behavior stable between runs.
  await siteTitle.fill(originalSiteTitle);
  await page.getByRole('button', { name: /save changes|spara ändringar|حفظ التغييرات/i }).click();

  expect(issues, `Runtime issues detected in tenant settings toast flow:\n${formatIssues(issues)}`).toEqual([]);
});
