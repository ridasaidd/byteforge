import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';
import { logoutFromUserMenu, submitLoginAndCaptureToken, tenantOwnerCredentials } from './support/auth';
import { canResolveHostname, hostnameFromUrl } from './support/network';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

// The suite reuses one tenant owner account; parallel logins can trip Laravel's
// auth throttling and leave the UI on /login even when the flow is otherwise healthy.
test.describe.configure({ mode: 'serial' });

function isExpectedPostLogoutAuthIssue(message: string): boolean {
  return message.includes('/api/auth/logout') || message.includes('/api/auth/refresh');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('tenant owner can login and logout without runtime errors', async ({ page }) => {
  test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable tenant-domain auth flow test.');
  const tenantHostname = hostnameFromUrl(tenantBaseUrl!);
  const isTenantHostResolvable = await canResolveHostname(tenantHostname);
  test.skip(
    !isTenantHostResolvable,
    `Tenant hostname ${tenantHostname} is not resolvable from this environment.`,
  );

  const issues = attachRuntimeGuards(page);

  await page.goto(`${tenantBaseUrl}/login`);
  await submitLoginAndCaptureToken(page, tenantOwnerCredentials);

  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(tenantBaseUrl!)}/cms(/|$)`), { timeout: 30_000 });
  await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('auth_token'))).toBeNull();
  await expect.poll(async () => page.evaluate(() => window.sessionStorage.getItem('auth_token'))).toBeNull();

  await logoutFromUserMenu(page);
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(tenantBaseUrl!)}/login(/|$)`));
  await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('auth_token'))).toBeNull();
  await expect.poll(async () => page.evaluate(() => window.sessionStorage.getItem('auth_token'))).toBeNull();

  expect(issues, `Runtime issues detected in tenant auth flow:\n${formatIssues(issues)}`).toEqual([]);
});

test('tenant owner session restores on reload without browser token storage', async ({ page }) => {
  test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable tenant-domain auth flow test.');
  const tenantHostname = hostnameFromUrl(tenantBaseUrl!);
  const isTenantHostResolvable = await canResolveHostname(tenantHostname);
  test.skip(
    !isTenantHostResolvable,
    `Tenant hostname ${tenantHostname} is not resolvable from this environment.`,
  );

  const issues = attachRuntimeGuards(page);

  await page.goto(`${tenantBaseUrl}/login`);
  await submitLoginAndCaptureToken(page, tenantOwnerCredentials);

  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(tenantBaseUrl!)}/cms(/|$)`), { timeout: 30_000 });
  await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('auth_token'))).toBeNull();
  await expect.poll(async () => page.evaluate(() => window.sessionStorage.getItem('auth_token'))).toBeNull();

  const refreshResponsePromise = page.waitForResponse((response) => {
    try {
      const url = new URL(response.url());

      return response.request().method() === 'POST'
        && url.pathname.endsWith('/api/auth/refresh');
    } catch {
      return false;
    }
  });

  await page.reload();

  const refreshResponse = await refreshResponsePromise;
  expect(refreshResponse.ok()).toBe(true);

  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(tenantBaseUrl!)}/cms(/|$)`), { timeout: 30_000 });
  await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('auth_token'))).toBeNull();
  await expect.poll(async () => page.evaluate(() => window.sessionStorage.getItem('auth_token'))).toBeNull();

  expect(issues, `Runtime issues detected in tenant auth reload flow:\n${formatIssues(issues)}`).toEqual([]);
});

test('tenant logout invalidates session restore in another tab', async ({ browser }) => {
  test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable tenant-domain auth flow test.');
  const tenantHostname = hostnameFromUrl(tenantBaseUrl!);
  const isTenantHostResolvable = await canResolveHostname(tenantHostname);
  test.skip(
    !isTenantHostResolvable,
    `Tenant hostname ${tenantHostname} is not resolvable from this environment.`,
  );

  const context = await browser.newContext();
  const primaryPage = await context.newPage();
  const secondaryPage = await context.newPage();
  const primaryIssues = attachRuntimeGuards(primaryPage);
  const secondaryIssues = attachRuntimeGuards(secondaryPage);

  await primaryPage.goto(`${tenantBaseUrl}/login`);
  await submitLoginAndCaptureToken(primaryPage, tenantOwnerCredentials);

  await expect(primaryPage).toHaveURL(new RegExp(`${escapeRegExp(tenantBaseUrl!)}/cms(/|$)`), { timeout: 30_000 });
  await secondaryPage.goto(`${tenantBaseUrl}/cms`);
  await expect(secondaryPage).toHaveURL(new RegExp(`${escapeRegExp(tenantBaseUrl!)}/cms(/|$)`), { timeout: 30_000 });

  await logoutFromUserMenu(primaryPage);
  await expect(primaryPage).toHaveURL(new RegExp(`${escapeRegExp(tenantBaseUrl!)}/login(/|$)`));

  await secondaryPage.reload();
  await expect(secondaryPage).toHaveURL(new RegExp(`${escapeRegExp(tenantBaseUrl!)}/login(/|$)`));
  await expect.poll(async () => secondaryPage.evaluate(() => window.localStorage.getItem('auth_token'))).toBeNull();
  await expect.poll(async () => secondaryPage.evaluate(() => window.sessionStorage.getItem('auth_token'))).toBeNull();

  const authRelevantIssues = [...primaryIssues, ...secondaryIssues]
    .filter((issue) => !isExpectedPostLogoutAuthIssue(issue.message));

  expect(
    authRelevantIssues,
    `Runtime issues detected in tenant multi-tab logout flow:\n${formatIssues(authRelevantIssues)}`,
  ).toEqual([]);

  await context.close();
});
