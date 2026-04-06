/**
 * Theme Lifecycle — End-to-End Spec
 *
 * Tests the full theme workflow from a clean state:
 *   1. Central admin creates two themes via the builder UI (exercises CSS generation pipeline)
 *   2. Both themes appear in the themes list
 *   3. Central admin activates Theme Alpha → storefront at / serves Theme Alpha's CSS via #theme-css
 *   4. Settings customization CSS is persisted to ThemeParts
 *   5. Central admin switches to Theme Beta → storefront at / switches to Theme Beta's CSS
 *   6. Central admin switches back to Theme Alpha → storefront reflects Alpha again
 *   7. All runtime errors captured during central lifecycle are zero
 *   8. Tenant owner activates Theme Alpha → tenant storefront at / serves its own #theme-css
 *   9. No runtime errors during tenant lifecycle
 *
 * Prerequisites for storefront assertions:
 *   - A published homepage (is_homepage=true) must exist so the server serves
 *     public-central.blade.php (with #theme-css) instead of welcome.blade.php.
 *   - The spec creates a throwaway homepage in beforeAll and deletes it in afterAll.
 *
 * Playwright is a real Chromium browser — the SPA JavaScript runs fully, every
 * fetch() call hits the real backend, and all server-side side-effects (DB writes,
 * file writes) are real. The network tab equivalent is page.on('request'/'response').
 */
import { test, expect, type Page } from '@playwright/test';
import { formatIssues } from './support/consoleGuards';
import { centralAdminCredentials, loginWithCredentials, tenantOwnerCredentials } from './support/auth';

type RuntimeIssue = { source: 'console' | 'pageerror' | 'requestfailed'; message: string };

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const centralBase = process.env.PLAYWRIGHT_BASE_URL ?? 'http://byteforge.se';
const tenantBase = process.env.PLAYWRIGHT_TENANT_BASE_URL ?? '';

// Minimum CSS file size we consider valid (bytes)
const MIN_CSS_BYTES = 200;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ThemeInfo = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  css_url?: string | null;
};

type ApiResponse<T> = { data: T; message?: string };
type PageRecord = { id: number; slug: string; title: string };
type PuckBlock = { type: string; props?: Record<string, unknown> };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Minimal Puck JSON used as the homepage body.
 * Passed to POST /pages (creation) and PUT /pages (recompile trigger).
 * The theme's header/footer ThemeParts are merged around this content by
 * PuckCompilerService, so changing the active theme changes the compiled output.
 */
