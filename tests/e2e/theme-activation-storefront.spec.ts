import { execFileSync } from 'node:child_process';
import { test, expect, type Page } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';
import { withExclusiveLock } from './support/exclusiveLock';
import { centralAdminCredentials, submitLoginAndCaptureToken, tenantOwnerCredentials } from './support/auth';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

type ThemeInfo = {
  id: number;
  name: string;
  slug: string;
  is_active?: boolean;
};

type PageRecord = {
  id: number;
  slug: string;
  title: string;
  is_homepage: boolean;
};

const STOREFRONT_HOME_PUCK_DATA = {
  content: [
    {
      type: 'Text',
      props: { id: 'theme-activation-home', content: 'Theme activation storefront home' },
    },
  ],
  root: {},
  zones: {},
};

function themeCard(page: Page, themeName: string) {
  return page.locator('div.rounded-lg.border.p-3, .grid .p-4').filter({ hasText: themeName }).first();
}

async function fetchThemesInBrowser(page: Page, endpoint: string, token: string): Promise<ThemeInfo[]> {
  const response = await page.request.get(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok()) {
    throw new Error(`Theme fetch failed: ${response.status()}`);
  }

  const payload = await response.json() as { data: ThemeInfo[] };
  return payload.data;
}

async function resolveStorefrontUrl(
  page: Page,
  pagesEndpoint: string,
  token: string,
  baseUrl = '',
): Promise<{ url: string; cleanupPageId?: number }> {
  const response = await page.request.get(pagesEndpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    params: {
      status: 'published',
      per_page: 100,
    },
  });

  if (!response.ok()) {
    throw new Error(`Published pages fetch failed: ${response.status()}`);
  }

  const payload = await response.json() as { data: PageRecord[] };
  const pages = payload.data ?? [];
  const homepage = pages.find((record) => record.is_homepage);

  if (homepage) {
    return { url: baseUrl ? `${baseUrl}/` : '/' };
  }

  const fallbackPage = pages[0];
  if (fallbackPage) {
    return { url: baseUrl ? `${baseUrl}/pages/${fallbackPage.slug}` : `/pages/${fallbackPage.slug}` };
  }

  const slug = `playwright-theme-storefront-home-${Date.now()}`;
  const createResponse = await page.request.post(pagesEndpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    data: {
      title: 'Playwright Theme Storefront Home',
      slug,
      page_type: 'home',
      status: 'published',
      is_homepage: true,
      puck_data: STOREFRONT_HOME_PUCK_DATA,
    },
  });

  if (!createResponse.ok()) {
    throw new Error(`Theme activation test requires at least one published storefront page. Homepage creation failed with ${createResponse.status()}.`);
  }

  const createdPayload = await createResponse.json() as { data: PageRecord };

  return {
    url: baseUrl ? `${baseUrl}/` : '/',
    cleanupPageId: createdPayload.data.id,
  };
}

async function deletePageIfNeeded(page: Page, pagesEndpoint: string, pageId: number | undefined, token: string): Promise<void> {
  if (!pageId) {
    return;
  }

  void page;
  void pagesEndpoint;
  void token;

  const script = [
    "require 'vendor/autoload.php';",
    "$app = require 'bootstrap/app.php';",
    "$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);",
    '$kernel->bootstrap();',
    '$pageId = (int) $argv[1];',
    'Illuminate\\Support\\Facades\\DB::table("pages")->where("id", $pageId)->delete();',
    'echo "ok";',
  ].join(' ');

  execFileSync('php', ['-r', script, '--', String(pageId)], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

async function getThemeCssText(page: Page, storefrontUrl: string): Promise<{ href: string; cssText: string }> {
  await page.goto(storefrontUrl);
  await expect(page.locator('#public-app')).toBeAttached();

  const href = await page.locator('#theme-css').getAttribute('href');
  expect(href, 'Storefront should render a theme CSS link').toBeTruthy();

  const response = await page.request.get(href!);
  expect(response.ok(), `Theme CSS should load successfully from ${href}`).toBeTruthy();

  const cssText = await response.text();
  expect(cssText.length, 'Theme CSS should not be empty').toBeGreaterThan(500);

  return { href: href!, cssText };
}

async function waitForActivationConfirmationAndConfirm(page: Page): Promise<void> {
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  const confirmButton = dialog.getByRole('button', { name: /switch|byt|تغيير/i });
  await expect(confirmButton).toBeDisabled();
  await expect(confirmButton).toBeEnabled({ timeout: 7000 });
  await confirmButton.click();
}

async function activateThemeFromList(page: Page, theme: ThemeInfo): Promise<void> {
  const card = themeCard(page, theme.name);
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: /activate|aktivera|تفعيل/i }).click();
  await waitForActivationConfirmationAndConfirm(page);
}

async function saveCustomizer(page: Page): Promise<void> {
  const saveButton = page.getByRole('button', { name: /save|spara|حفظ/i }).last();
  await expect(saveButton).toBeVisible();
  await saveButton.click();
  await expect(saveButton).toBeEnabled({ timeout: 10000 });
}

test.describe.configure({ mode: 'serial' });

