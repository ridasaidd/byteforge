/**
 * booking-cms-smoke.spec.ts
 *
 * UI smoke tests for the booking CMS pages (Phase 13.7).
 * Verifies that each booking management page:
 *   - Navigates to the correct URL
 *   - Renders its page heading
 *   - Produces no console errors or failed network requests
 *
 * Pages covered:
 *   /cms/bookings          — BookingsCalendarPage
 *   /cms/bookings/services — ServiceManagerPage
 *   /cms/bookings/resources — ResourceManagerPage
 *   /cms/bookings/settings  — BookingSettingsPage
 *
 * Prerequisites: PLAYWRIGHT_TENANT_BASE_URL + tenant owner credentials.
 * Tests are skipped when the booking addon is not active on the tenant.
 */

import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';
import { loginWithCredentials, tenantOwnerCredentials } from './support/auth';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Check if the booking addon is active by probing /api/addons.
 * GET /api/addons returns { data: string[] } — feature flag slugs.
 */
async function isBookingAddonActive(
  request: import('@playwright/test').APIRequestContext,
  token: string,
): Promise<boolean> {
  const res = await request.get(`${tenantBaseUrl}/api/addons`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok()) return false;
  const body = await res.json() as { data: string[] };
  return Array.isArray(body.data) && body.data.includes('booking');
}

/**
 * Navigate to a CMS page as an authenticated user by injecting the auth
 * token into localStorage before page load. This avoids hitting the login
 * form for every test, preventing rate-limit "Too Many Attempts" errors
 * when many tests run in parallel.
 */
