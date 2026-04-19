import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { submitLoginAndCaptureToken } from './support/auth';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';
import { acquireExclusiveLock } from './support/exclusiveLock';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;
const PAYMENT_SESSION_TOKEN_STORAGE_KEY = 'booking-payment-session-token';
const DEFAULT_PASSWORD = 'password';
let cachedLaravelTestingEnvironment: boolean | null = null;

type ApiContext = APIRequestContext;

type PageResponse<T> = { data: T };

type PageRecord = {
  id: number;
  slug: string;
  title: string;
};

type TenantSettingsSnapshot = {
  booking_payment_page_id: number | null;
};

type PaymentProviderRecord = {
  provider: string;
  is_active: boolean;
  mode: string;
};

type PaymentProviderSnapshot = {
  provider: string;
  is_active: boolean;
  mode: string;
  credentials: Record<string, string>;
};

type BookingSlot = {
  starts_at: string;
  ends_at: string;
  available: boolean;
};

type RuntimeIssue = {
  source: 'console' | 'pageerror' | 'requestfailed';
  message: string;
};

function getTenantOwnerCredentials() {
  let derivedEmail: string | null = null;

  if (tenantBaseUrl) {
    try {
      const hostname = new URL(tenantBaseUrl).hostname;
      if (hostname) {
        derivedEmail = `owner@${hostname}`;
      }
    } catch {
      derivedEmail = null;
    }
  }

  return {
    email: process.env.PLAYWRIGHT_TENANT_OWNER_EMAIL ?? derivedEmail ?? 'user.multiple@byteforge.test',
    password: process.env.PLAYWRIGHT_TENANT_OWNER_PASSWORD ?? DEFAULT_PASSWORD,
  };
}