test('tenant theme activation and customize keep storefront CSS and rules intact', async ({ page }) => {
  test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable tenant-domain theme activation test.');
  test.slow();

  await withExclusiveLock('tenant-storefront-suite', async () => {
    const issues = attachRuntimeGuards(page);

    await page.goto(`${tenantBaseUrl}/login`);
    const tenantToken = await submitLoginAndCaptureToken(page, tenantOwnerCredentials);
    await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/cms(/|$)`));

    await page.goto(`${tenantBaseUrl}/cms/themes`);

    const tenantThemes = await fetchThemesInBrowser(page, `${tenantBaseUrl}/api/themes`, tenantToken);
    const storefrontTarget = await resolveStorefrontUrl(page, `${tenantBaseUrl}/api/pages`, tenantToken, tenantBaseUrl);
    const originalTheme = tenantThemes.find((theme) => theme.is_active) ?? null;
    const targetTheme = tenantThemes.find((theme) => !theme.is_active) ?? null;

    test.skip(!originalTheme || !targetTheme, 'Need at least one active theme and one inactive theme for tenant test.');
    try {
      await activateThemeFromList(page, targetTheme!);
      const activeTenantCard = themeCard(page, targetTheme!.name);
      const activeTenantCustomizeButton = activeTenantCard.getByRole('button', { name: /customize|anpassa|تخصيص/i });
      await expect(activeTenantCustomizeButton).toBeVisible({ timeout: 10000 });

      const activatedCss = await getThemeCssText(page, storefrontTarget.url);

      await page.goto(`${tenantBaseUrl}/cms/themes`);
      await activeTenantCustomizeButton.click();
      await saveCustomizer(page);

      const savedCss = await getThemeCssText(page, storefrontTarget.url);
      expect(savedCss.cssText.length).toBeGreaterThan(500);
      expect(savedCss.href).toMatch(/\/storage\/themes\/\d+\//);

      await page.goto(`${tenantBaseUrl}/cms/themes`);
      await activateThemeFromList(page, originalTheme!);
      await getThemeCssText(page, storefrontTarget.url);

      expect(activatedCss.href).toMatch(/\/storage\/themes\/\d+\//);
      expect(issues, `Runtime issues detected in tenant theme activation flow:\n${formatIssues(issues)}`).toEqual([]);
    } finally {
      await deletePageIfNeeded(page, `${tenantBaseUrl}/api/pages`, storefrontTarget.cleanupPageId, tenantToken);
    }
  });
});

test('central theme activation and customize keep storefront CSS and rules intact', async ({ page }) => {
  test.setTimeout(120000);

  await withExclusiveLock('central-theme-suite', async () => {
    const issues = attachRuntimeGuards(page);

    await page.goto('/login');
    const centralToken = await submitLoginAndCaptureToken(page, centralAdminCredentials);
    await expect(page).toHaveURL(/\/dashboard(\/|$)/);

    await page.goto('/dashboard/themes');

    const centralThemes = await fetchThemesInBrowser(page, '/api/superadmin/themes', centralToken);
    const storefrontTarget = await resolveStorefrontUrl(page, '/api/superadmin/pages', centralToken);
    const originalTheme = centralThemes.find((theme) => theme.is_active) ?? null;
    const targetTheme = centralThemes.find((theme) => !theme.is_active) ?? null;

    test.skip(!originalTheme || !targetTheme, 'Need at least one active theme and one inactive theme for central test.');
    try {
      const targetCard = page.locator('.grid .p-4').filter({ hasText: targetTheme!.name }).first();
      await expect(targetCard).toBeVisible();
      await targetCard.getByRole('button', { name: /activate|aktivera|تفعيل/i }).click();
      await waitForActivationConfirmationAndConfirm(page);
      const activeCentralCustomizeButton = targetCard.getByRole('button', { name: /customize|anpassa|تخصيص/i });
      await expect(activeCentralCustomizeButton).toBeVisible({ timeout: 10000 });

      const activatedCss = await getThemeCssText(page, storefrontTarget.url);

      await page.goto('/dashboard/themes');
      await activeCentralCustomizeButton.click();
      await saveCustomizer(page);

      const savedCss = await getThemeCssText(page, storefrontTarget.url);
      expect(savedCss.cssText.length).toBeGreaterThan(500);
      expect(savedCss.href).toMatch(/\/storage\/themes\/\d+\//);

      await page.goto('/dashboard/themes');
      const originalCard = page.locator('.grid .p-4').filter({ hasText: originalTheme!.name }).first();
      await expect(originalCard).toBeVisible();
      await originalCard.getByRole('button', { name: /activate|aktivera|تفعيل/i }).click();
      await waitForActivationConfirmationAndConfirm(page);
      await getThemeCssText(page, storefrontTarget.url);

      expect(activatedCss.href).toMatch(/\/storage\/themes\/\d+\//);
      expect(issues, `Runtime issues detected in central theme activation flow:\n${formatIssues(issues)}`).toEqual([]);
    } finally {
      await deletePageIfNeeded(page, '/api/superadmin/pages', storefrontTarget.cleanupPageId, centralToken);
    }
  });
});
