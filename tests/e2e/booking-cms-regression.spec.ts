/**
 * booking-cms-regression.spec.ts
 *
 * Regression tests for specific bugs fixed during Phase 13 development:
 *
 * 1. Stale form data — clicking Edit on a service must pre-populate the dialog
 *    with that service's existing data, not an empty or stale form.
 *    (Regression for the missing `key` prop on dialog components.)
 *
 * 2. Schedule → slot availability — creating an availability window for a
 *    resource must make public booking slots appear for that date, and the
 *    next-available endpoint must return a non-null date.
 *
 * Prerequisites: PLAYWRIGHT_TENANT_BASE_URL + tenant owner credentials.
 * Tests are skipped when the booking addon is not active on the tenant.
 */

import { test, expect } from '@playwright/test';
import { loginWithCredentials, tenantOwnerCredentials } from './support/auth';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ApiContext = import('@playwright/test').APIRequestContext;

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
  const body = await res.json() as { data: string[] };
  return Array.isArray(body.data) && body.data.includes('booking');
}

/**
 * Inject auth token into localStorage before navigating so we bypass the
 * login form (and avoid hitting the rate-limiter if tests run in parallel).
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

test.describe('Booking CMS — regression', () => {
  test.describe.configure({ mode: 'serial' });

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
    test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable regression tests.');
  });

  // ── Regression 1: Edit dialog pre-population ────────────────────────────────

  test('editing a service pre-populates the dialog with the service name', async ({ page, request }) => {
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'Booking addon not active — skipping regression test.');

    // Create a service via API with a unique, identifiable name
    const uniqueName = `Regression Service ${Date.now()}`;
    const createRes = await request.post(`${tenantBaseUrl}/api/booking/services`, {
      headers: authHeaders(ownerToken),
      data: {
        name:                  uniqueName,
        booking_mode:          'slot',
        duration_minutes:      60,
        slot_interval_minutes: 60,
      },
    });
    expect(createRes.status()).toBe(201);
    const { data: created } = await createRes.json() as { data: { id: number } };
    const serviceId = created.id;

    try {
      // Navigate to the service manager page
      await gotoWithAuth(page, `${tenantBaseUrl}/cms/bookings/services`, ownerToken);

      // Wait for the service card to appear
      await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 15_000 });

      // Click the Edit button associated with this service card
      const serviceCard = page.locator('[data-testid="service-card"]', { hasText: uniqueName })
        .or(page.locator('li,article,div', { hasText: uniqueName }).first());

      const editButton = serviceCard.getByRole('button', { name: /edit/i })
        .or(serviceCard.locator('button[aria-label*="edit" i]'))
        .or(serviceCard.locator('button').filter({ hasText: /edit/i })).first();

      await editButton.click();

      // The dialog should open — find the Name input
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      const nameInput = dialog.getByLabel(/name/i).or(dialog.locator('input[name="name"],input[placeholder*="name" i]')).first();
      await expect(nameInput).toHaveValue(uniqueName, { timeout: 5_000 });
    } finally {
      // Clean up the created service
      await request.delete(`${tenantBaseUrl}/api/booking/services/${serviceId}`, {
        headers: authHeaders(ownerToken),
      });
    }
  });

  // ── Regression 2: Schedule → public slots ───────────────────────────────────

  test('creating availability window makes public slots appear for that resource', async ({ request }) => {
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'Booking addon not active — skipping regression test.');

    // Create a slot-mode service
    const serviceRes = await request.post(`${tenantBaseUrl}/api/booking/services`, {
      headers: authHeaders(ownerToken),
      data: {
        name:                  `Slots Regression ${Date.now()}`,
        booking_mode:          'slot',
        duration_minutes:      60,
        slot_interval_minutes: 60,
        advance_notice_hours:  0,
        max_advance_days:      30,
      },
    });
    expect(serviceRes.status()).toBe(201);
    const { data: service } = await serviceRes.json() as { data: { id: number } };

    // Create a resource
    const resourceRes = await request.post(`${tenantBaseUrl}/api/booking/resources`, {
      headers: authHeaders(ownerToken),
      data: { name: `Resource ${Date.now()}`, type: 'person', is_active: true },
    });
    expect(resourceRes.status()).toBe(201);
    const { data: resource } = await resourceRes.json() as { data: { id: number } };

    // Attach resource to service
    await request.post(`${tenantBaseUrl}/api/booking/services/${service.id}/resources/${resource.id}`, {
      headers: authHeaders(ownerToken),
    });

    try {
      // Add availability window: open every day of the week, 09:00–17:00
      for (let dow = 0; dow <= 6; dow++) {
        const winRes = await request.post(
          `${tenantBaseUrl}/api/booking/resources/${resource.id}/availability`,
          {
            headers: authHeaders(ownerToken),
            data: {
              day_of_week: dow,
              starts_at:   '09:00:00',
              ends_at:     '17:00:00',
            },
          },
        );
        expect(winRes.status()).toBe(201);
      }

      // Query the public slots endpoint for today
      const today = new Date().toISOString().split('T')[0];
      const slotsRes = await request.get(
        `${tenantBaseUrl}/api/public/booking/slots?service_id=${service.id}&resource_id=${resource.id}&date=${today}`,
        { headers: { Accept: 'application/json' } },
      );
      expect(slotsRes.status()).toBe(200);

      const { data: slots } = await slotsRes.json() as { data: Array<{ available: boolean }> };
      const availableSlots = slots.filter((s) => s.available);
      expect(availableSlots.length).toBeGreaterThan(0);

      // next-available should also return a date
      const nextRes = await request.get(
        `${tenantBaseUrl}/api/public/booking/next-available?service_id=${service.id}&resource_id=${resource.id}`,
        { headers: { Accept: 'application/json' } },
      );
      expect(nextRes.status()).toBe(200);
      const { data: next } = await nextRes.json() as { data: { date: string; first_slot: string } | null };
      expect(next).not.toBeNull();
      expect(next!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(next!.first_slot).toMatch(/^\d{2}:\d{2}$/);
    } finally {
      // Clean up
      await request.delete(`${tenantBaseUrl}/api/booking/resources/${resource.id}`, {
        headers: authHeaders(ownerToken),
      });
      await request.delete(`${tenantBaseUrl}/api/booking/services/${service.id}`, {
        headers: authHeaders(ownerToken),
      });
    }
  });
});
