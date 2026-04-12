import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';
import { loginWithCredentials, tenantOwnerCredentials } from './support/auth';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

async function getAuthToken(page: import('@playwright/test').Page): Promise<string> {
  await page.goto(`${tenantBaseUrl}/login`);
  await loginWithCredentials(page, tenantOwnerCredentials);
  await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/cms(/|$)`));
  const token = await page.evaluate(() => window.localStorage.getItem('auth_token'));
  return token ?? '';
}

test('tenant settings save shows success toast', async ({ page }) => {
  test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable tenant settings toast test.');

  const issues = attachRuntimeGuards(page);

  await getAuthToken(page);

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

test('tenant display format settings round-trip via API', async ({ page, request }) => {
  test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable tenant settings test.');

  const token = await getAuthToken(page);
  expect(token).not.toBe('');

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  // Read current values so we can restore state after assertions.
  const originalRes = await request.get(`${tenantBaseUrl}/api/settings`, { headers });
  expect(originalRes.ok()).toBeTruthy();
  const original = await originalRes.json() as {
    data: { date_format: string; time_format: string };
  };

  const targetDateFormat = original.data.date_format === 'dd/MM/yyyy' ? 'MM/dd/yyyy' : 'dd/MM/yyyy';
  const targetTimeFormat = original.data.time_format === 'h:mm aa' ? 'HH:mm' : 'h:mm aa';

  try {
    const updateRes = await request.put(`${tenantBaseUrl}/api/settings`, {
      headers,
      data: {
        date_format: targetDateFormat,
        time_format: targetTimeFormat,
      },
    });
    expect(updateRes.ok()).toBeTruthy();

    const verifyRes = await request.get(`${tenantBaseUrl}/api/settings`, { headers });
    expect(verifyRes.ok()).toBeTruthy();
    const verify = await verifyRes.json() as {
      data: { date_format: string; time_format: string };
    };

    expect(verify.data.date_format).toBe(targetDateFormat);
    expect(verify.data.time_format).toBe(targetTimeFormat);
  } finally {
    await request.put(`${tenantBaseUrl}/api/settings`, {
      headers,
      data: {
        date_format: original.data.date_format,
        time_format: original.data.time_format,
      },
    });
  }
});
