import { test, expect, type Page } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';
import { centralAdminCredentials, submitLoginAndCaptureToken, tenantOwnerCredentials } from './support/auth';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

type ThemeInfo = {
  id: number;
  name: string;
  slug: string;
  is_active?: boolean;
};

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

async function getThemeCssText(page: Page, storefrontUrl: string): Promise<{ href: string; cssText: string }> {
  await page.goto(storefrontUrl);
  await expect(page.locator('#public-app')).toBeAttached();

  const href = await page.locator('#theme-css').getAttribute('href');
  expect(href, 'Storefront should render a theme CSS link').toBeTruthy();

  const response = await page.request.get(href!);
  expect(response.ok(), `Theme CSS should load successfully from ${href}`).toBeTruthy();

  const cssText = await response.text();
  expect(cssText.length, 'Theme CSS should not be empty').toBeGreaterThan(500);
  expect(
    /(\.box-Box-|\.nav-menu-|\.heading-Heading-|\.button-)/.test(cssText),
    'Theme CSS should contain component class rules',
  ).toBeTruthy();

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
  const card = page.locator('div.rounded-lg.border.p-3, .grid .p-4').filter({ hasText: theme.name }).first();
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

  const issues = attachRuntimeGuards(page);

  await page.goto(`${tenantBaseUrl}/login`);
  const tenantToken = await submitLoginAndCaptureToken(page, tenantOwnerCredentials);
  await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/cms(/|$)`));

  await page.goto(`${tenantBaseUrl}/cms/themes`);

  const tenantThemes = await fetchThemesInBrowser(page, `${tenantBaseUrl}/api/themes`, tenantToken);
  const originalTheme = tenantThemes.find((theme) => theme.is_active) ?? null;
  const targetTheme = tenantThemes.find((theme) => !theme.is_active) ?? null;

  test.skip(!originalTheme || !targetTheme, 'Need at least one active theme and one inactive theme for tenant test.');
  await activateThemeFromList(page, targetTheme!);
  const activeTenantCard = page.locator('div.rounded-lg.border.p-3').filter({ hasText: targetTheme!.name }).first();
  const activeTenantCustomizeButton = activeTenantCard.getByRole('button', { name: /customize|anpassa|تخصيص/i });
  await expect(activeTenantCustomizeButton).toBeVisible({ timeout: 10000 });

  const activatedCss = await getThemeCssText(page, `${tenantBaseUrl}/`);

  await page.goto(`${tenantBaseUrl}/cms/themes`);
  await activeTenantCustomizeButton.click();
  await saveCustomizer(page);

  const savedCss = await getThemeCssText(page, `${tenantBaseUrl}/`);
  expect(savedCss.cssText.length).toBeGreaterThan(500);
  expect(savedCss.href).toMatch(/\/storage\/themes\/\d+\//);

  await page.goto(`${tenantBaseUrl}/cms/themes`);
  await activateThemeFromList(page, originalTheme!);
  await getThemeCssText(page, `${tenantBaseUrl}/`);

  expect(activatedCss.href).toMatch(/\/storage\/themes\/\d+\//);
  expect(issues, `Runtime issues detected in tenant theme activation flow:\n${formatIssues(issues)}`).toEqual([]);
});

test('central theme activation and customize keep storefront CSS and rules intact', async ({ page }) => {
  const issues = attachRuntimeGuards(page);

  await page.goto('/login');
  const centralToken = await submitLoginAndCaptureToken(page, centralAdminCredentials);
  await expect(page).toHaveURL(/\/dashboard(\/|$)/);

  await page.goto('/dashboard/themes');

  const centralThemes = await fetchThemesInBrowser(page, '/api/superadmin/themes', centralToken);
  const originalTheme = centralThemes.find((theme) => theme.is_active) ?? null;
  const targetTheme = centralThemes.find((theme) => !theme.is_active) ?? null;

  test.skip(!originalTheme || !targetTheme, 'Need at least one active theme and one inactive theme for central test.');
  const targetCard = page.locator('.grid .p-4').filter({ hasText: targetTheme!.name }).first();
  await expect(targetCard).toBeVisible();
  await targetCard.getByRole('button', { name: /activate|aktivera|تفعيل/i }).click();
  await waitForActivationConfirmationAndConfirm(page);
  const activeCentralCustomizeButton = targetCard.getByRole('button', { name: /customize|anpassa|تخصيص/i });
  await expect(activeCentralCustomizeButton).toBeVisible({ timeout: 10000 });

  const activatedCss = await getThemeCssText(page, '/');

  await page.goto('/dashboard/themes');
  await activeCentralCustomizeButton.click();
  await saveCustomizer(page);

  const savedCss = await getThemeCssText(page, '/');
  expect(savedCss.cssText.length).toBeGreaterThan(500);
  expect(savedCss.href).toMatch(/\/storage\/themes\/\d+\//);

  await page.goto('/dashboard/themes');
  const originalCard = page.locator('.grid .p-4').filter({ hasText: originalTheme!.name }).first();
  await expect(originalCard).toBeVisible();
  await originalCard.getByRole('button', { name: /activate|aktivera|تفعيل/i }).click();
  await waitForActivationConfirmationAndConfirm(page);
  await getThemeCssText(page, '/');

  expect(activatedCss.href).toMatch(/\/storage\/themes\/\d+\//);
  expect(issues, `Runtime issues detected in central theme activation flow:\n${formatIssues(issues)}`).toEqual([]);
});
