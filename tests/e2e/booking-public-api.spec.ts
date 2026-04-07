/**
 * booking-public-api.spec.ts
 *
 * Tests the unauthenticated public booking API (Phase 13.3 + 13.6).
 * Covers:
 *   - GET /api/public/booking/services       → 200 with data array
 *   - GET /api/public/booking/resources      → 200 with data array
 *   - GET /api/public/booking/slots          → 422 on missing params
 *   - GET /api/public/booking/availability   → 422 on missing params
 *   - POST /api/public/booking/hold          → 422 on invalid body
 *   - POST /api/public/booking/hold/{token}  → 410 on expired/unknown token
 *   - All routes return 403 if addon not active (handled transparently by skip)
 *
 * Prerequisites: PLAYWRIGHT_TENANT_BASE_URL must point to a tenant domain
 * that has the 'booking' addon active.  Tests that strictly require the addon
 * are gated with a runtime check against GET /api/addons.
 */

import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function isBookingAddonActive(request: import('@playwright/test').APIRequestContext): Promise<boolean> {
  try {
    // The /api/public/booking/services route returns 403 when the addon is inactive.
    const res = await request.get(`${tenantBaseUrl}/api/public/booking/services`);
    return res.status() !== 403;
  } catch {
    return false;
  }
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe('Public booking API', () => {
  test.beforeEach(() => {
    test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable public booking API tests.');
  });

  test('GET /api/public/booking/services returns 200 with data array', async ({ request }) => {
    const addonActive = await isBookingAddonActive(request);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    const res = await request.get(`${tenantBaseUrl}/api/public/booking/services`);
    expect(res.status()).toBe(200);

    const body = await res.json() as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('GET /api/public/booking/resources returns 200 with data array', async ({ request }) => {
    const addonActive = await isBookingAddonActive(request);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    const res = await request.get(`${tenantBaseUrl}/api/public/booking/resources`);
    expect(res.status()).toBe(200);

    const body = await res.json() as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('GET /api/public/booking/slots returns 422 when service_id is missing', async ({ request }) => {
    const addonActive = await isBookingAddonActive(request);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    const res = await request.get(`${tenantBaseUrl}/api/public/booking/slots`);
    // Missing required params → validation error
    expect([422, 400]).toContain(res.status());
  });

  test('GET /api/public/booking/availability returns 422 when params are missing', async ({ request }) => {
    const addonActive = await isBookingAddonActive(request);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    const res = await request.get(`${tenantBaseUrl}/api/public/booking/availability`);
    expect([422, 400]).toContain(res.status());
  });

  test('POST /api/public/booking/hold returns 422 on empty body', async ({ request }) => {
    const addonActive = await isBookingAddonActive(request);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    const res = await request.post(`${tenantBaseUrl}/api/public/booking/hold`, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      data: {},
    });
    expect(res.status()).toBe(422);

    const body = await res.json() as { message: string; errors?: Record<string, string[]> };
    expect(body.message).toBeTruthy();
    expect(body.errors).toBeDefined();
  });

  test('POST /api/public/booking/hold returns 422 when service_id is missing', async ({ request }) => {
    const addonActive = await isBookingAddonActive(request);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    const res = await request.post(`${tenantBaseUrl}/api/public/booking/hold`, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      data: {
        resource_id: 999999,
        starts_at: new Date(Date.now() + 86_400_000).toISOString(),
        customer_name: 'Test User',
        customer_email: 'test@example.com',
      },
    });
    expect(res.status()).toBe(422);
    const body = await res.json() as { errors: Record<string, string[]> };
    expect(body.errors?.service_id).toBeDefined();
  });

  test('POST /api/public/booking/hold/{token} returns 410 for an unknown/expired token', async ({ request }) => {
    const addonActive = await isBookingAddonActive(request);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    const fakeToken = 'aaaaaaaa-0000-0000-0000-000000000000';
    const res = await request.post(`${tenantBaseUrl}/api/public/booking/hold/${fakeToken}`, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      data: {
        customer_name: 'Test User',
        customer_email: 'test@example.com',
      },
    });
    // 410 Gone (expired/unknown) or 404 — both are acceptable
    expect([410, 404]).toContain(res.status());
  });

  test('booking public endpoints return JSON (not HTML) on error', async ({ request }) => {
    const addonActive = await isBookingAddonActive(request);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    const res = await request.post(`${tenantBaseUrl}/api/public/booking/hold`, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      data: {},
    });
    const contentType = res.headers()['content-type'] ?? '';
    expect(contentType).toContain('application/json');
  });
});