const HOMEPAGE_PUCK_DATA = {
  content: [
    {
      type: 'Text',
      props: { id: 'e2e-home-body', content: 'E2E test homepage body', align: 'center' },
    },
  ],
  root: {},
  zones: {},
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Call any protected JSON API endpoint using the Bearer token stored by the SPA. */
async function apiFetch<T>(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<{ status: number; data: T }> {
  return await page.evaluate(
    async ({ method, path, body }) => {
      const token =
        window.localStorage.getItem('auth_token') ??
        window.sessionStorage.getItem('auth_token');

      if (!token) throw new Error('No auth_token in browser storage');

      const res = await fetch(path, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body != null ? JSON.stringify(body) : undefined,
      });

      const data = await res.json();
      return { status: res.status, data };
    },
    { method, path, body },
  );
}

/**
 * Create a system theme via the builder UI, generating variables CSS and publishing the master CSS file.
 * The beforeAll cleanup guarantees no prior test themes exist, so this always creates a fresh theme.
 */
async function createThemeViaUi(page: Page, name: string): Promise<ThemeInfo> {
  // Navigate to the theme builder (create mode — /dashboard/themes/new/builder)
  await page.goto(`${centralBase}/dashboard/themes/new/builder`);

  // Wait for the builder to fully load — the Save button is in the top bar
  await expect(page.getByRole('button', { name: /save/i }).first()).toBeVisible({ timeout: 15000 });

  // Fill the theme name (first textbox = name input on Info tab)
  await page.getByRole('textbox').first().fill(name);

  // Fill the description textarea (optional but good practice)
  const textarea = page.locator('textarea').first();
  if ((await textarea.count()) > 0) {
    await textarea.fill(`Playwright-created theme: ${name}`);
  }

  // Click Save — this triggers: create theme record + save variables CSS + publish master CSS
  await page.getByRole('button', { name: /save/i }).first().click();

  // After creation the builder navigates to /dashboard/themes/{id}/builder
  await page.waitForURL(/\/dashboard\/themes\/\d+\/builder/, { timeout: 30000 });

  const match = page.url().match(/themes\/(\d+)\/builder/);
  const themeId = Number(match?.[1]);
  expect(themeId, 'Expected valid theme ID in URL after creation').toBeGreaterThan(0);

  // The builder only saves the 'variables' section when no Puck content exists.
  // Publish requires variables + header + footer. Save stub sections so the
  // auto-publish in saveSection fires and writes the master {id}.css file.
  //
  // We embed a unique marker (pw-theme:<slug>) in the header section so that
  // subsequent tests can assert the CSS file content — not just the href — is
  // theme-specific. This catches bugs where switching themes changes the URL
  // but serves identical or stale CSS. The marker format matches theme.slug
  // (e.g. 'theme-alpha') so tests can construct it without extra state.
  const themeSlug = name.toLowerCase().replace(/\s+/g, '-');
  await apiFetch(page, 'POST', `${centralBase}/api/superadmin/themes/${themeId}/sections/header`, {
    // The sentinel comment gets merged verbatim into {id}.css by the publish step.
    css: `/* pw-theme:${themeSlug} id:${themeId} */\n.pw-header-${themeId} { --pw-marker: 1; }`,
  });
  // Footer section save triggers auto-publish (all 3 required sections now present).
  await apiFetch(page, 'POST', `${centralBase}/api/superadmin/themes/${themeId}/sections/footer`, {
    css: `/* pw-footer:${themeSlug} */\n.pw-footer-${themeId} { display: block; }`,
  });

  // Fetch full theme info from API
  const { data } = await apiFetch<ApiResponse<ThemeInfo>>(
    page,
    'GET',
    `${centralBase}/api/superadmin/themes/${themeId}`,
  );
  const theme = (data as ApiResponse<ThemeInfo>).data;
  expect(theme.id).toBe(themeId);
  return theme;
}

/** Save CSS section for a theme via API (exercises the customization endpoint). */
async function saveThemeSectionViaApi(
  page: Page,
  themeId: number,
  section: 'settings' | 'header' | 'footer',
  css: string,
  themeData?: Record<string, unknown>,
): Promise<void> {
  const { status } = await apiFetch(
    page,
    'POST',
    `${centralBase}/api/themes/${themeId}/customization/${section}`,
    { css, theme_data: themeData },
  );
  expect(status, `Save section "${section}" for theme ${themeId} should return 200`).toBe(200);
}

/**
 * Save real Puck JSON to a theme's header ThemePart so PuckCompilerService
 * merges it when compiling any page. Each theme gets a unique heading text
 * (\'Welcome from {name}\') and colour so we can assert content — not just
 * CSS href — changes when the active theme switches.
 *
 * Must be called AFTER the theme has been activated (activation creates the
 * blank ThemeParts that the customization endpoint writes into).
 */
async function saveHeaderPuckData(page: Page, themeId: number, themeName: string): Promise<void> {
  const headingColor = themeName.toLowerCase().includes('alpha') ? '#1a56db' : '#dc2626';
  const puckData = {
    content: [
      {
        type: 'Heading',
        props: {
          id: `pw-h1-${themeId}`,
          text: `Welcome from ${themeName}`,
          level: '1',
          color: { type: 'custom', value: headingColor },
        },
      },
      {
        type: 'Text',
        props: {
          id: `pw-body-${themeId}`,
          content: `Powered by ${themeName}`,
          align: 'center',
        },
      },
    ],
    root: {},
    zones: {},
  };
  const { status } = await apiFetch(
    page,
    'POST',
    `${centralBase}/api/themes/${themeId}/customization/header`,
    { puck_data: puckData },
  );
  expect(
    status,
    `saveHeaderPuckData: POST customization/header for theme ${themeId} should return 200`,
  ).toBe(200);
}

/**
 * Force-recompile a page (PUT with puck_data so the backend triggers compilePage),
 * then return the compiled content array.
 *
 * Also logs the compiled content to stdout so the theme-switch diff is visible in
 * the Playwright reporter output — the \"terminal\" view the user asked for.
 */
async function recompileAndInspect(
  page: Page,
  pageId: number,
  label: string,
): Promise<PuckBlock[]> {
  const resp = await apiFetch<{ data: { puck_data_compiled?: { content?: PuckBlock[] } } }>(
    page,
    'PUT',
    `${centralBase}/api/superadmin/pages/${pageId}`,
    // Pass puck_data so the backend sets isset($validated['puck_data']) = true
    // and therefore runs compilePage() even though the page is already published.
    { puck_data: HOMEPAGE_PUCK_DATA },
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const compiled = (resp.data as any).data?.puck_data_compiled;
  const content: PuckBlock[] = compiled?.content ?? [];
  // Print to terminal: one line per block so the diff between switches is easy to read.
  console.log(`\n[PUCK COMPILED — ${label}] ${content.length} block(s):`);
  content.forEach((b, i) => {
    const text = (b.props?.text ?? b.props?.content ?? '') as string;
    console.log(`  [${i}] ${b.type}: ${JSON.stringify(text)}`);
  });
  return content;
}

/** Navigate to the central themes list and activate a theme by clicking through the confirmation modal. */
async function activateThemeViaUi(page: Page, slug: string, name: string): Promise<void> {
  await page.goto(`${centralBase}/dashboard/themes`);
  // Wait for page to finish loading: the Create Theme button is always present once loaded
  await expect(
    page.getByRole('button', { name: /create theme|create your first theme/i }).first(),
  ).toBeVisible({ timeout: 10000 });

  // Pick the card that (a) contains the name AND (b) has an Activate button.
  // This avoids grabbing a duplicate card that is already active (shows Customize).
  const card = page.locator('.grid .p-4')
    .filter({ hasText: name })
    .filter({ has: page.getByRole('button', { name: /^activate$|^aktivera$|^\u062a\u0641\u0639\u064a\u0644$/i }) })
    .first();

  // If the theme is already active there will be no Activate button — bail early.
  const hasActivateBtn = await card.count();
  if (hasActivateBtn === 0) {
    // Confirm it truly is active (Customize button visible) and return.
    const activeCard = page.locator('.grid .p-4').filter({ hasText: name }).first();
    await expect(activeCard.getByText(/active|aktiv|\u0646\u0634\u0637/i)).toBeVisible({ timeout: 5000 });
    return;
  }

  await expect(card).toBeVisible({ timeout: 5000 });

  const activateBtn = card.getByRole('button', { name: /activate|aktivera|\u062a\u0641\u0639\u064a\u0644/i });
  await expect(activateBtn).toBeVisible();
  await activateBtn.click();

  // Confirmation dialog appears
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  // Confirm button is disabled during countdown — wait for it to become enabled
  const confirmBtn = dialog.getByRole('button', { name: /switch|byt|\u062a\u063a\u064a\u064a\u0631/i });
  await expect(confirmBtn).toBeDisabled();
  await expect(confirmBtn).toBeEnabled({ timeout: 7000 });
  await confirmBtn.click();

  // Wait for the active badge to appear — re-locate the card WITHOUT the Activate-button
  // filter because that button disappears after activation and would make the locator stale.
  const activatedCard = page.locator('.grid .p-4').filter({ hasText: name }).first();
  await expect(activatedCard.getByText(/active|aktiv|\u0646\u0634\u0637/i)).toBeVisible({ timeout: 10000 });
}

/** Navigate to the tenant themes list and activate a theme via the UI. */
async function activateTenantThemeViaUi(page: Page, slug: string, name: string): Promise<void> {
  await page.goto(`${tenantBase}/cms/themes`);
  await expect(page.locator('.grid')).toBeVisible({ timeout: 10000 });

  const card = page.locator('div.rounded-lg.border.p-3').filter({ has: page.getByRole('heading', { name, exact: true }) }).first();
  await expect(card).toBeVisible({ timeout: 5000 });

  const activateBtn = card.getByRole('button', { name: /activate|aktivera|تفعيل/i });
  await expect(activateBtn).toBeVisible();
  await activateBtn.click();

  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  const confirmBtn = dialog.getByRole('button', { name: /switch|byt|تغيير/i });
  await expect(confirmBtn).toBeDisabled();
  await expect(confirmBtn).toBeEnabled({ timeout: 7000 });
  await confirmBtn.click();

  await expect(card.getByText(/active|aktiv|نشط/i)).toBeVisible({ timeout: 10000 });
}

/**
 * Fetch the active theme's CSS URL from the API and verify the CSS file exists.
 * Returns the CSS URL and text for further assertions.
 */
async function assertActiveCssByApi(
  page: Page,
  activeApiUrl: string,
): Promise<{ href: string; cssText: string }> {
  const { data } = await apiFetch<ApiResponse<ThemeInfo & { css_url?: string }>>(
    page,
    'GET',
    activeApiUrl,
  );
  const themeData = (data as ApiResponse<ThemeInfo & { css_url?: string }>).data;
  const cssUrl = themeData?.css_url;
  expect(cssUrl, 'Active theme should have a css_url').toBeTruthy();

  const cssResponse = await page.request.get(cssUrl!);
  expect(cssResponse.ok(), `CSS file at ${cssUrl} should be accessible`).toBeTruthy();

  const cssText = await cssResponse.text();
  expect(cssText.length, `CSS file should be at least ${MIN_CSS_BYTES} bytes`).toBeGreaterThan(MIN_CSS_BYTES);

  return { href: cssUrl!, cssText };
}

/**
 * Visit a storefront URL and assert it serves a valid #theme-css link.
 * Returns the CSS file text so callers can do further assertions.
 */
async function assertStorefrontCss(
  page: Page,
  storefrontUrl: string,
): Promise<{ href: string; cssText: string }> {
  await page.goto(storefrontUrl);
  // Wait for the page to at least have a document body
  await page.waitForLoadState('domcontentloaded');
  // Wait for public app to mount if it exists (tenant storefront always has it)
  const publicApp = page.locator('#public-app');
  const hasPublicApp = await publicApp.count().then((n) => n > 0);
  if (hasPublicApp) {
    await expect(publicApp).toBeAttached({ timeout: 10000 });
  }

  const themeCssLink = page.locator('#theme-css');
  await expect(themeCssLink, `#theme-css link should be present on ${storefrontUrl}`).toBeAttached({
    timeout: 10000,
  });

  const href = await themeCssLink.getAttribute('href');
  expect(href, '#theme-css href should not be empty').toBeTruthy();

  const cssResponse = await page.request.get(href!);
  expect(cssResponse.ok(), `CSS file at ${href} should be accessible`).toBeTruthy();

  const cssText = await cssResponse.text();
  expect(cssText.length, `CSS file should be at least ${MIN_CSS_BYTES} bytes`).toBeGreaterThan(MIN_CSS_BYTES);

  return { href: href!, cssText };
}

/**
 * Ensure a published «is_homepage» page exists for the current API scope.
 * Any leftover page from a previous run (same slug) is deleted first.
 * Returns the new page ID so the caller can clean up in afterAll.
 */
async function ensureHomepage(
  page: Page,
  listUrl: string,
  createUrl: string,
): Promise<number> {
  const SLUG = 'playwright-e2e-home';

  // Delete any leftover from a previous run
  const listResp = await apiFetch<{ data: PageRecord[]; meta: unknown }>(page, 'GET', listUrl);
  const existing: PageRecord[] = (listResp.data as { data: PageRecord[] }).data ?? [];
  for (const p of existing.filter((p) => p.slug === SLUG)) {
    await apiFetch(page, 'DELETE', `${createUrl}/${p.id}`);
  }

  // Create a fresh published homepage with basic Puck content.
  // Including puck_data triggers compilePage() in the backend so puck_data_compiled
  // is populated immediately — and later PUT recompile calls have a valid baseline.
  const resp = await apiFetch<{ data: PageRecord }>(
    page,
    'POST',
    createUrl,
    {
      title: 'Playwright E2E Home',
      slug: SLUG,
      page_type: 'home',
      status: 'published',
      is_homepage: true,
      puck_data: HOMEPAGE_PUCK_DATA,
    },
  );
  const created = (resp.data as { data: PageRecord }).data;
  expect(created.id, 'Homepage creation should return a valid page ID').toBeGreaterThan(0);
  return created.id;
}

// ---------------------------------------------------------------------------
// Tests — all run serially, sharing one browser page so auth token persists
// ---------------------------------------------------------------------------

test.describe.configure({ mode: 'serial' });

test.describe('Theme Lifecycle — Central App', () => {
  let themeAlpha: ThemeInfo;
  let themeBeta: ThemeInfo;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sharedPage: any; // Page — kept across tests so localStorage auth token persists
  let centralHomepageId = 0;  // ID of the temporary homepage created in beforeAll
  const issues: RuntimeIssue[] = [];

  test.beforeAll(async ({ browser }) => {
    // Create one persistent browser context + page for the entire describe block.
    // This keeps the auth token (stored in localStorage by the SPA) alive so every
    // subsequent apiFetch() call is authenticated without re-logging in.
    const context = await browser.newContext();
    sharedPage = await context.newPage();

    sharedPage.on('console', (msg: { type: () => string; text: () => string }) => {
      const text = msg.text();
      // Browser-generated "Failed to load resource" messages are HTTP-level noise captured
      // even when the calling code handles the response gracefully. Filter them out so only
      // genuine JS-level console.error calls are tracked.
      if (msg.type() === 'error' && !text.startsWith('Failed to load resource')) {
        issues.push({ source: 'console', message: text });
      }
    });
    sharedPage.on('pageerror', (err: Error) => {
      issues.push({ source: 'pageerror', message: err.message });
    });
    await sharedPage.goto(`${centralBase}/login`);
    await loginWithCredentials(sharedPage, centralAdminCredentials);
    await expect(sharedPage).toHaveURL(/\/dashboard(\/|$)/, { timeout: 15000 });

    // Clean up all test themes (alpha/beta slugs) from previous runs.
    // If any is currently active we cannot delete it directly — first activate a safe
    // placeholder theme, then delete all test themes cleanly.
    const listResp = await apiFetch<ApiResponse<ThemeInfo[]>>(
      sharedPage,
      'GET',
      `${centralBase}/api/superadmin/themes`,
    );
    const allThemes = (listResp.data as ApiResponse<ThemeInfo[]>).data ?? [];
    const testThemes = allThemes.filter((t) => /^theme-(alpha|beta)/i.test(t.slug));

    if (testThemes.length > 0) {
      const activeTestTheme = testThemes.find((t) => t.is_active);

      if (activeTestTheme) {
        // Need to activate something else so we can delete the currently active test theme.
        let safeSlug = allThemes.find((t) => !/^theme-(alpha|beta)/i.test(t.slug))?.slug;

        if (!safeSlug) {
          // No non-test themes exist — create a throwaway placeholder via API.
          const tmpResp = await apiFetch<ApiResponse<ThemeInfo>>(
            sharedPage,
            'POST',
            `${centralBase}/api/superadmin/themes`,
            { name: '__playwright_tmp__', is_system_theme: true },
          );
          safeSlug = (tmpResp.data as ApiResponse<ThemeInfo>).data?.slug;
        }

        if (safeSlug) {
          await apiFetch(sharedPage, 'POST', `${centralBase}/api/superadmin/themes/activate`, {
            slug: safeSlug,
          });
        }
      }

      // Delete all test themes (they are now non-active).
      for (const t of testThemes) {
        await apiFetch(sharedPage, 'DELETE', `${centralBase}/api/superadmin/themes/${t.id}`);
      }
    }

    // Ensure a published homepage exists so public-central.blade.php (with #theme-css) is served
    // when visiting the central storefront at /. Without it the server returns welcome.blade.php.
    centralHomepageId = await ensureHomepage(
      sharedPage,
      `${centralBase}/api/superadmin/pages`,
      `${centralBase}/api/superadmin/pages`,
    );
  });

  test.afterAll(async () => {
    // Clean up the temporary homepage so the central / reverts to welcome.blade.php.
    if (centralHomepageId > 0) {
      await apiFetch(sharedPage, 'DELETE', `${centralBase}/api/superadmin/pages/${centralHomepageId}`);
    }
    await sharedPage?.close();
  });

  test('create Theme Alpha and Theme Beta via builder UI', async () => {
    themeAlpha = await createThemeViaUi(sharedPage, 'Theme Alpha');
    themeBeta = await createThemeViaUi(sharedPage, 'Theme Beta');

    expect(themeAlpha.id).not.toBe(themeBeta.id);
    expect(themeAlpha.slug).toMatch(/theme-alpha/);
    expect(themeBeta.slug).toMatch(/theme-beta/);
  });

  test('both themes appear in the themes list UI', async () => {
    await sharedPage.goto(`${centralBase}/dashboard/themes`);
    // Wait for page to finish loading — Create Theme button is always present
    await expect(
      sharedPage.getByRole('button', { name: /create theme|create your first theme/i }).first(),
    ).toBeVisible({ timeout: 10000 });

    // Use first() to avoid strict-mode failure if somehow duplicates exist
    await expect(sharedPage.getByRole('heading', { name: 'Theme Alpha' }).first()).toBeVisible();
    await expect(sharedPage.getByRole('heading', { name: 'Theme Beta' }).first()).toBeVisible();
  });

  test('activate Theme Alpha via UI and confirm storefront CSS', async () => {
    await activateThemeViaUi(sharedPage, themeAlpha.slug, themeAlpha.name);

    // API sanity-check: active theme model reports a valid CSS URL for Theme Alpha.
    const { href: apiHref } = await assertActiveCssByApi(sharedPage, `${centralBase}/api/superadmin/themes/active`);
    expect(apiHref).toContain(`themes/${themeAlpha.id}/`);

    // Storefront check: public-central.blade.php injects #theme-css.
    // We check both the href (correct file) AND the file content (unique theme marker)
    // to confirm the full publish pipeline ran and the right content was written to disk.
    const { href: storefrontHref, cssText: alphaCss } = await assertStorefrontCss(sharedPage, `${centralBase}/`);
    expect(storefrontHref).toContain(`themes/${themeAlpha.id}/`);
    expect(
      alphaCss,
      'Published CSS must contain Theme Alpha marker — verifies variables+header+footer were merged into the master file',
    ).toContain(`pw-theme:${themeAlpha.slug}`);

    // --- Puck content check ---
    // Now that Alpha is active, its ThemeParts exist. Save real Puck JSON (Heading + Text)
    // to Alpha's header ThemePart, then force-recompile the homepage so PuckCompilerService
    // merges Alpha's header content into puck_data_compiled. The compiled content is printed
    // to the terminal and asserted — proving it's the Alpha blocks, not some stale/wrong theme.
    await saveHeaderPuckData(sharedPage, themeAlpha.id, themeAlpha.name);
    const alphaContent = await recompileAndInspect(sharedPage, centralHomepageId, 'Alpha active');
    const alphaHeading = alphaContent.find(
      (b) => b.type === 'Heading' && (b.props?.text as string)?.includes('Theme Alpha'),
    );
    expect(alphaHeading, 'Compiled page must include "Welcome from Theme Alpha" Heading block').toBeTruthy();
  });

  test('save settings CSS for Theme Alpha and verify it was persisted', async () => {
    const customCss = `/* playwright-test-alpha */ .pw-test-alpha { color: #1a56db; }`;
    await saveThemeSectionViaApi(sharedPage, themeAlpha.id, 'settings', customCss);

    // Verify the customization CSS was persisted by reading it back via the GET endpoint.
    // Customization CSS lives in ThemeParts (DB) and is injected dynamically by the SPA;
    // it is NOT merged into the static published CSS file.
    const { data } = await apiFetch<{ data: { settings_css?: string } }>(
      sharedPage,
      'GET',
      `${centralBase}/api/themes/${themeAlpha.id}/customization`,
    );
    const savedCss = (data as { data: { settings_css?: string } }).data?.settings_css ?? '';
    expect(savedCss).toContain('pw-test-alpha');
  });

  test('switch to Theme Beta via UI — storefront serves Beta CSS, Alpha CSS is gone', async () => {
    await activateThemeViaUi(sharedPage, themeBeta.slug, themeBeta.name);

    // The blade template re-renders every request with the newly-active theme.
    // Checking href + content ensures both the file pointer AND the file payload changed.
    const { href: betaHref, cssText: betaCss } = await assertStorefrontCss(sharedPage, `${centralBase}/`);
    expect(betaHref).toContain(`themes/${themeBeta.id}/`);
    expect(
      betaCss,
      'Storefront CSS must contain Theme Beta marker after switching to Beta',
    ).toContain(`pw-theme:${themeBeta.slug}`);
    expect(
      betaCss,
      'Storefront must no longer serve Theme Alpha content after switching to Beta',
    ).not.toContain(`pw-theme:${themeAlpha.slug}`);

    // --- Puck content check ---
    // Beta is now active → its ThemeParts were created by activation. Save Beta's Puck JSON
    // then recompile and print. The compiled content must have Beta's heading and NOT Alpha's.
    await saveHeaderPuckData(sharedPage, themeBeta.id, themeBeta.name);
    const betaContent = await recompileAndInspect(sharedPage, centralHomepageId, 'Beta active');
    const betaHeading = betaContent.find(
      (b) => b.type === 'Heading' && (b.props?.text as string)?.includes('Theme Beta'),
    );
    const alphaHeadingGone = !betaContent.find(
      (b) => b.type === 'Heading' && (b.props?.text as string)?.includes('Theme Alpha'),
    );
    expect(betaHeading, 'Compiled page must include "Welcome from Theme Beta" Heading block').toBeTruthy();
    expect(alphaHeadingGone, 'Alpha Heading must be absent from compiled content after switching to Beta').toBeTruthy();
  });

  test('switch back to Theme Alpha — storefront serves Alpha CSS, Beta CSS is gone', async () => {
    await activateThemeViaUi(sharedPage, themeAlpha.slug, themeAlpha.name);
    const { href, cssText } = await assertStorefrontCss(sharedPage, `${centralBase}/`);
    expect(href).toContain(`themes/${themeAlpha.id}/`);
    expect(
      cssText,
      'Storefront CSS must contain Theme Alpha marker after switching back',
    ).toContain(`pw-theme:${themeAlpha.slug}`);
    expect(
      cssText,
      'Storefront must no longer serve Theme Beta content after switching back to Alpha',
    ).not.toContain(`pw-theme:${themeBeta.slug}`);

    // --- Puck content check ---
    // Alpha's header puck_data was saved in test 3 — no need to re-post.
    // Just recompile and print; the compiled content must be Alpha's blocks again.
    const alphaContent = await recompileAndInspect(sharedPage, centralHomepageId, 'Alpha restored');
    const alphaHeading = alphaContent.find(
      (b) => b.type === 'Heading' && (b.props?.text as string)?.includes('Theme Alpha'),
    );
    const betaHeadingGone = !alphaContent.find(
      (b) => b.type === 'Heading' && (b.props?.text as string)?.includes('Theme Beta'),
    );
    expect(alphaHeading, 'Compiled page must include "Welcome from Theme Alpha" Heading block after switching back').toBeTruthy();
    expect(betaHeadingGone, 'Beta Heading must be absent from compiled content after switching back to Alpha').toBeTruthy();
  });

  test('no runtime errors during central lifecycle', () => {
    expect(issues, `Runtime issues in central lifecycle:\n${formatIssues(issues)}`).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Tenant lifecycle — only runs if PLAYWRIGHT_TENANT_BASE_URL is set
// ---------------------------------------------------------------------------

test.describe('Theme Lifecycle — Tenant App', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sharedPage: any;
  let tenantHomepageId = 0;
  const tenantIssues: RuntimeIssue[] = [];

  test.beforeAll(async ({ browser }) => {
    if (!tenantBase) return; // skip setup if no tenant URL

    const context = await browser.newContext();
    sharedPage = await context.newPage();

    sharedPage.on('console', (msg: { type: () => string; text: () => string }) => {
      const text = msg.text();
      // Filter browser-generated HTTP-level noise so only real JS errors are tracked.
      if (msg.type() === 'error' && !text.startsWith('Failed to load resource')) {
        tenantIssues.push({ source: 'console', message: text });
      }
    });
    sharedPage.on('pageerror', (err: Error) => {
      tenantIssues.push({ source: 'pageerror', message: err.message });
    });

    await sharedPage.goto(`${tenantBase}/login`);
    await loginWithCredentials(sharedPage, tenantOwnerCredentials);
    await expect(sharedPage).toHaveURL(new RegExp(`${tenantBase}/cms(/|$)`), { timeout: 15000 });

    // Create a published homepage so the tenant storefront SPA renders page content
    // (tenant / always serves public-tenant.blade.php with #theme-css regardless,
    //  but having a real homepage exercises the full rendering pipeline).
    tenantHomepageId = await ensureHomepage(
      sharedPage,
      `${tenantBase}/api/pages`,
      `${tenantBase}/api/pages`,
    );
  });

  test.afterAll(async () => {
    if (tenantHomepageId > 0) {
      await apiFetch(sharedPage, 'DELETE', `${tenantBase}/api/pages/${tenantHomepageId}`);
    }
    await sharedPage?.close();
  });

  test('tenant themes list shows system themes available for activation', async () => {
    test.skip(!tenantBase, 'Set PLAYWRIGHT_TENANT_BASE_URL to run tenant lifecycle tests.');

    await sharedPage.goto(`${tenantBase}/cms/themes`);
    await expect(sharedPage.locator('.grid, [class*="rounded-lg border"]')).toBeVisible({ timeout: 10000 });

    const activateBtns = sharedPage.getByRole('button', { name: /activate|aktivera|تفعيل/i });
    await expect(activateBtns.first()).toBeVisible({ timeout: 5000 });
  });

  test('tenant owner activates Theme Alpha via UI and storefront gets its own CSS', async () => {
    test.skip(!tenantBase, 'Set PLAYWRIGHT_TENANT_BASE_URL to run tenant lifecycle tests.');

    // Fetch available themes via API to find Theme Alpha's slug
    const tenantThemesResp = await apiFetch<ApiResponse<ThemeInfo[]>>(
      sharedPage,
      'GET',
      `${tenantBase}/api/themes`,
    );
    const available = (tenantThemesResp.data as ApiResponse<ThemeInfo[]>).data;
    const alpha = available?.find((t) => t.slug.includes('theme-alpha'));

    test.skip(!alpha, 'Theme Alpha not visible in tenant themes — run central lifecycle first.');

    await activateTenantThemeViaUi(sharedPage, alpha!.slug, alpha!.name);

    const { href } = await assertStorefrontCss(sharedPage, `${tenantBase}/`);
    expect(href).toMatch(/\/storage\/themes\/\d+\//);
  });

  test('no runtime errors during tenant lifecycle', () => {
    test.skip(!tenantBase, 'Set PLAYWRIGHT_TENANT_BASE_URL to run tenant lifecycle tests.');
    expect(tenantIssues, `Runtime issues in tenant lifecycle:\n${formatIssues(tenantIssues)}`).toEqual([]);
  });
});
