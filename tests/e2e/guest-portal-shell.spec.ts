import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

test('guest portal shell loads without runtime errors', async ({ page }) => {
  test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable guest portal shell smoke tests.');

  const issues = attachRuntimeGuards(page);

  await page.goto(`${tenantBaseUrl}/guest-portal`);

  await expect(page.getByRole('heading', { name: /my bookings|mina bokningar|حجوزاتي/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /get a sign-in link|få en inloggningslänk|احصل على رابط تسجيل الدخول/i })).toBeVisible();
  await expect(page.getByLabel(/email address|e-postadress|البريد الإلكتروني/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /send sign-in link|skicka inloggningslänk|إرسال رابط تسجيل الدخول/i })).toBeVisible();

  const authRelevantIssues = issues.filter((issue) => !issue.message.includes('/api/guest-auth/session'));

  expect(authRelevantIssues, `Runtime issues detected in guest portal shell:\n${formatIssues(authRelevantIssues)}`).toEqual([]);
});