function filterRuntimeIssues(issues: RuntimeIssue[], allowlist: RegExp[]): RuntimeIssue[] {
  return issues.filter((issue) => !allowlist.some((pattern) => pattern.test(issue.message)));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

function isLaravelTestingEnvironment(): boolean {
  if (cachedLaravelTestingEnvironment !== null) {
    return cachedLaravelTestingEnvironment;
  }

  try {
    const output = execFileSync('php', ['artisan', 'env', '--no-ansi'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    cachedLaravelTestingEnvironment = /\[testing\]/i.test(output);
  } catch {
    cachedLaravelTestingEnvironment = false;
  }

  return cachedLaravelTestingEnvironment;
}

function flushLaravelCacheStore(): void {
  const script = [
    "require 'vendor/autoload.php';",
    "$app = require 'bootstrap/app.php';",
    "$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);",
    '$kernel->bootstrap();',
    'Illuminate\\Support\\Facades\\Cache::flush();',
    'echo "ok";',
  ].join(' ');

  execFileSync('php', ['-r', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

async function getActiveAddons(request: ApiContext, token: string): Promise<Set<string>> {
  const res = await request.get(`${tenantBaseUrl}/api/addons`, {
    headers: authHeaders(token),
  });
  expect(res.ok()).toBeTruthy();

  const body = await res.json() as { data: string[] };
  return new Set(Array.isArray(body.data) ? body.data : []);
}

async function isBookingAddonActive(request: ApiContext, token: string): Promise<boolean> {
  return (await getActiveAddons(request, token)).has('booking');
}

async function attachResourceToService(
  request: ApiContext,
  token: string,
  serviceId: number,
  resourceId: number,
): Promise<void> {
  const collectionAttachRes = await request.post(`${tenantBaseUrl}/api/booking/services/${serviceId}/resources`, {
    headers: authHeaders(token),
    data: { resource_id: resourceId },
  });

  if (collectionAttachRes.ok()) {
    return;
  }

  const memberAttachRes = await request.post(`${tenantBaseUrl}/api/booking/services/${serviceId}/resources/${resourceId}`, {
    headers: authHeaders(token),
  });

  if (memberAttachRes.ok()) {
    return;
  }

  const collectionBody = await collectionAttachRes.text();
  const memberBody = await memberAttachRes.text();

  throw new Error(
    [
      'Unable to attach resource to service.',
      `POST /services/${serviceId}/resources -> ${collectionAttachRes.status()} ${collectionAttachRes.statusText()}`,
      collectionBody,
      `POST /services/${serviceId}/resources/${resourceId} -> ${memberAttachRes.status()} ${memberAttachRes.statusText()}`,
      memberBody,
    ].join('\n'),
  );
}

function buildBookingStorefrontPageData(seed: string) {
  return {
    content: [
      {
        type: 'BookingWidget',
        props: {
          id: `booking-storefront-${seed}`,
          title: 'Playwright Appointment Booking',
          serviceId: 0,
          showPrices: true,
          successMessage: 'Appointment confirmed!',
          layoutMode: 'sections',
          sections: [
            { type: 'BookingServiceSection', props: { id: `booking-service-${seed}` } },
            { type: 'BookingDateSection', props: { id: `booking-date-${seed}` } },
            { type: 'BookingResourceSection', props: { id: `booking-resource-${seed}` } },
            { type: 'BookingSlotSection', props: { id: `booking-slot-${seed}` } },
            { type: 'BookingCustomerSection', props: { id: `booking-customer-${seed}` } },
            { type: 'BookingConfirmSection', props: { id: `booking-confirm-${seed}` } },
          ],
        },
      },
    ],
    root: { props: {} },
    zones: {},
  };
}

function buildPaymentStorefrontPageData(seed: string) {
  return {
    content: [
      {
        type: 'PaymentWidget',
        props: {
          id: `payment-storefront-${seed}`,
        },
      },
    ],
    root: { props: {} },
    zones: {},
  };
}

async function createPublishedPage(
  request: ApiContext,
  token: string,
  {
    title,
    slug,
    puckData,
  }: {
    title: string;
    slug: string;
    puckData: Record<string, unknown>;
  },
): Promise<PageRecord> {
  const res = await request.post(`${tenantBaseUrl}/api/pages`, {
    headers: authHeaders(token),
    data: {
      title,
      slug,
      page_type: 'general',
      status: 'published',
      is_homepage: false,
      puck_data: puckData,
    },
  });

  expect(res.ok(), `Page creation should succeed: ${res.status()} ${res.statusText()}`).toBeTruthy();

  const body = await res.json() as PageResponse<PageRecord>;
  return body.data;
}

async function createPublishedStorefrontPage(
  request: ApiContext,
  token: string,
  seed: string,
): Promise<PageRecord> {
  return createPublishedPage(request, token, {
    title: `Playwright Appointment Booking ${seed}`,
    slug: `playwright-appointment-booking-${seed}`,
    puckData: buildBookingStorefrontPageData(seed),
  });
}

async function createPublishedPaymentPage(
  request: ApiContext,
  token: string,
  seed: string,
): Promise<PageRecord> {
  return createPublishedPage(request, token, {
    title: `Playwright Booking Payment ${seed}`,
    slug: `playwright-booking-payment-${seed}`,
    puckData: buildPaymentStorefrontPageData(seed),
  });
}

async function createSlotServiceWithAvailability(
  request: ApiContext,
  token: string,
  seed: string,
  options?: {
    requiresPayment?: boolean;
    price?: number;
    currency?: string;
  },
): Promise<{ serviceId: number; serviceName: string; resourceId: number; resourceName: string }> {
  const serviceName = `Playwright Appointment Service ${seed}`;
  const resourceName = `Playwright Specialist ${seed}`;

  const serviceRes = await request.post(`${tenantBaseUrl}/api/booking/services`, {
    headers: authHeaders(token),
    data: {
      name: serviceName,
      booking_mode: 'slot',
      duration_minutes: 60,
      slot_interval_minutes: 60,
      advance_notice_hours: 0,
      max_advance_days: 30,
      price: options?.price,
      currency: options?.currency,
      requires_payment: options?.requiresPayment,
    },
  });
  expect(serviceRes.status()).toBe(201);
  const serviceBody = await serviceRes.json() as PageResponse<{ id: number }>;

  const resourceRes = await request.post(`${tenantBaseUrl}/api/booking/resources`, {
    headers: authHeaders(token),
    data: {
      name: resourceName,
      type: 'person',
      is_active: true,
    },
  });
  expect(resourceRes.status()).toBe(201);
  const resourceBody = await resourceRes.json() as PageResponse<{ id: number }>;

  const serviceId = serviceBody.data.id;
  const resourceId = resourceBody.data.id;

  await attachResourceToService(request, token, serviceId, resourceId);

  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
    const availabilityRes = await request.post(
      `${tenantBaseUrl}/api/booking/resources/${resourceId}/availability`,
      {
        headers: authHeaders(token),
        data: {
          day_of_week: dayOfWeek,
          starts_at: '09:00:00',
          ends_at: '17:00:00',
        },
      },
    );
    expect(availabilityRes.status()).toBe(201);
  }

  return { serviceId, serviceName, resourceId, resourceName };
}

async function getTenantSettings(request: ApiContext, token: string): Promise<TenantSettingsSnapshot> {
  const res = await request.get(`${tenantBaseUrl}/api/settings`, {
    headers: authHeaders(token),
  });
  expect(res.ok()).toBeTruthy();

  const body = await res.json() as PageResponse<TenantSettingsSnapshot>;
  return body.data;
}

async function updateTenantSettings(
  request: ApiContext,
  token: string,
  data: Partial<TenantSettingsSnapshot>,
): Promise<void> {
  const res = await request.put(`${tenantBaseUrl}/api/settings`, {
    headers: authHeaders(token),
    data,
  });

  expect(res.ok(), `Settings update should succeed: ${res.status()} ${res.statusText()}`).toBeTruthy();
}

async function listPaymentProviders(request: ApiContext, token: string): Promise<PaymentProviderRecord[]> {
  const res = await request.get(`${tenantBaseUrl}/api/payment-providers`, {
    headers: authHeaders(token),
  });
  expect(res.ok()).toBeTruthy();

  const body = await res.json() as PageResponse<PaymentProviderRecord[]>;
  return body.data;
}

async function getTenantId(request: ApiContext): Promise<string> {
  const res = await request.get(`${tenantBaseUrl}/api/info`, {
    headers: { Accept: 'application/json' },
  });
  expect(res.ok()).toBeTruthy();

  const body = await res.json() as { id: string };
  return body.id;
}

function getStoredPaymentProviderSnapshots(tenantId: string): PaymentProviderSnapshot[] {
  const script = [
    "require 'vendor/autoload.php';",
    "$app = require 'bootstrap/app.php';",
    "$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);",
    '$kernel->bootstrap();',
    '$providers = App\\Models\\TenantPaymentProvider::query()->forTenant($argv[1])->orderBy("provider")->get()',
    '->map(fn ($provider) => [',
    '"provider" => (string) $provider->provider,',
    '"is_active" => (bool) $provider->is_active,',
    '"mode" => (string) $provider->mode,',
    '"credentials" => (array) $provider->credentials,',
    '])->values()->all();',
    'echo json_encode($providers, JSON_UNESCAPED_SLASHES);',
  ].join(' ');

  const output = execFileSync('php', ['-r', script, '--', tenantId], {
    cwd: process.cwd(),
    encoding: 'utf8',
  }).trim();

  if (output === '') {
    return [];
  }

  return JSON.parse(output) as PaymentProviderSnapshot[];
}

function forceDeleteBookingAndPayment(tenantId: string, bookingId: number): void {
  const script = [
    "require 'vendor/autoload.php';",
    "$app = require 'bootstrap/app.php';",
    "$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);",
    '$kernel->bootstrap();',
    '$tenantId = $argv[1];',
    '$bookingId = (int) $argv[2];',
    '$booking = Illuminate\\Support\\Facades\\DB::table("bookings")->where("tenant_id", $tenantId)->where("id", $bookingId)->first(["id", "payment_id"]);',
    'if (! $booking) { echo "ok"; return; }',
    '$paymentId = $booking->payment_id;',
    'Illuminate\\Support\\Facades\\DB::table("bookings")->where("tenant_id", $tenantId)->where("id", $bookingId)->delete();',
    'if ($paymentId) {',
    'App\\Models\\Refund::query()->where("payment_id", $paymentId)->delete();',
    'App\\Models\\Payment::query()->forTenant($tenantId)->whereKey($paymentId)->delete();',
    '}',
    'echo "ok";',
  ].join(' ');

  execFileSync('php', ['-r', script, '--', tenantId, String(bookingId)], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

function forceDeleteBookingsForService(tenantId: string, serviceId: number): void {
  const script = [
    "require 'vendor/autoload.php';",
    "$app = require 'bootstrap/app.php';",
    "$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);",
    '$kernel->bootstrap();',
    '$tenantId = $argv[1];',
    '$serviceId = (int) $argv[2];',
    '$bookings = Illuminate\\Support\\Facades\\DB::table("bookings")',
    '->where("tenant_id", $tenantId)',
    '->where("service_id", $serviceId)',
    '->get(["id", "payment_id"]);',
    '$paymentIds = $bookings->pluck("payment_id")->filter()->unique()->values()->all();',
    'Illuminate\\Support\\Facades\\DB::table("bookings")',
    '->where("tenant_id", $tenantId)',
    '->where("service_id", $serviceId)',
    '->delete();',
    'if (! empty($paymentIds)) {',
    'App\\Models\\Refund::query()->whereIn("payment_id", $paymentIds)->delete();',
    'App\\Models\\Payment::query()->forTenant($tenantId)->whereIn("id", $paymentIds)->delete();',
    '}',
    'echo "ok";',
  ].join(' ');

  execFileSync('php', ['-r', script, '--', tenantId, String(serviceId)], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

async function updatePaymentProvider(
  request: ApiContext,
  token: string,
  provider: string,
  data: {
    credentials: Record<string, string>;
    is_active: boolean;
    mode: string;
  },
): Promise<void> {
  const res = await request.put(`${tenantBaseUrl}/api/payment-providers/${provider}`, {
    headers: authHeaders(token),
    data,
  });

  expect(res.ok(), `Provider update should succeed: ${res.status()} ${res.statusText()}`).toBeTruthy();
}

async function createSwishPaymentProvider(request: ApiContext, token: string): Promise<void> {
  const res = await request.post(`${tenantBaseUrl}/api/payment-providers`, {
    headers: authHeaders(token),
    data: {
      provider: 'swish',
      credentials: {
        merchant_swish_number: '1234567890',
        certificate: 'playwright-test-certificate',
        private_key: 'playwright-test-private-key',
        ca_certificate: 'playwright-test-ca-certificate',
        callback_url: `${tenantBaseUrl}/api/payments/swish/callback`,
      },
      is_active: true,
      mode: 'test',
    },
  });

  expect(res.status()).toBe(201);
}

async function getNextAvailableDate(
  request: ApiContext,
  serviceId: number,
  resourceId: number,
): Promise<string> {
  const res = await request.get(
    `${tenantBaseUrl}/api/public/booking/next-available?service_id=${serviceId}&resource_id=${resourceId}`,
    { headers: { Accept: 'application/json' } },
  );
  expect(res.status()).toBe(200);

  const body = await res.json() as PageResponse<{ date: string; first_slot: string } | null>;
  expect(body.data).not.toBeNull();
  expect(body.data?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  return body.data!.date;
}

async function getAvailableSlots(
  request: ApiContext,
  serviceId: number,
  resourceId: number,
  date: string,
): Promise<BookingSlot[]> {
  const res = await request.get(
    `${tenantBaseUrl}/api/public/booking/slots?service_id=${serviceId}&resource_id=${resourceId}&date=${date}`,
    { headers: { Accept: 'application/json' } },
  );
  expect(res.status()).toBe(200);

  const body = await res.json() as PageResponse<BookingSlot[]>;
  return body.data.filter((slot) => slot.available);
}

async function deleteIfPresent(request: ApiContext, token: string, url: string): Promise<void> {
  const res = await request.delete(url, { headers: authHeaders(token) });
  const responseText = await res.text();
  expect(
    [200, 204, 404],
    `Delete should succeed for ${url}, got ${res.status()} ${res.statusText()}${responseText ? `\n${responseText}` : ''}`,
  ).toContain(res.status());
}

async function cancelAndDeleteBookingIfNeeded(
  request: ApiContext,
  token: string,
  bookingId: number,
  options?: { tenantId?: string },
): Promise<void> {
  const deleteRes = await request.delete(`${tenantBaseUrl}/api/booking/bookings/${bookingId}`, {
    headers: authHeaders(token),
  });

  if ([200, 204, 404].includes(deleteRes.status())) {
    return;
  }

  expect(deleteRes.status()).toBe(422);

  const showRes = await request.get(`${tenantBaseUrl}/api/booking/bookings/${bookingId}`, {
    headers: authHeaders(token),
  });

  if (showRes.status() === 404) {
    return;
  }

  expect(showRes.ok()).toBeTruthy();

  if (options?.tenantId) {
    forceDeleteBookingAndPayment(options.tenantId, bookingId);
    return;
  }

  const cancelRes = await request.patch(`${tenantBaseUrl}/api/booking/bookings/${bookingId}/cancel`, {
    headers: authHeaders(token),
    data: { note: 'Playwright cleanup' },
  });
  expect([200, 404]).toContain(cancelRes.status());

  const finalDeleteRes = await request.delete(`${tenantBaseUrl}/api/booking/bookings/${bookingId}`, {
    headers: authHeaders(token),
  });
  expect([200, 204, 404]).toContain(finalDeleteRes.status());
}

async function detachResourceFromServiceIfNeeded(
  request: ApiContext,
  token: string,
  serviceId: number,
  resourceId: number,
): Promise<void> {
  const res = await request.delete(`${tenantBaseUrl}/api/booking/services/${serviceId}/resources/${resourceId}`, {
    headers: authHeaders(token),
  });

  expect([200, 204, 404]).toContain(res.status());
}

async function deleteAvailabilityWindows(
  request: ApiContext,
  token: string,
  resourceId: number,
): Promise<void> {
  const listRes = await request.get(`${tenantBaseUrl}/api/booking/resources/${resourceId}/availability`, {
    headers: authHeaders(token),
  });

  expect([200, 404]).toContain(listRes.status());
  if (listRes.status() === 404) {
    return;
  }

  const body = await listRes.json() as PageResponse<Array<{ id: number }>>;

  for (const window of body.data) {
    const deleteRes = await request.delete(`${tenantBaseUrl}/api/booking/availability/${window.id}`, {
      headers: authHeaders(token),
    });

    expect([200, 204, 404]).toContain(deleteRes.status());
  }
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

async function selectCalendarDate(page: Page, isoDate: string): Promise<void> {
  const targetDate = new Date(`${isoDate}T12:00:00Z`);
  const expectedMonthLabel = getMonthLabel(targetDate);
  const monthLabel = page.locator('.bw-calendar-month').first();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const currentMonthLabel = (await monthLabel.textContent())?.trim();
    if (currentMonthLabel === expectedMonthLabel) {
      break;
    }

    await page.getByRole('button', { name: 'Next month' }).first().click();
  }

  await expect(monthLabel).toHaveText(expectedMonthLabel);

  const day = String(targetDate.getUTCDate());
  const dayButton = page.locator('.bw-calendar-day:not(.is-outside-month):not(.is-disabled)').filter({
    hasText: new RegExp(`^${day}$`),
  }).first();

  await expect(dayButton).toBeVisible();
  await dayButton.click();
}

test.describe.configure({ mode: 'serial' });

test.describe('Booking storefront appointment flow', () => {
  let ownerToken = '';
  let releaseTenantStorefrontLock: (() => Promise<void>) | null = null;

  test.beforeAll(async ({ browser }) => {
    if (!tenantBaseUrl) return;

    releaseTenantStorefrontLock = await acquireExclusiveLock('tenant-storefront-suite');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(`${tenantBaseUrl}/login`);
      ownerToken = await submitLoginAndCaptureToken(page, getTenantOwnerCredentials());

      const loginOutcome = await Promise.race([
        page.waitForURL(new RegExp(`${escapeRegExp(tenantBaseUrl)}/cms(/|$)`), { timeout: 10_000 }).then(() => 'success' as const),
        page.getByText(/these credentials do not match our records\./i).waitFor({ state: 'visible', timeout: 10_000 }).then(() => 'invalid' as const),
      ]);

      if (loginOutcome === 'invalid') {
        throw new Error(
          'Tenant owner login failed for this tenant. Set PLAYWRIGHT_TENANT_OWNER_EMAIL and PLAYWRIGHT_TENANT_OWNER_PASSWORD to valid credentials for PLAYWRIGHT_TENANT_BASE_URL.',
        );
      }
    } finally {
      await context.close();
    }
  });

  test.afterAll(async () => {
    await releaseTenantStorefrontLock?.();
  });

  test.beforeEach(() => {
    test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable storefront appointment tests.');
    flushLaravelCacheStore();
  });

  test('guest can complete a slot-based appointment booking from a published storefront page', async ({ page, request }) => {
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    const issues = attachRuntimeGuards(page);
    const allowlist = [
      /Failed to load resource: the server responded with a status of (409|422).*\/api\/public\/booking\/hold/i,
    ];
    const seed = `${Date.now()}-success`;
    const createdBookingIds: number[] = [];
    const { serviceId, serviceName, resourceId, resourceName } = await createSlotServiceWithAvailability(request, ownerToken, seed);
    const publishedPage = await createPublishedStorefrontPage(request, ownerToken, seed);

    try {
      const nextAvailableDate = await getNextAvailableDate(request, serviceId, resourceId);

      await page.goto(`${tenantBaseUrl}/pages/${publishedPage.slug}`);
      await expect(page.locator('#public-app')).toBeAttached();

      await page.getByText(serviceName, { exact: true }).click();
      await expect(page.getByText('Choose a date')).toBeVisible();

      await selectCalendarDate(page, nextAvailableDate);
      await expect(page.getByText(new RegExp(`Choose your specialist|Choose a resource`))).toBeVisible();

      await page.getByText(resourceName, { exact: true }).click();
      await expect(page.getByText(/Slots for/)).toBeVisible();

      const slotButton = page.locator('.bw-slot').first();
      await expect(slotButton).toBeVisible();
      await slotButton.click();

      await expect(page.getByText('Your details')).toBeVisible();
      await page.getByPlaceholder('Your name').fill('Playwright Guest');
      await page.getByPlaceholder('your@email.com').fill(`playwright-guest-${seed}@example.com`);

      const holdResponsePromise = page.waitForResponse((response) => {
        return response.request().method() === 'POST'
          && response.url().endsWith('/api/public/booking/hold');
      });
      await page.getByRole('button', { name: /Continue to review/i }).click();
      const holdResponse = await holdResponsePromise;
      expect(holdResponse.ok()).toBeTruthy();

      await expect(page.getByText('Confirm your booking')).toBeVisible();

      const confirmResponsePromise = page.waitForResponse((response) => {
        return response.request().method() === 'POST'
          && /\/api\/public\/booking\/hold\/.+$/.test(response.url());
      });
      await page.getByRole('button', { name: /Confirm booking/i }).click();
      const confirmResponse = await confirmResponsePromise;
      expect(confirmResponse.ok()).toBeTruthy();

      const confirmBody = await confirmResponse.json() as PageResponse<{ booking_id: number; status: string }>;
      createdBookingIds.push(confirmBody.data.booking_id);

      await expect(page.getByText('Appointment confirmed!')).toBeVisible();
      await expect(page.getByText(/A confirmation has been sent to/i)).toBeVisible();
      const filteredIssues = filterRuntimeIssues(issues, allowlist);
      expect(filteredIssues, `Runtime issues detected in storefront appointment success flow:\n${formatIssues(filteredIssues)}`).toEqual([]);
    } finally {
      for (const bookingId of createdBookingIds) {
        await cancelAndDeleteBookingIfNeeded(request, ownerToken, bookingId);
      }
      await deleteIfPresent(request, ownerToken, `${tenantBaseUrl}/api/pages/${publishedPage.id}`);
      await detachResourceFromServiceIfNeeded(request, ownerToken, serviceId, resourceId);
      await deleteAvailabilityWindows(request, ownerToken, resourceId);
      await deleteIfPresent(request, ownerToken, `${tenantBaseUrl}/api/booking/services/${serviceId}`);
      await deleteIfPresent(request, ownerToken, `${tenantBaseUrl}/api/booking/resources/${resourceId}`);
    }
  });

  test('paid booking redirects to the configured CMS payment page and boots the guest payment session', async ({ page, request }) => {
    test.setTimeout(90000);

    const addons = await getActiveAddons(request, ownerToken);
    test.skip(!addons.has('booking'), 'booking addon is not active on this tenant — skipping.');
    test.skip(!addons.has('payments'), 'payments addon is not active on this tenant — skipping.');
    test.skip(!isLaravelTestingEnvironment(), 'Paid booking handoff coverage requires Laravel testing environment so fake gateway responses are available.');

    const issues = attachRuntimeGuards(page);
    const seed = `${Date.now()}-payment-page`;
    const createdBookingIds: number[] = [];
    const settingsBefore = await getTenantSettings(request, ownerToken);
    const tenantId = await getTenantId(request);
    const paymentProvidersBefore = getStoredPaymentProviderSnapshots(tenantId);
    const swishProviderBefore = paymentProvidersBefore.find((provider) => provider.provider === 'swish') ?? null;
    const { serviceId, serviceName, resourceId, resourceName } = await createSlotServiceWithAvailability(
      request,
      ownerToken,
      seed,
      { requiresPayment: true, price: 499, currency: 'SEK' },
    );
    const bookingPage = await createPublishedStorefrontPage(request, ownerToken, `${seed}-booking`);
    const paymentPage = await createPublishedPaymentPage(request, ownerToken, `${seed}-payment`);

    try {
      if (swishProviderBefore) {
        await updatePaymentProvider(request, ownerToken, 'swish', {
          credentials: swishProviderBefore.credentials,
          is_active: true,
          mode: swishProviderBefore.mode,
        });
      } else {
        await createSwishPaymentProvider(request, ownerToken);
      }

      for (const provider of paymentProvidersBefore) {
        if (provider.provider === 'swish' || !provider.is_active) {
          continue;
        }

        await updatePaymentProvider(request, ownerToken, provider.provider, {
          credentials: provider.credentials,
          is_active: false,
          mode: provider.mode,
        });
      }

      await updateTenantSettings(request, ownerToken, {
        booking_payment_page_id: paymentPage.id,
      });

      const nextAvailableDate = await getNextAvailableDate(request, serviceId, resourceId);

      await page.goto(`${tenantBaseUrl}/pages/${bookingPage.slug}`);
      await expect(page.locator('#public-app')).toBeAttached();

      await page.getByText(serviceName, { exact: true }).click();
      await expect(page.getByText('Choose a date')).toBeVisible();

      await selectCalendarDate(page, nextAvailableDate);
      await expect(page.getByText(new RegExp(`Choose your specialist|Choose a resource`))).toBeVisible();

      await page.getByText(resourceName, { exact: true }).click();
      await expect(page.getByText(/Slots for/)).toBeVisible();

      await page.locator('.bw-slot').first().click();
      await expect(page.getByText('Your details')).toBeVisible();
      await page.getByPlaceholder('Your name').fill('Playwright Payment Guest');
      await page.getByPlaceholder('your@email.com').fill(`playwright-payment-${seed}@example.com`);

      const holdResponsePromise = page.waitForResponse((response) => {
        return response.request().method() === 'POST'
          && response.url().endsWith('/api/public/booking/hold');
      });
      await page.getByRole('button', { name: /Continue to review/i }).click();
      const holdResponse = await holdResponsePromise;
      expect(holdResponse.ok()).toBeTruthy();

      await expect(page.getByText('Confirm your booking')).toBeVisible();

      const confirmResponsePromise = page.waitForResponse((response) => {
        return response.request().method() === 'POST'
          && /\/api\/public\/booking\/hold\/.+$/.test(response.url());
      });
      const paymentSessionResponsePromise = page.waitForResponse((response) => {
        return response.request().method() === 'GET'
          && /\/api\/public\/booking\/payment\/[A-Za-z0-9]+$/.test(response.url());
      });

      await page.getByRole('button', { name: /Continue to payment/i }).click();
      const confirmResponse = await confirmResponsePromise;
      expect(confirmResponse.ok()).toBeTruthy();

      await expect(page).toHaveURL(new RegExp(`${escapeRegExp(tenantBaseUrl)}/pages/${paymentPage.slug}(?:\\?.*)?$`));

      const paymentSessionResponse = await paymentSessionResponsePromise;
      expect(paymentSessionResponse.ok()).toBeTruthy();
      expect(paymentSessionResponse.url()).toContain('/api/public/booking/payment/');

      const paymentToken = paymentSessionResponse.url().match(/\/api\/public\/booking\/payment\/([^/?#]+)/)?.[1] ?? '';
      expect(paymentToken).not.toBe('');

      const paymentSessionBody = await paymentSessionResponse.json() as PageResponse<{
        booking_id: number;
        status: string;
        payment: { provider: string } | null;
      }>;
      createdBookingIds.push(paymentSessionBody.data.booking_id);
      expect(paymentSessionBody.data.booking_id).toBeGreaterThan(0);
      expect(paymentSessionBody.data.status).toBe('awaiting_payment');
      expect(paymentSessionBody.data.payment?.provider).toBe('swish');

      await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible();
      await expect(page.getByText('Amount due:')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Open Swish' })).toBeVisible();
      await expect(page.getByText(/Approve it in your Swish app/i)).toBeVisible();

      expect(await page.evaluate(() => window.location.hash)).toBe('');
      expect(
        await page.evaluate((storageKey) => window.sessionStorage.getItem(storageKey), PAYMENT_SESSION_TOKEN_STORAGE_KEY),
      ).toBe(paymentToken);
      expect(issues, `Runtime issues detected in booking payment handoff flow:\n${formatIssues(issues)}`).toEqual([]);
    } finally {
      await updateTenantSettings(request, ownerToken, {
        booking_payment_page_id: settingsBefore.booking_payment_page_id,
      });

      for (const provider of paymentProvidersBefore) {
        await updatePaymentProvider(request, ownerToken, provider.provider, {
          credentials: provider.credentials,
          is_active: provider.is_active,
          mode: provider.mode,
        });
      }

      for (const bookingId of createdBookingIds) {
        await cancelAndDeleteBookingIfNeeded(request, ownerToken, bookingId, { tenantId });
      }
      if (!swishProviderBefore) {
        await deleteIfPresent(request, ownerToken, `${tenantBaseUrl}/api/payment-providers/swish`);
      }
      await deleteIfPresent(request, ownerToken, `${tenantBaseUrl}/api/pages/${paymentPage.id}`);
      await deleteIfPresent(request, ownerToken, `${tenantBaseUrl}/api/pages/${bookingPage.id}`);
      await detachResourceFromServiceIfNeeded(request, ownerToken, serviceId, resourceId);
      await deleteAvailabilityWindows(request, ownerToken, resourceId);
      forceDeleteBookingsForService(tenantId, serviceId);
      await deleteIfPresent(request, ownerToken, `${tenantBaseUrl}/api/booking/services/${serviceId}`);
      await deleteIfPresent(request, ownerToken, `${tenantBaseUrl}/api/booking/resources/${resourceId}`);
    }
  });

  test('guest is returned to slot selection when the chosen appointment becomes unavailable during hold', async ({ page, request }) => {
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    const issues = attachRuntimeGuards(page);
    const allowlist = [
      /Failed to load resource: the server responded with a status of (409|422).*\/api\/public\/booking\/hold/i,
    ];
    const seed = `${Date.now()}-conflict`;
    const createdBookingIds: number[] = [];
    const { serviceId, serviceName, resourceId, resourceName } = await createSlotServiceWithAvailability(request, ownerToken, seed);
    const publishedPage = await createPublishedStorefrontPage(request, ownerToken, seed);

    try {
      const nextAvailableDate = await getNextAvailableDate(request, serviceId, resourceId);
      const availableSlots = await getAvailableSlots(request, serviceId, resourceId, nextAvailableDate);
      expect(availableSlots.length).toBeGreaterThan(0);

      await page.goto(`${tenantBaseUrl}/pages/${publishedPage.slug}`);
      await expect(page.locator('#public-app')).toBeAttached();

      await page.getByText(serviceName, { exact: true }).click();
      await expect(page.getByText('Choose a date')).toBeVisible();

      await selectCalendarDate(page, nextAvailableDate);
      await expect(page.getByText(new RegExp(`Choose your specialist|Choose a resource`))).toBeVisible();

      await page.getByText(resourceName, { exact: true }).click();
      await expect(page.getByText(/Slots for/)).toBeVisible();

      await page.locator('.bw-slot').first().click();
      await expect(page.getByText('Your details')).toBeVisible();

      const conflictBookingRes = await request.post(`${tenantBaseUrl}/api/booking/bookings`, {
        headers: authHeaders(ownerToken),
        data: {
          service_id: serviceId,
          resource_id: resourceId,
          starts_at: availableSlots[0].starts_at,
          ends_at: availableSlots[0].ends_at,
          customer_name: `Conflict ${seed}`,
          customer_email: `conflict-${seed}@example.com`,
          force: true,
        },
      });
      expect(conflictBookingRes.status()).toBe(201);
      const conflictBookingBody = await conflictBookingRes.json() as PageResponse<{ id: number }>;
      createdBookingIds.push(conflictBookingBody.data.id);

      await page.getByPlaceholder('Your name').fill('Playwright Conflict Guest');
      await page.getByPlaceholder('your@email.com').fill(`playwright-conflict-${seed}@example.com`);

      const holdResponsePromise = page.waitForResponse((response) => {
        return response.request().method() === 'POST'
          && response.url().endsWith('/api/public/booking/hold');
      });
      await page.getByRole('button', { name: /Continue to review/i }).click();
      const holdResponse = await holdResponsePromise;
      expect([409, 422]).toContain(holdResponse.status());

      await expect(page.getByText(/That (time )?slot is no longer available/i)).toBeVisible();
      await expect(page.getByText(/Slots for/)).toBeVisible();
      await expect(page.getByText('Your details')).not.toBeVisible();
      const filteredIssues = filterRuntimeIssues(issues, allowlist);
      expect(filteredIssues, `Runtime issues detected in storefront appointment conflict flow:\n${formatIssues(filteredIssues)}`).toEqual([]);
    } finally {
      for (const bookingId of createdBookingIds) {
        await cancelAndDeleteBookingIfNeeded(request, ownerToken, bookingId);
      }
      await deleteIfPresent(request, ownerToken, `${tenantBaseUrl}/api/pages/${publishedPage.id}`);
      await detachResourceFromServiceIfNeeded(request, ownerToken, serviceId, resourceId);
      await deleteAvailabilityWindows(request, ownerToken, resourceId);
      await deleteIfPresent(request, ownerToken, `${tenantBaseUrl}/api/booking/services/${serviceId}`);
      await deleteIfPresent(request, ownerToken, `${tenantBaseUrl}/api/booking/resources/${resourceId}`);
    }
  });
});
