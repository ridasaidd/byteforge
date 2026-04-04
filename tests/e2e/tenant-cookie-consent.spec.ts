import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stub the consent-settings API with the given payload for the lifetime of the page. */
async function stubConsentSettings(
    page: import('@playwright/test').Page,
    data: Record<string, unknown>,
) {
    await page.route('**/api/pages/public/consent-settings', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data }),
        }),
    );
}

/** Mask navigator.webdriver so vanilla-cookieconsent's bot-detection doesn't skip rendering. */
async function maskWebdriver(context: import('@playwright/test').BrowserContext) {
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
}

const allEnabledSettings = {
    ga4_enabled: true,
    ga4_measurement_id: 'G-TESTGA4XXX',
    gtm_enabled: true,
    gtm_container_id: 'GTM-TESTXXX',
    clarity_enabled: true,
    clarity_project_id: 'claritytest',
    plausible_enabled: true,
    plausible_domain: 'test.example.com',
    meta_pixel_enabled: true,
    meta_pixel_id: '12345678',
    privacy_policy_url: 'https://example.com/privacy',
    cookie_policy_url: 'https://example.com/cookies',
};

const allDisabledSettings = {
    ga4_enabled: false,
    ga4_measurement_id: null,
    gtm_enabled: false,
    gtm_container_id: null,
    clarity_enabled: false,
    clarity_project_id: null,
    plausible_enabled: false,
    plausible_domain: null,
    meta_pixel_enabled: false,
    meta_pixel_id: null,
    privacy_policy_url: null,
    cookie_policy_url: null,
};

test.describe('Cookie consent banner — tenant storefront', () => {
    test.beforeEach(() => {
        test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable tenant cookie consent tests.');
    });

    test('GET /api/pages/public/consent-settings returns 200 with expected shape', async ({ request }) => {
        const res = await request.get(`${tenantBaseUrl}/api/pages/public/consent-settings`);

        expect(res.status(), 'Consent-settings endpoint must not 404 — check the route is registered in routes/tenant.php').toBe(200);

        const body = (await res.json()) as { data: Record<string, unknown> };
        const data = body.data;

        // Required boolean flags
        for (const key of [
            'ga4_enabled',
            'gtm_enabled',
            'clarity_enabled',
            'plausible_enabled',
            'meta_pixel_enabled',
        ]) {
            expect(typeof data[key], `Expected "${key}" to be boolean`).toBe('boolean');
        }
    });

    test('storefront loads cookie banner without 404 on consent-settings', async ({ page }) => {
        const issues = attachRuntimeGuards(page);
        const failedConsentSettingsRequests: string[] = [];

        // Intercept any request to the consent-settings path and watch for failures
        page.on('response', (response) => {
            if (response.url().includes('/api/pages/public/consent-settings') && !response.ok()) {
                failedConsentSettingsRequests.push(`${response.status()} ${response.url()}`);
            }
        });

        await page.goto(`${tenantBaseUrl}/`);
        await expect(page.locator('#public-app')).toBeAttached();

        // Give the React app time to mount and fire the consent-settings fetch
        await page.waitForTimeout(2000);

        expect(
            failedConsentSettingsRequests,
            `Consent-settings fetch returned a non-200 status:\n${failedConsentSettingsRequests.join('\n')}`,
        ).toEqual([]);

        expect(issues, `Runtime issues on storefront:\n${formatIssues(issues)}`).toEqual([]);
    });

    test('cookie consent banner is visible on first visit', async ({ page, context }) => {
        // Mask navigator.webdriver — vanilla-cookieconsent skips rendering when it detects a bot (hideFromBots: true by default)
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        // Clear cookies to simulate a first-time visitor
        await context.clearCookies();

        await page.goto(`${tenantBaseUrl}/`);
        await expect(page.locator('#public-app')).toBeAttached();

        // vanilla-cookieconsent signals banner visibility by adding 'show--consent' to <html>.
        // #cc-main itself has zero layout height (its .cm child is position:fixed) so we check
        // the class on <html> which is the library's authoritative show/hide mechanism.
        await expect(
            page.locator('html'),
            'html should have show--consent class when consent banner is displayed',
        ).toHaveClass(/show--consent/, { timeout: 5000 });
    });

    test('cookie banner is hidden after accepting all cookies', async ({ page, context }) => {
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });
        await context.clearCookies();

        await page.goto(`${tenantBaseUrl}/`);
        await expect(page.locator('html')).toHaveClass(/show--consent/, { timeout: 5000 });

        // Click "Accept all" — Playwright auto-waits for the button to be actionable
        // (.cm gains visibility:visible only after the cc--anim class is added ~100ms after show--consent)
        await page.locator('#cc-main button[data-role="all"]').click();

        // show--consent should be removed from <html> once accepted
        await expect(
            page.locator('html'),
            'show--consent class should be removed after accepting',
        ).not.toHaveClass(/show--consent/, { timeout: 3000 });

        // Cookie should be set
        const cookies = await context.cookies();
        const consentCookie = cookies.find((c) => c.name === 'byteforge_cookie_consent');
        expect(consentCookie, 'byteforge_cookie_consent cookie should be set after accepting').toBeDefined();
    });

    test('banner does not reappear after consent is given', async ({ page, context }) => {
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });
        await context.clearCookies();

        // First visit — accept
        await page.goto(`${tenantBaseUrl}/`);
        await expect(page.locator('html')).toHaveClass(/show--consent/, { timeout: 5000 });
        await page.locator('#cc-main button[data-role="all"]').click();
        await expect(page.locator('html')).not.toHaveClass(/show--consent/, { timeout: 3000 });

        // Second visit — banner should not show
        await page.goto(`${tenantBaseUrl}/`);
        await expect(page.locator('#public-app')).toBeAttached();
        await page.waitForTimeout(1500);

        await expect(
            page.locator('html'),
            'Consent modal should not reappear after consent already given',
        ).not.toHaveClass(/show--consent/);
    });
});

