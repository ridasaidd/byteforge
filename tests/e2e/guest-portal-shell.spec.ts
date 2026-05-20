import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;
const laravelBootstrapAvailable = existsSync(resolve(process.cwd(), 'vendor/autoload.php'))
  && existsSync(resolve(process.cwd(), 'bootstrap/app.php'))
  && (existsSync(resolve(process.cwd(), '.env')) || existsSync(resolve(process.cwd(), '.env.testing')));

type SeededGuestQuoteSession = {
  guestUserId: number;
  quoteRequestId: number;
  quoteId: number;
  refreshToken: string;
  guestEmail: string;
  subjectLabel: string;
  requestDescription: string;
  lineItemLabel: string;
};

function seedGuestQuoteSession(seed: string, host: string): SeededGuestQuoteSession {
  const script = [
    "require 'vendor/autoload.php';",
    "$app = require 'bootstrap/app.php';",
    "$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);",
    '$kernel->bootstrap();',
    '$seed = $argv[1];',
    '$host = $argv[2];',
    "$tenantId = 'tenant_one';",
    "$guestEmail = sprintf('playwright.guest.quote.%s@example.com', $seed);",
    "$subjectLabel = sprintf('Guest portal quote %s', $seed);",
    "$requestDescription = 'Guest portal quote continuity coverage';",
    "$lineItemLabel = 'Portal continuity consultation';",
    "$ownerUserId = App\\Models\\Membership::query()->where('tenant_id', $tenantId)->where('role', 'owner')->where('status', 'active')->value('user_id');",
    "$guestUser = App\\Models\\GuestUser::query()->create(['email' => $guestEmail, 'name' => 'Playwright Guest Quote', 'email_verified_at' => now()]);",
    "$quoteRequest = App\\Models\\QuoteRequest::query()->create(['tenant_id' => $tenantId, 'guest_user_id' => $guestUser->id, 'origin_surface' => App\\Models\\QuoteRequest::ORIGIN_PUBLIC, 'guest_name' => 'Playwright Guest Quote', 'guest_email' => $guestEmail, 'subject_label' => $subjectLabel, 'request_description' => $requestDescription, 'status' => App\\Models\\QuoteRequest::STATUS_SUBMITTED, 'submitted_at' => now(), 'last_activity_at' => now()]);",
    "$quote = App\\Models\\Quote::query()->create(['tenant_id' => $tenantId, 'quote_request_id' => $quoteRequest->id, 'version' => 1, 'created_by_user_id' => $ownerUserId, 'sent_by_user_id' => $ownerUserId, 'currency' => 'SEK', 'subtotal_minor' => 12000, 'tax_minor' => 0, 'total_minor' => 12000, 'estimated_duration_minutes' => 90, 'customer_message' => 'Please review this quote in your guest portal.', 'valid_until' => now()->addDays(7), 'public_token' => App\\Models\\Quote::generateToken(), 'status' => App\\Models\\Quote::STATUS_SENT, 'sent_at' => now()]);",
    "App\\Models\\QuoteLineItem::query()->create(['quote_id' => $quote->id, 'label' => $lineItemLabel, 'description' => 'Initial consultation and written estimate', 'quantity' => 1, 'unit_price_minor' => 12000, 'line_total_minor' => 12000, 'sort_order' => 1]);",
    "$refreshToken = sprintf('playwright-guest-refresh-token-%s', $seed);",
    "App\\Models\\WebRefreshSession::query()->create(['user_id' => null, 'guest_user_id' => $guestUser->id, 'tenant_id' => $tenantId, 'host' => $host, 'token_hash' => hash('sha256', $refreshToken), 'user_agent' => 'Playwright', 'ip_address' => '127.0.0.1', 'last_used_at' => now(), 'expires_at' => now()->addDays(14)]);",
    'echo json_encode([',
    "  'guestUserId' => $guestUser->id,",
    "  'quoteRequestId' => $quoteRequest->id,",
    "  'quoteId' => $quote->id,",
    "  'refreshToken' => $refreshToken,",
    "  'guestEmail' => $guestEmail,",
    "  'subjectLabel' => $subjectLabel,",
    "  'requestDescription' => $requestDescription,",
    "  'lineItemLabel' => $lineItemLabel,",
    '], JSON_THROW_ON_ERROR);',
  ].join(' ');

  const output = execFileSync('php', ['-r', script, seed, host], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  return JSON.parse(output) as SeededGuestQuoteSession;
}

function cleanupGuestQuoteSession(session: SeededGuestQuoteSession): void {
  const script = [
    "require 'vendor/autoload.php';",
    "$app = require 'bootstrap/app.php';",
    "$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);",
    '$kernel->bootstrap();',
    '$guestUserId = (int) $argv[1];',
    '$quoteRequestId = (int) $argv[2];',
    '$quoteId = (int) $argv[3];',
    "App\\Models\\GuestMagicLinkToken::query()->where('guest_user_id', $guestUserId)->delete();",
    "App\\Models\\QuoteLineItem::query()->where('quote_id', $quoteId)->delete();",
    "App\\Models\\Quote::query()->whereKey($quoteId)->delete();",
    "App\\Models\\QuoteRequest::query()->whereKey($quoteRequestId)->delete();",
    "App\\Models\\WebRefreshSession::query()->where('guest_user_id', $guestUserId)->delete();",
    "App\\Models\\GuestUser::query()->whereKey($guestUserId)->delete();",
    'echo "ok";',
  ].join(' ');

  execFileSync('php', ['-r', script, String(session.guestUserId), String(session.quoteRequestId), String(session.quoteId)], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

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

test('authenticated guest can review and accept a linked quote from the guest portal', async ({ page }) => {
  test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable guest portal shell smoke tests.');
  test.skip(!laravelBootstrapAvailable, 'This guest quote continuity flow requires a local Laravel bootstrap to seed test data.');

  const issues = attachRuntimeGuards(page);
  const seed = `${Date.now()}`;
  const session = seedGuestQuoteSession(seed, new URL(tenantBaseUrl).hostname);

  try {
    await page.goto(`${tenantBaseUrl}/guest-portal`);

    await page.evaluate((refreshToken) => {
      document.cookie = `byteforge_guest_refresh=${refreshToken}; path=/; SameSite=Lax`;
    }, session.refreshToken);

    const browserSession = await page.evaluate(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/guest-auth/session`, {
        headers: {
          Accept: 'application/json',
        },
        credentials: 'include',
      });

      return {
        ok: response.ok,
        status: response.status,
        body: await response.text(),
      };
    }, tenantBaseUrl);

    expect(browserSession.ok, `Guest browser session restore should succeed: ${browserSession.status} ${browserSession.body}`).toBeTruthy();
    expect((JSON.parse(browserSession.body) as { guest: { email: string } | null }).guest?.email).toBe(session.guestEmail);

    await page.goto(`${tenantBaseUrl}/guest-portal`);

    await expect(page.getByText(session.guestEmail)).toBeVisible();
    await expect(page.getByText(session.subjectLabel)).toBeVisible();
    await expect(page.getByText(session.requestDescription)).toBeVisible();

    const detailResponse = page.waitForResponse((response) => {
      try {
        const url = new URL(response.url());

        return response.request().method() === 'GET'
          && url.pathname.endsWith(`/api/guest-auth/quotes/${session.quoteId}`);
      } catch {
        return false;
      }
    });

    await page.getByRole('link', { name: 'View quote' }).click();

    const detail = await detailResponse;
    await expect(detail.ok()).toBeTruthy();
    await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/guest-portal/quotes/${session.quoteId}$`));
    await expect(page.getByText('Selected quote')).toBeVisible();
    await expect(page.getByText(session.lineItemLabel)).toBeVisible();

    const acceptResponse = page.waitForResponse((response) => {
      try {
        const url = new URL(response.url());

        return response.request().method() === 'POST'
          && url.pathname.endsWith(`/api/guest-auth/quotes/${session.quoteId}/accept`);
      } catch {
        return false;
      }
    });

    await page.locator('aside').getByRole('button', { name: 'Accept quote' }).click();

    const accept = await acceptResponse;
    await expect(accept.ok()).toBeTruthy();
    expect((await accept.json() as { data: { status: string } }).data.status).toBe('accepted');

    await expect(page.getByText('Your quote was accepted.')).toBeVisible();
    await expect(page.locator('aside').getByText('Accepted')).toBeVisible();

    const authRelevantIssues = issues.filter((issue) => !issue.message.includes('/api/guest-auth/session'));

    expect(authRelevantIssues, `Runtime issues detected in guest portal quote continuity flow:\n${formatIssues(authRelevantIssues)}`).toEqual([]);
  } finally {
    cleanupGuestQuoteSession(session);
  }
});