async function gotoWithAuth(
  page: import('@playwright/test').Page,
  url: string,
  token: string,
): Promise<void> {
  await page.addInitScript((t: string) => {
    window.localStorage.setItem('auth_token', t);
  }, token);
  await page.goto(url);
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe('Booking CMS pages — smoke', () => {
  // Run serially to avoid hammering the login endpoint with parallel
  // login attempts which trips Laravel rate limiting ("Too Many Attempts").
  test.describe.configure({ mode: 'serial' });

  /** Auth token obtained once per suite and reused by all tests. */
  let ownerToken = '';

  test.beforeAll(async ({ browser }) => {
    if (!tenantBaseUrl) return;
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    try {
      await p.goto(`${tenantBaseUrl}/login`);
      await loginWithCredentials(p, tenantOwnerCredentials);
      await p.waitForURL(new RegExp(`${tenantBaseUrl}/cms(/|$)`), { timeout: 30_000 });
      ownerToken = (await p.evaluate(() => window.localStorage.getItem('auth_token'))) ?? '';
    } finally {
      await ctx.close();
    }
  });

  test.beforeEach(() => {
    test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable booking CMS smoke tests.');
  });

  test('/cms/bookings renders the Bookings calendar page without errors', async ({ page, request }) => {
    const issues = attachRuntimeGuards(page);
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    await gotoWithAuth(page, `${tenantBaseUrl}/cms/bookings`, ownerToken);
    await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/cms/bookings(/|$)`));

    // Page heading
    await expect(page.getByRole('heading', { name: /bookings/i })).toBeVisible();

    // Week / List toggle buttons visible
    await expect(page.getByRole('button', { name: /week/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /list/i })).toBeVisible();

    expect(issues, `Runtime errors on /cms/bookings:\n${formatIssues(issues)}`).toEqual([]);
  });

  test('/cms/bookings/services renders the Services manager without errors', async ({ page, request }) => {
    const issues = attachRuntimeGuards(page);
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    await gotoWithAuth(page, `${tenantBaseUrl}/cms/bookings/services`, ownerToken);
    await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/cms/bookings/services(/|$)`));

    await expect(page.getByRole('heading', { name: /booking services/i })).toBeVisible();
    // "New service" button is visible for tenant owner
    await expect(page.getByRole('button', { name: /new service/i })).toBeVisible();

    expect(issues, `Runtime errors on /cms/bookings/services:\n${formatIssues(issues)}`).toEqual([]);
  });

  test('/cms/bookings/resources renders the Resources manager without errors', async ({ page, request }) => {
    const issues = attachRuntimeGuards(page);
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    await gotoWithAuth(page, `${tenantBaseUrl}/cms/bookings/resources`, ownerToken);
    await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/cms/bookings/resources(/|$)`));

    await expect(page.getByRole('heading', { name: /booking resources/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /new resource/i })).toBeVisible();

    expect(issues, `Runtime errors on /cms/bookings/resources:\n${formatIssues(issues)}`).toEqual([]);
  });

  test('/cms/bookings/settings renders the Booking settings form without errors', async ({ page, request }) => {
    const issues = attachRuntimeGuards(page);
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    await gotoWithAuth(page, `${tenantBaseUrl}/cms/bookings/settings`, ownerToken);
    await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/cms/bookings/settings(/|$)`));

    await expect(page.getByRole('heading', { name: /booking settings/i })).toBeVisible();

    // Core form fields should be present
    await expect(page.getByLabel(/timezone/i)).toBeVisible();
    await expect(page.getByLabel(/auto-confirm/i)).toBeVisible();
    await expect(page.getByLabel(/hold expiry/i)).toBeVisible();

    // Save button present
    await expect(page.getByRole('button', { name: /save settings/i })).toBeVisible();

    expect(issues, `Runtime errors on /cms/bookings/settings:\n${formatIssues(issues)}`).toEqual([]);
  });

  test('booking menu items are visible in sidebar when addon is active', async ({ page, request }) => {
    const issues = attachRuntimeGuards(page);
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    await gotoWithAuth(page, `${tenantBaseUrl}/cms`, ownerToken);

    // Sidebar should contain booking nav entries
    await expect(page.getByRole('link', { name: /^bookings$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^services$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^resources$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /booking settings/i })).toBeVisible();

    expect(issues, `Runtime errors on CMS dashboard:\n${formatIssues(issues)}`).toEqual([]);
  });

  test('can open the New Service dialog and it renders without errors', async ({ page, request }) => {
    const issues = attachRuntimeGuards(page);
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    await gotoWithAuth(page, `${tenantBaseUrl}/cms/bookings/services`, ownerToken);
    await page.getByRole('button', { name: /new service/i }).click();

    // Dialog appears
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /new service/i })).toBeVisible();

    // Key form fields present (Labels lack htmlFor — use role-scoped locators)
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('textbox').first()).toBeVisible();
    await expect(dialog.getByRole('combobox')).toBeVisible();  // Booking mode select

    // Cancel closes it
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    expect(issues, `Runtime errors in New Service dialog:\n${formatIssues(issues)}`).toEqual([]);
  });

  test('can open the New Resource dialog and it renders without errors', async ({ page, request }) => {
    const issues = attachRuntimeGuards(page);
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    await gotoWithAuth(page, `${tenantBaseUrl}/cms/bookings/resources`, ownerToken);
    await page.getByRole('button', { name: /new resource/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /new resource/i })).toBeVisible();
    // Key form fields present (Labels lack htmlFor — use role-scoped locators)
    const dialog2 = page.getByRole('dialog');
    await expect(dialog2.getByRole('textbox').first()).toBeVisible();
    await expect(dialog2.getByRole('combobox')).toBeVisible();  // Type select

    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    expect(issues, `Runtime errors in New Resource dialog:\n${formatIssues(issues)}`).toEqual([]);
  });

  test('week/list view toggle switches the view on the bookings page', async ({ page, request }) => {
    const issues = attachRuntimeGuards(page);
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    await gotoWithAuth(page, `${tenantBaseUrl}/cms/bookings`, ownerToken);

    // Default is week view — week navigation arrows visible
    const prevButton = page.getByRole('button', { name: '' }).first(); // ChevronLeft
    await expect(page.getByRole('button', { name: /week/i })).toBeVisible();

    // Switch to list view
    await page.getByRole('button', { name: /list/i }).click();

    // Table header should appear
    await expect(page.getByRole('columnheader', { name: /customer/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /service/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();

    expect(issues, `Runtime errors on week/list toggle:\n${formatIssues(issues)}`).toEqual([]);
  });
});