// ---------------------------------------------------------------------------
// Consent enforcement — do analytics scripts actually follow consent + settings?
// ---------------------------------------------------------------------------

test.describe('Cookie consent enforcement — analytics scripts', () => {
    test.beforeEach(() => {
        test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable tenant cookie consent tests.');
    });

    test('accepting analytics consent loads GA4 when GA4 is enabled in settings', async ({ page, context }) => {
        await maskWebdriver(context);
        await context.clearCookies();
        await stubConsentSettings(page, allEnabledSettings);

        await page.goto(`${tenantBaseUrl}/`);
        await expect(page.locator('html')).toHaveClass(/show--consent/, { timeout: 5000 });
        await page.locator('#cc-main button[data-role="all"]').click();
        await expect(page.locator('html')).not.toHaveClass(/show--consent/, { timeout: 3000 });

        // GA4 loader script and config script should both be injected
        await expect(page.locator('#cc-ga4'), 'GA4 loader script should be injected after analytics consent').toBeAttached();
        await expect(page.locator('#cc-ga4-config'), 'GA4 config script should be injected after analytics consent').toBeAttached();

        // Verify the measurement ID made it into the script
        const configText = await page.locator('#cc-ga4-config').evaluate((el) => el.textContent ?? '');
        expect(configText, 'GA4 config should reference the configured measurement ID').toContain('G-TESTGA4XXX');
    });

    test('accepting analytics consent loads GTM when GTM is enabled in settings', async ({ page, context }) => {
        await maskWebdriver(context);
        await context.clearCookies();
        await stubConsentSettings(page, allEnabledSettings);

        await page.goto(`${tenantBaseUrl}/`);
        await expect(page.locator('html')).toHaveClass(/show--consent/, { timeout: 5000 });
        await page.locator('#cc-main button[data-role="all"]').click();
        await expect(page.locator('html')).not.toHaveClass(/show--consent/, { timeout: 3000 });

        await expect(page.locator('#cc-gtm'), 'GTM script should be injected after analytics consent').toBeAttached();
        const gtmText = await page.locator('#cc-gtm').evaluate((el) => el.textContent ?? '');
        expect(gtmText, 'GTM script should reference the configured container ID').toContain('GTM-TESTXXX');
    });

    test('accepting analytics consent loads Clarity when Clarity is enabled in settings', async ({ page, context }) => {
        await maskWebdriver(context);
        await context.clearCookies();
        await stubConsentSettings(page, allEnabledSettings);

        await page.goto(`${tenantBaseUrl}/`);
        await expect(page.locator('html')).toHaveClass(/show--consent/, { timeout: 5000 });
        await page.locator('#cc-main button[data-role="all"]').click();
        await expect(page.locator('html')).not.toHaveClass(/show--consent/, { timeout: 3000 });

        await expect(page.locator('#cc-clarity'), 'Clarity script should be injected after analytics consent').toBeAttached();
        const clarityText = await page.locator('#cc-clarity').evaluate((el) => el.textContent ?? '');
        expect(clarityText, 'Clarity script should reference the configured project ID').toContain('claritytest');
    });

    test('accepting marketing consent loads Meta Pixel when Meta Pixel is enabled in settings', async ({ page, context }) => {
        await maskWebdriver(context);
        await context.clearCookies();
        await stubConsentSettings(page, allEnabledSettings);

        await page.goto(`${tenantBaseUrl}/`);
        await expect(page.locator('html')).toHaveClass(/show--consent/, { timeout: 5000 });
        await page.locator('#cc-main button[data-role="all"]').click();
        await expect(page.locator('html')).not.toHaveClass(/show--consent/, { timeout: 3000 });

        await expect(page.locator('#cc-meta-pixel'), 'Meta Pixel script should be injected after marketing consent').toBeAttached();
        const pixelText = await page.locator('#cc-meta-pixel').evaluate((el) => el.textContent ?? '');
        expect(pixelText, 'Meta Pixel script should reference the configured pixel ID').toContain('12345678');
    });

    test('rejecting all consent loads no analytics scripts even when all providers are enabled', async ({ page, context }) => {
        await maskWebdriver(context);
        await context.clearCookies();
        await stubConsentSettings(page, allEnabledSettings);

        await page.goto(`${tenantBaseUrl}/`);
        await expect(page.locator('html')).toHaveClass(/show--consent/, { timeout: 5000 });

        // Reject all
        await page.locator('#cc-main button[data-role="necessary"]').click();
        await expect(page.locator('html')).not.toHaveClass(/show--consent/, { timeout: 3000 });

        // Wait briefly for any async script injection that shouldn't happen
        await page.waitForTimeout(500);

        expect(await page.locator('#cc-ga4').count(), 'GA4 script must NOT be injected when consent is rejected').toBe(0);
        expect(await page.locator('#cc-gtm').count(), 'GTM script must NOT be injected when consent is rejected').toBe(0);
        expect(await page.locator('#cc-clarity').count(), 'Clarity script must NOT be injected when consent is rejected').toBe(0);
        expect(await page.locator('#cc-plausible').count(), 'Plausible script must NOT be injected when consent is rejected').toBe(0);
        expect(await page.locator('#cc-meta-pixel').count(), 'Meta Pixel script must NOT be injected when consent is rejected').toBe(0);
    });

    test('disabled providers are not loaded even when analytics consent is accepted', async ({ page, context }) => {
        await maskWebdriver(context);
        await context.clearCookies();

        // Only GA4 enabled, everything else disabled
        await stubConsentSettings(page, {
            ...allDisabledSettings,
            ga4_enabled: true,
            ga4_measurement_id: 'G-ONLYGA4',
        });

        await page.goto(`${tenantBaseUrl}/`);
        await expect(page.locator('html')).toHaveClass(/show--consent/, { timeout: 5000 });
        await page.locator('#cc-main button[data-role="all"]').click();
        await expect(page.locator('html')).not.toHaveClass(/show--consent/, { timeout: 3000 });

        await page.waitForTimeout(500);

        // GA4 should load
        await expect(page.locator('#cc-ga4'), 'GA4 should load when enabled').toBeAttached();

        // Everything else must not load
        expect(await page.locator('#cc-gtm').count(), 'GTM must NOT load when disabled in settings').toBe(0);
        expect(await page.locator('#cc-clarity').count(), 'Clarity must NOT load when disabled in settings').toBe(0);
        expect(await page.locator('#cc-plausible').count(), 'Plausible must NOT load when disabled in settings').toBe(0);
        expect(await page.locator('#cc-meta-pixel').count(), 'Meta Pixel must NOT load when disabled in settings').toBe(0);
    });

    test('revoking analytics consent removes previously injected scripts', async ({ page, context }) => {
        await maskWebdriver(context);
        await context.clearCookies();
        await stubConsentSettings(page, allEnabledSettings);

        // vanilla-cookieconsent binds click listeners to [data-cc] elements once at run() time
        // (direct element binding, not live delegation). Inject the trigger button via initScript
        // so it is in the DOM when run() executes its J(null, ...) query.
        await page.addInitScript(() => {
            document.addEventListener('DOMContentLoaded', () => {
                const btn = document.createElement('button');
                btn.id = '__cc-prefs-trigger';
                btn.setAttribute('data-cc', 'show-preferencesModal');
                btn.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:none;padding:0;';
                document.body.appendChild(btn);
            });
        });

        await page.goto(`${tenantBaseUrl}/`);
        await expect(page.locator('html')).toHaveClass(/show--consent/, { timeout: 5000 });

        // Accept all first
        await page.locator('#cc-main button[data-role="all"]').click();
        await expect(page.locator('html')).not.toHaveClass(/show--consent/, { timeout: 3000 });
        await expect(page.locator('#cc-ga4')).toBeAttached();

        // Trigger preferences modal via our pre-registered [data-cc] button
        await page.locator('#__cc-prefs-trigger').click({ force: true });

        // Wait for preferences modal
        await expect(page.locator('html')).toHaveClass(/show--preferences/, { timeout: 3000 });

        // Uncheck analytics toggle and save
        const analyticsToggle = page.locator('.section__toggle[value="analytics"]');
        await expect(analyticsToggle).toBeAttached({ timeout: 3000 });
        if (await analyticsToggle.isChecked()) {
            await analyticsToggle.click();
        }
        await page.locator('.pm button[data-role="save"]').click();

        // Wait for the onChange callback to fire and remove scripts
        await page.waitForTimeout(500);

        expect(
            await page.locator('#cc-ga4').count(),
            'GA4 script should be removed when analytics consent is revoked',
        ).toBe(0);
        expect(
            await page.locator('#cc-gtm').count(),
            'GTM script should be removed when analytics consent is revoked',
        ).toBe(0);
    });
});
