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
import { submitLoginAndCaptureToken, tenantOwnerCredentials } from './support/auth';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

const BOOKINGS_HEADING = /bookings|bokningar|الحجوزات/i;
const SERVICES_HEADING = /booking services|bokningstjänster|tjänster|خدمات الحجز/i;
const RESOURCES_HEADING = /booking resources|bokningsresurser|resurser|موارد الحجز/i;
const SETTINGS_HEADING = /booking settings|bokningsinställningar|إعدادات الحجز/i;
const WEEK_BUTTON = /^(week|vecka|أسبوع)$/i;
const LIST_BUTTON = /^(list|lista|قائمة)$/i;
const NEW_SERVICE_BUTTON = /new service|ny tjänst|خدمة جديدة/i;
const NEW_RESOURCE_BUTTON = /new resource|ny resurs|مورد جديد/i;
const SAVE_SETTINGS_BUTTON = /save settings|spara inställningar|حفظ الإعدادات/i;
const DASHBOARD_LINK = /dashboard|instrumentpanel|لوحة التحكم/i;
const SERVICES_LINK = /services|tjänster|الخدمات/i;
const RESOURCES_LINK = /resources|resurser|الموارد/i;
const BOOKING_SETTINGS_LINK = /booking settings|bokningsinställningar|إعدادات الحجز/i;
const MONTH_BUTTON = /month|månad|شهر/i;
const CUSTOMER_HEADER = /customer|kund|العميل/i;
const SERVICE_HEADER = /service|tjänst|الخدمة/i;
const STATUS_HEADER = /status|statusar|الحالة/i;
const CANCEL_BUTTON = /cancel|avbryt|إلغاء/i;
const TIMEZONE_LABEL = /timezone|tidszon|المنطقة الزمنية/i;
const AUTO_CONFIRM_LABEL = /auto-confirm|confirm bookings automatically|bekräfta bokningar automatiskt|تأكيد الحجوزات تلقائيا/i;
const HOLD_EXPIRY_LABEL = /hold expiry|reservationstid|reservationstid \(minuter\)|مدة الحجز|hold expiry minutes/i;

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

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe('Booking CMS pages — smoke', () => {
  // Run serially to avoid hammering the login endpoint with parallel
  // login attempts which trips Laravel rate limiting ("Too Many Attempts").
  test.describe.configure({ mode: 'serial' });

  /** Auth token obtained once per suite and reused by all tests. */
  let ownerToken = '';
  let sharedPage: import('@playwright/test').Page;
  let sharedContext: import('@playwright/test').BrowserContext;
  let runtimeIssues: ReturnType<typeof attachRuntimeGuards>;

  test.beforeAll(async ({ browser }) => {
    if (!tenantBaseUrl) return;
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();
    runtimeIssues = attachRuntimeGuards(sharedPage);
    await sharedPage.goto(`${tenantBaseUrl}/login`);
    ownerToken = await submitLoginAndCaptureToken(sharedPage, tenantOwnerCredentials);
    await sharedPage.waitForURL(new RegExp(`${tenantBaseUrl}/cms(/|$)`), { timeout: 30_000 });
  });

  test.afterAll(async () => {
    await sharedContext?.close();
  });

  test.beforeEach(() => {
    test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable booking CMS smoke tests.');
  });

  test('/cms/bookings renders the Bookings calendar page without errors', async ({ request }) => {
    const issueStart = runtimeIssues.length;
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    await sharedPage.goto(`${tenantBaseUrl}/cms/bookings`);
    await expect(sharedPage).toHaveURL(new RegExp(`${tenantBaseUrl}/cms/bookings(/|$)`));

    // Page heading
    await expect(sharedPage.getByRole('heading', { name: BOOKINGS_HEADING })).toBeVisible();

    // Week / List toggle buttons visible
    await expect(sharedPage.getByRole('button', { name: WEEK_BUTTON })).toBeVisible();
    await expect(sharedPage.getByRole('button', { name: LIST_BUTTON })).toBeVisible();

    const issues = runtimeIssues.slice(issueStart);
    expect(issues, `Runtime errors on /cms/bookings:\n${formatIssues(issues)}`).toEqual([]);
  });

  test('/cms/bookings/services renders the Services manager without errors', async ({ request }) => {
    const issueStart = runtimeIssues.length;
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    await sharedPage.goto(`${tenantBaseUrl}/cms/bookings/services`);
    await expect(sharedPage).toHaveURL(new RegExp(`${tenantBaseUrl}/cms/bookings/services(/|$)`));

    await expect(sharedPage.getByRole('heading', { name: SERVICES_HEADING })).toBeVisible();
    // "New service" button is visible for tenant owner
    await expect(sharedPage.getByRole('button', { name: NEW_SERVICE_BUTTON })).toBeVisible();

    const issues = runtimeIssues.slice(issueStart);
    expect(issues, `Runtime errors on /cms/bookings/services:\n${formatIssues(issues)}`).toEqual([]);
  });

  test('/cms/bookings/resources renders the Resources manager without errors', async ({ request }) => {
    const issueStart = runtimeIssues.length;
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    await sharedPage.goto(`${tenantBaseUrl}/cms/bookings/resources`);
    await expect(sharedPage).toHaveURL(new RegExp(`${tenantBaseUrl}/cms/bookings/resources(/|$)`));

    await expect(sharedPage.getByRole('heading', { name: RESOURCES_HEADING })).toBeVisible();
    await expect(sharedPage.getByRole('button', { name: NEW_RESOURCE_BUTTON })).toBeVisible();

    const issues = runtimeIssues.slice(issueStart);
    expect(issues, `Runtime errors on /cms/bookings/resources:\n${formatIssues(issues)}`).toEqual([]);
  });

  test('/cms/bookings/settings renders the Booking settings form without errors', async ({ request }) => {
    const issueStart = runtimeIssues.length;
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    await sharedPage.goto(`${tenantBaseUrl}/cms/bookings/settings`);
    await expect(sharedPage).toHaveURL(new RegExp(`${tenantBaseUrl}/cms/bookings/settings(/|$)`));

    await expect(sharedPage.getByRole('heading', { name: SETTINGS_HEADING })).toBeVisible();

    // Core form fields should be present
    await expect(sharedPage.getByLabel(TIMEZONE_LABEL)).toBeVisible();
    await expect(sharedPage.getByLabel(AUTO_CONFIRM_LABEL)).toBeVisible();
    await expect(sharedPage.getByLabel(HOLD_EXPIRY_LABEL)).toBeVisible();

    // Save button present
    await expect(sharedPage.getByRole('button', { name: SAVE_SETTINGS_BUTTON })).toBeVisible();

    const issues = runtimeIssues.slice(issueStart);
    expect(issues, `Runtime errors on /cms/bookings/settings:\n${formatIssues(issues)}`).toEqual([]);
  });

  test('booking menu items are visible in sidebar when addon is active', async ({ request }) => {
    const issueStart = runtimeIssues.length;
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    await sharedPage.goto(`${tenantBaseUrl}/cms`);

    // Sidebar should contain booking nav entries
    await expect(sharedPage.getByRole('link', { name: BOOKINGS_HEADING })).toBeVisible();
    await expect(sharedPage.getByRole('link', { name: SERVICES_LINK })).toBeVisible();
    await expect(sharedPage.getByRole('link', { name: RESOURCES_LINK })).toBeVisible();
    await expect(sharedPage.getByRole('link', { name: BOOKING_SETTINGS_LINK })).toBeVisible();

    const issues = runtimeIssues.slice(issueStart);
    expect(issues, `Runtime errors on CMS dashboard:\n${formatIssues(issues)}`).toEqual([]);
  });

  test('can open the New Service dialog and it renders without errors', async ({ request }) => {
    const issueStart = runtimeIssues.length;
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    await sharedPage.goto(`${tenantBaseUrl}/cms/bookings/services`);
    await sharedPage.getByRole('button', { name: NEW_SERVICE_BUTTON }).click();

    // Dialog appears
    await expect(sharedPage.getByRole('dialog')).toBeVisible();
    await expect(sharedPage.getByRole('heading', { name: NEW_SERVICE_BUTTON })).toBeVisible();

    // Key form fields present (Labels lack htmlFor — use role-scoped locators)
    const dialog = sharedPage.getByRole('dialog');
    await expect(dialog.getByRole('textbox').first()).toBeVisible();
    await expect(dialog.getByRole('combobox')).toBeVisible();  // Booking mode select

    // Cancel closes it
    await sharedPage.getByRole('button', { name: CANCEL_BUTTON }).click();
    await expect(sharedPage.getByRole('dialog')).not.toBeVisible();

    const issues = runtimeIssues.slice(issueStart);
    expect(issues, `Runtime errors in New Service dialog:\n${formatIssues(issues)}`).toEqual([]);
  });

  test('can open the New Resource dialog and it renders without errors', async ({ request }) => {
    const issueStart = runtimeIssues.length;
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    await sharedPage.goto(`${tenantBaseUrl}/cms/bookings/resources`);
    await sharedPage.getByRole('button', { name: NEW_RESOURCE_BUTTON }).click();

    await expect(sharedPage.getByRole('dialog')).toBeVisible();
    await expect(sharedPage.getByRole('heading', { name: NEW_RESOURCE_BUTTON })).toBeVisible();
    // Key form fields present (Labels lack htmlFor — use role-scoped locators)
    const dialog2 = sharedPage.getByRole('dialog');
    await expect(dialog2.getByRole('textbox').first()).toBeVisible();
    await expect(dialog2.getByRole('combobox')).toBeVisible();  // Type select

    await sharedPage.getByRole('button', { name: CANCEL_BUTTON }).click();
    await expect(sharedPage.getByRole('dialog')).not.toBeVisible();

    const issues = runtimeIssues.slice(issueStart);
    expect(issues, `Runtime errors in New Resource dialog:\n${formatIssues(issues)}`).toEqual([]);
  });

  test('week/list view toggle switches the view on the bookings page', async ({ request }) => {
    const issueStart = runtimeIssues.length;
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    await sharedPage.goto(`${tenantBaseUrl}/cms/bookings`);

    // Default is week view — week navigation arrows visible
    const prevButton = sharedPage.getByRole('button', { name: '' }).first(); // ChevronLeft
    await expect(sharedPage.getByRole('button', { name: WEEK_BUTTON })).toBeVisible();

    // Switch to list view
    await sharedPage.getByRole('button', { name: LIST_BUTTON }).click();

    // Table header should appear
    await expect(sharedPage.getByRole('columnheader', { name: CUSTOMER_HEADER })).toBeVisible();
    await expect(sharedPage.getByRole('columnheader', { name: SERVICE_HEADER })).toBeVisible();
    await expect(sharedPage.getByRole('columnheader', { name: STATUS_HEADER })).toBeVisible();

    const issues = runtimeIssues.slice(issueStart);
    expect(issues, `Runtime errors on week/list toggle:\n${formatIssues(issues)}`).toEqual([]);
  });
});
