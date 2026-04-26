import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

test.describe('Public navigation utility links', () => {
  test('homepage utility link reaches the guest portal without runtime errors', async ({ page }) => {
    test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable public navigation smoke tests.');

    const issues = attachRuntimeGuards(page);

    await page.goto(`${tenantBaseUrl}/`);

    const navigation = page.getByRole('navigation').first();
    await expect(navigation).toBeVisible();

    const mainLinks = navigation.locator('ul').first().getByRole('link');
    await expect(mainLinks.first()).toBeVisible();

    const utilityLinks = page.getByRole('list', { name: /navigation utility links/i }).getByRole('link');
    await expect(utilityLinks.first()).toBeVisible();

    await utilityLinks.first().click();

    await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/guest-portal(/|$)`));
    await expect(page.getByRole('heading', { name: 'My bookings' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Get a sign-in link' })).toBeVisible();

    expect(issues, `Runtime issues detected in public navigation utility flow:\n${formatIssues(issues)}`).toEqual([]);
  });

  test('unauthenticated guest portal can request a magic link without runtime errors', async ({ page }) => {
    test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable public navigation smoke tests.');

    const issues = attachRuntimeGuards(page);
    const email = `playwright.guest.${Date.now()}@example.com`;

    await page.goto(`${tenantBaseUrl}/guest-portal`);

    await expect(page.getByRole('heading', { name: 'My bookings' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Get a sign-in link' })).toBeVisible();

    const requestLinkResponse = page.waitForResponse((response) => {
      try {
        const url = new URL(response.url());

        return response.request().method() === 'POST'
          && url.pathname.endsWith('/api/guest-auth/request-link');
      } catch {
        return false;
      }
    });

    await page.getByLabel('Email address').fill(email);
    await page.getByRole('button', { name: 'Send sign-in link' }).click();

    const response = await requestLinkResponse;
    await expect(response.ok()).toBeTruthy();
    await expect(page.getByText(`We sent a secure sign-in link to ${email}.`)).toBeVisible();

    expect(issues, `Runtime issues detected in guest portal magic-link flow:\n${formatIssues(issues)}`).toEqual([]);
  });
});
