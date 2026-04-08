/**
 * booking-cms-crud.spec.ts
 *
 * API-level CRUD tests for the authenticated CMS booking endpoints (Phase 13.4).
 * Authenticates as the tenant owner (who has all bookings.* permissions) and
 * exercises the full lifecycle:
 *
 *   Resource CRUD:  create → show → update → delete
 *   Service CRUD:   create → show → update → attach resource → detach → delete
 *   Booking list:   GET /api/booking/bookings returns pagination shape
 *   Auth guard:     unauthenticated requests return 401
 *
 * Prerequisites: PLAYWRIGHT_TENANT_BASE_URL + tenant owner credentials.
 * All tests self-clean (delete what they create).
 */

import { test, expect } from '@playwright/test';
import { loginWithCredentials, tenantOwnerCredentials } from './support/auth';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

// ─── Shared helpers ───────────────────────────────────────────────────────────

type ApiContext = import('@playwright/test').APIRequestContext;

async function getAuthToken(page: import('@playwright/test').Page): Promise<string> {
  await page.goto(`${tenantBaseUrl}/login`);
  await loginWithCredentials(page, tenantOwnerCredentials);
  await page.waitForURL(new RegExp(`${tenantBaseUrl}/cms(/|$)`));
  const token = await page.evaluate(() => window.localStorage.getItem('auth_token'));
  if (!token) throw new Error('auth_token not found in localStorage after login');
  return token;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

async function isBookingAddonActive(request: ApiContext, token: string): Promise<boolean> {
  const res = await request.get(`${tenantBaseUrl}/api/addons`, {
    headers: authHeaders(token),
  });
  if (!res.ok()) return false;
  // GET /api/addons returns { data: string[] } — feature flag slugs, not objects.
  const body = await res.json() as { data: string[] };
  return Array.isArray(body.data) && body.data.includes('booking');
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe('Booking CMS API — CRUD', () => {
  // Serial mode: each authenticated test reuses the token from beforeAll,
  // avoiding repeated form-logins that trip the Laravel login throttle.
  test.describe.configure({ mode: 'serial' });

  /** Auth token obtained once per suite. */
  let crudToken = '';

  test.beforeAll(async ({ browser }) => {
    if (!tenantBaseUrl) return;
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    try {
      await p.goto(`${tenantBaseUrl}/login`);
      await loginWithCredentials(p, tenantOwnerCredentials);
      await p.waitForURL(new RegExp(`${tenantBaseUrl}/cms(/|$)`), { timeout: 30_000 });
      crudToken = (await p.evaluate(() => window.localStorage.getItem('auth_token'))) ?? '';
    } finally {
      await ctx.close();
    }
  });

  test.beforeEach(() => {
    test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable booking CMS CRUD tests.');
  });

  // ── Auth guard ──────────────────────────────────────────────────────────────

  test('unauthenticated GET /api/booking/services returns 401', async ({ request }) => {
    const res = await request.get(`${tenantBaseUrl}/api/booking/services`, {
      headers: { Accept: 'application/json' },
    });
    expect(res.status()).toBe(401);
  });

  test('unauthenticated GET /api/booking/resources returns 401', async ({ request }) => {
    const res = await request.get(`${tenantBaseUrl}/api/booking/resources`, {
      headers: { Accept: 'application/json' },
    });
    expect(res.status()).toBe(401);
  });

  test('unauthenticated GET /api/booking/bookings returns 401', async ({ request }) => {
    const res = await request.get(`${tenantBaseUrl}/api/booking/bookings`, {
      headers: { Accept: 'application/json' },
    });
    expect(res.status()).toBe(401);
  });

  // ── Resource CRUD ───────────────────────────────────────────────────────────

  test('can create, read, update and delete a booking resource', async ({ request }) => {
    const token = crudToken;
    const addonActive = await isBookingAddonActive(request, token);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    const uniqueName = `E2E Resource ${Date.now()}`;

    // Create
    const createRes = await request.post(`${tenantBaseUrl}/api/booking/resources`, {
      headers: authHeaders(token),
      data: {
        name: uniqueName,
        type: 'space',
        capacity: 4,
        is_active: true,
      },
    });
    expect(createRes.status(), `Create resource failed: ${createRes.status()}`).toBe(201);
    const created = await createRes.json() as { data: { id: number; name: string; type: string } };
    expect(created.data.name).toBe(uniqueName);
    expect(created.data.type).toBe('space');
    const resourceId = created.data.id;

    // Show
    const showRes = await request.get(`${tenantBaseUrl}/api/booking/resources/${resourceId}`, {
      headers: authHeaders(token),
    });
    expect(showRes.status()).toBe(200);
    const shown = await showRes.json() as { data: { id: number } };
    expect(shown.data.id).toBe(resourceId);

    // Update
    const updatedName = `${uniqueName} (updated)`;
    const updateRes = await request.patch(`${tenantBaseUrl}/api/booking/resources/${resourceId}`, {
      headers: authHeaders(token),
      data: { name: updatedName, capacity: 8 },
    });
    expect(updateRes.status()).toBe(200);
    const updated = await updateRes.json() as { data: { name: string; capacity: number } };
    expect(updated.data.name).toBe(updatedName);
    expect(updated.data.capacity).toBe(8);

    // List — should include the resource
    const listRes = await request.get(`${tenantBaseUrl}/api/booking/resources`, {
      headers: authHeaders(token),
    });
    expect(listRes.status()).toBe(200);
    const list = await listRes.json() as { data: Array<{ id: number }> };
    expect(Array.isArray(list.data)).toBe(true);
    expect(list.data.some(r => r.id === resourceId)).toBe(true);

    // Delete
    const deleteRes = await request.delete(`${tenantBaseUrl}/api/booking/resources/${resourceId}`, {
      headers: authHeaders(token),
    });
    expect([200, 204]).toContain(deleteRes.status());

    // Verify gone
    const goneRes = await request.get(`${tenantBaseUrl}/api/booking/resources/${resourceId}`, {
      headers: authHeaders(token),
    });
    expect(goneRes.status()).toBe(404);
  });

  // ── Service CRUD + resource attach ─────────────────────────────────────────

  test('can create, update, attach a resource, detach and delete a booking service', async ({ request }) => {
    const token = crudToken;
    const addonActive = await isBookingAddonActive(request, token);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    const ts = Date.now();

    // Create a resource to attach later
    const resCreate = await request.post(`${tenantBaseUrl}/api/booking/resources`, {
      headers: authHeaders(token),
      data: { name: `E2E Res ${ts}`, type: 'space', capacity: 2, is_active: true },
    });
    expect(resCreate.status()).toBe(201);
    const resource = await resCreate.json() as { data: { id: number } };
    const resourceId = resource.data.id;

    try {
      // Create service
      const svcCreate = await request.post(`${tenantBaseUrl}/api/booking/services`, {
        headers: authHeaders(token),
        data: {
          name: `E2E Service ${ts}`,
          booking_mode: 'slot',
          duration_minutes: 60,
          slot_interval_minutes: 30,
          buffer_minutes: 0,
          advance_notice_hours: 0,
          is_active: true,
        },
      });
      expect(svcCreate.status(), `Create service failed: ${svcCreate.status()}`).toBe(201);
      const svcBody = await svcCreate.json() as { data: { id: number; name: string; booking_mode: string } };
      expect(svcBody.data.booking_mode).toBe('slot');
      const serviceId = svcBody.data.id;

      try {
        // Show
        const svcShow = await request.get(`${tenantBaseUrl}/api/booking/services/${serviceId}`, {
          headers: authHeaders(token),
        });
        expect(svcShow.status()).toBe(200);

        // Update
        const svcUpdate = await request.patch(`${tenantBaseUrl}/api/booking/services/${serviceId}`, {
          headers: authHeaders(token),
          data: { duration_minutes: 90, price: 500, currency: 'SEK' },
        });
        expect(svcUpdate.status()).toBe(200);
        const svcUpdated = await svcUpdate.json() as { data: { duration_minutes: number } };
        expect(svcUpdated.data.duration_minutes).toBe(90);

        // Attach resource
        const attachRes = await request.post(
          `${tenantBaseUrl}/api/booking/services/${serviceId}/resources`,
          {
            headers: authHeaders(token),
            data: { resource_id: resourceId },
          },
        );
        expect(attachRes.status()).toBe(200);

        // Verify resource appears in service data
        const afterAttach = await request.get(`${tenantBaseUrl}/api/booking/services/${serviceId}`, {
          headers: authHeaders(token),
        });
        const afterBody = await afterAttach.json() as { data: { resources: Array<{ id: number }> } };
        expect(afterBody.data.resources?.some(r => r.id === resourceId)).toBe(true);

        // Detach resource
        const detachRes = await request.delete(
          `${tenantBaseUrl}/api/booking/services/${serviceId}/resources/${resourceId}`,
          { headers: authHeaders(token) },
        );
        expect([200, 204]).toContain(detachRes.status());

      } finally {
        // Clean up service
        await request.delete(`${tenantBaseUrl}/api/booking/services/${serviceId}`, {
          headers: authHeaders(token),
        });
      }
    } finally {
      // Clean up resource
      await request.delete(`${tenantBaseUrl}/api/booking/resources/${resourceId}`, {
        headers: authHeaders(token),
      });
    }
  });

  // ── Booking list ───────────────────────────────────────────────────────────

  test('GET /api/booking/bookings returns paginated shape', async ({ request }) => {
    const token = crudToken;
    const addonActive = await isBookingAddonActive(request, token);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    const res = await request.get(`${tenantBaseUrl}/api/booking/bookings`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);

    const body = await res.json() as {
      data: unknown[];
      current_page: number;
      last_page: number;
      total: number;
    };
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.current_page).toBe('number');
    expect(typeof body.last_page).toBe('number');
    expect(typeof body.total).toBe('number');
  });

  // ── Validation ──────────────────────────────────────────────────────────────

  test('POST /api/booking/services returns 422 when name is missing', async ({ request }) => {
    const token = crudToken;
    const addonActive = await isBookingAddonActive(request, token);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    const res = await request.post(`${tenantBaseUrl}/api/booking/services`, {
      headers: authHeaders(token),
      data: { booking_mode: 'slot' }, // missing name
    });
    expect(res.status()).toBe(422);
    const body = await res.json() as { errors: Record<string, string[]> };
    expect(body.errors?.name).toBeDefined();
  });

  test('POST /api/booking/resources returns 422 when type is invalid', async ({ request }) => {
    const token = crudToken;
    const addonActive = await isBookingAddonActive(request, token);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    const res = await request.post(`${tenantBaseUrl}/api/booking/resources`, {
      headers: authHeaders(token),
      data: { name: 'Bad Type Resource', type: 'invalid_type' },
    });
    expect(res.status()).toBe(422);
    const body = await res.json() as { errors: Record<string, string[]> };
    expect(body.errors?.type).toBeDefined();
  });
});
