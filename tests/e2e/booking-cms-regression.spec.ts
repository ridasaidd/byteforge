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
import { gotoWithAuthCookies, loginAndCaptureAuthSession, tenantOwnerCredentials } from './support/auth';

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
 * Seed the authenticated refresh-cookie session into the browser context before
 * navigating so CMS pages can bootstrap auth without repeated form logins.
 */
async function gotoWithAuth(
  page: import('@playwright/test').Page,
  url: string,
  cookies: Awaited<ReturnType<import('@playwright/test').Page['context']['cookies']>>,
): Promise<void> {
  await gotoWithAuthCookies(page, url, cookies);
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe('Booking CMS — regression', () => {
  test.describe.configure({ mode: 'serial' });

  let ownerToken = '';
  let ownerCookies: Awaited<ReturnType<import('@playwright/test').Page['context']['cookies']>> = [];

  test.beforeAll(async ({ browser }) => {
    if (!tenantBaseUrl) return;
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    try {
      await p.goto(`${tenantBaseUrl}/login`);
      const session = await loginAndCaptureAuthSession(p, tenantOwnerCredentials);
      await p.waitForURL(new RegExp(`${tenantBaseUrl}/cms(/|$)`), { timeout: 30_000 });
      ownerToken = session.token;
      ownerCookies = session.cookies;
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
      await gotoWithAuth(page, `${tenantBaseUrl}/cms/bookings/services`, ownerCookies);

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

  test('person resource payload normalizes capacity and label', async ({ request }) => {
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'Booking addon not active — skipping regression test.');

    const createRes = await request.post(`${tenantBaseUrl}/api/booking/resources`, {
      headers: authHeaders(ownerToken),
      data: {
        name: `Stylist ${Date.now()}`,
        type: 'person',
        capacity: 5,
        resource_label: 'Should be removed',
        is_active: true,
      },
    });

    expect(createRes.status()).toBe(201);
    const { data: created } = await createRes.json() as {
      data: { id: number; type: string; capacity: number; resource_label: string | null };
    };

    expect(created.type).toBe('person');
    expect(created.capacity).toBe(1);
    expect(created.resource_label).toBeNull();

    try {
      const patchRes = await request.patch(`${tenantBaseUrl}/api/booking/resources/${created.id}`, {
        headers: authHeaders(ownerToken),
        data: {
          capacity: 9,
          resource_label: 'Still should be removed',
        },
      });

      expect(patchRes.status()).toBe(200);
      const { data: updated } = await patchRes.json() as {
        data: { capacity: number; resource_label: string | null };
      };

      expect(updated.capacity).toBe(1);
      expect(updated.resource_label).toBeNull();
    } finally {
      await request.delete(`${tenantBaseUrl}/api/booking/resources/${created.id}`, {
        headers: authHeaders(ownerToken),
      });
    }
  });

  test('booking detail reflects tenant display format settings', async ({ page, request }) => {
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'Booking addon not active — skipping regression test.');

    const headers = authHeaders(ownerToken);

    const settingsBeforeRes = await request.get(`${tenantBaseUrl}/api/settings`, { headers });
    expect(settingsBeforeRes.ok()).toBeTruthy();
    const settingsBefore = await settingsBeforeRes.json() as {
      data: { date_format: string; time_format: string };
    };

    const serviceRes = await request.post(`${tenantBaseUrl}/api/booking/services`, {
      headers,
      data: {
        name: `Format Service ${Date.now()}`,
        booking_mode: 'slot',
        duration_minutes: 60,
        slot_interval_minutes: 60,
      },
    });
    expect(serviceRes.status()).toBe(201);
    const { data: service } = await serviceRes.json() as { data: { id: number } };

    const resourceRes = await request.post(`${tenantBaseUrl}/api/booking/resources`, {
      headers,
      data: {
        name: `Format Resource ${Date.now()}`,
        type: 'space',
        is_active: true,
      },
    });
    expect(resourceRes.status()).toBe(201);
    const { data: resource } = await resourceRes.json() as { data: { id: number } };

    await request.post(`${tenantBaseUrl}/api/booking/services/${service.id}/resources`, {
      headers,
      data: { resource_id: resource.id },
    });

    const startsAt = new Date(Date.UTC(2026, 3, 25, 13, 45, 0));
    const endsAt = new Date(Date.UTC(2026, 3, 25, 14, 45, 0));

    const bookingRes = await request.post(`${tenantBaseUrl}/api/booking/bookings`, {
      headers,
      data: {
        service_id: service.id,
        resource_id: resource.id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        customer_name: 'Format Test Customer',
        customer_email: 'format-test@example.com',
        force: true,
      },
    });
    expect(bookingRes.status()).toBe(201);
    const { data: booking } = await bookingRes.json() as { data: { id: number } };

    try {
      const setRes = await request.put(`${tenantBaseUrl}/api/settings`, {
        headers,
        data: {
          date_format: 'dd/MM/yyyy',
          time_format: 'h:mm aa',
        },
      });
      expect(setRes.ok()).toBeTruthy();

      await gotoWithAuth(page, `${tenantBaseUrl}/cms/bookings/${booking.id}`, ownerCookies);
      await expect(page.getByRole('heading', { name: /booking #/i })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('25/04/2026').first()).toBeVisible();
      await expect(page.getByText(/\b(AM|PM)\b/).first()).toBeVisible();
    } finally {
      await request.put(`${tenantBaseUrl}/api/settings`, {
        headers,
        data: {
          date_format: settingsBefore.data.date_format,
          time_format: settingsBefore.data.time_format,
        },
      });

      await request.delete(`${tenantBaseUrl}/api/booking/bookings/${booking.id}`, { headers });
      await request.delete(`${tenantBaseUrl}/api/booking/resources/${resource.id}`, { headers });
      await request.delete(`${tenantBaseUrl}/api/booking/services/${service.id}`, { headers });
    }
  });

  test('month overflow opens drilldown with hidden bookings', async ({ page, request }) => {
    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'Booking addon not active — skipping regression test.');

    const headers = authHeaders(ownerToken);

    const serviceRes = await request.post(`${tenantBaseUrl}/api/booking/services`, {
      headers,
      data: {
        name: `Overflow Service ${Date.now()}`,
        booking_mode: 'slot',
        duration_minutes: 60,
        slot_interval_minutes: 60,
      },
    });
    expect(serviceRes.status()).toBe(201);
    const { data: service } = await serviceRes.json() as { data: { id: number } };

    const resourceRes = await request.post(`${tenantBaseUrl}/api/booking/resources`, {
      headers,
      data: {
        name: `Overflow Resource ${Date.now()}`,
        type: 'space',
        is_active: true,
      },
    });
    expect(resourceRes.status()).toBe(201);
    const { data: resource } = await resourceRes.json() as { data: { id: number } };

    await request.post(`${tenantBaseUrl}/api/booking/services/${service.id}/resources`, {
      headers,
      data: { resource_id: resource.id },
    });

    const target = new Date();
    target.setDate(Math.min(25, new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()));
    target.setHours(9, 0, 0, 0);

    const customers = [
      `Overflow A ${Date.now()}`,
      `Overflow B ${Date.now()}`,
      `Overflow C ${Date.now()}`,
    ];

    const createdBookingIds: number[] = [];

    try {
      for (let i = 0; i < customers.length; i++) {
        const start = new Date(target);
        start.setHours(9 + i, 0, 0, 0);
        const end = new Date(start);
        end.setHours(start.getHours() + 1);

        const createBookingRes = await request.post(`${tenantBaseUrl}/api/booking/bookings`, {
          headers,
          data: {
            service_id: service.id,
            resource_id: resource.id,
            starts_at: start.toISOString(),
            ends_at: end.toISOString(),
            customer_name: customers[i],
            customer_email: `overflow-${i}-${Date.now()}@example.com`,
            force: true,
          },
        });

        expect(createBookingRes.status()).toBe(201);
        const body = await createBookingRes.json() as { data: { id: number } };
        createdBookingIds.push(body.data.id);
      }

      await gotoWithAuth(page, `${tenantBaseUrl}/cms/bookings`, ownerCookies);
      await expect(page.getByRole('button', { name: /month/i })).toBeVisible({ timeout: 10_000 });

      const visibleBooking = page.getByRole('button', { name: new RegExp(customers[0]) }).first();
      await expect(visibleBooking).toBeVisible({ timeout: 10_000 });

      const dayCard = visibleBooking.locator('xpath=ancestor::div[contains(@class,"border") and contains(@class,"rounded-md")]').first();
      const moreButton = dayCard.getByRole('button', { name: /\+\d+ more/i });
      await expect(moreButton).toBeVisible();
      await moreButton.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText(customers[0])).toBeVisible();
      await expect(dialog.getByText(customers[1])).toBeVisible();
      await expect(dialog.getByText(customers[2])).toBeVisible();
    } finally {
      for (const id of createdBookingIds) {
        await request.delete(`${tenantBaseUrl}/api/booking/bookings/${id}`, { headers });
      }
      await request.delete(`${tenantBaseUrl}/api/booking/resources/${resource.id}`, { headers });
      await request.delete(`${tenantBaseUrl}/api/booking/services/${service.id}`, { headers });
    }
  });

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
