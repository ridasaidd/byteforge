import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';
import { centralAdminCredentials, loginWithCredentials, logoutFromUserMenu } from './support/auth';

function isExpectedPostLogoutAuthIssue(message: string): boolean {
  return message.includes('/api/auth/logout') || message.includes('/api/auth/refresh');
}

async function ensureCentralLoginPageIsReachable(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');

  const hasEmailField = await page.getByLabel(/email/i).count();
  const hasPasswordField = await page.getByLabel(/password/i).count();

  test.skip(
    hasEmailField === 0 || hasPasswordField === 0,
    `Central login form is not reachable at ${page.url()}. Check PLAYWRIGHT_BASE_URL or PLAYWRIGHT_WEB_SERVER_COMMAND.`,
  );
}

test('central user can login and logout without runtime errors', async ({ page }) => {
  const issues = attachRuntimeGuards(page);

  await ensureCentralLoginPageIsReachable(page);
  await loginWithCredentials(page, centralAdminCredentials);

  await expect(page).toHaveURL(/\/dashboard(\/|$)/);

  await logoutFromUserMenu(page);
  await expect(page).toHaveURL(/\/login(\/|$)/);

  const authRelevantIssues = issues.filter((issue) => !issue.message.includes('/api/themes/active'));

  expect(authRelevantIssues, `Runtime issues detected in central auth flow:\n${formatIssues(authRelevantIssues)}`).toEqual([]);
});

test('central user session restores on reload without browser token storage', async ({ page }) => {
  const issues = attachRuntimeGuards(page);

  await ensureCentralLoginPageIsReachable(page);
  await loginWithCredentials(page, centralAdminCredentials);

  await expect(page).toHaveURL(/\/dashboard(\/|$)/);
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

  await expect(page).toHaveURL(/\/dashboard(\/|$)/);
  await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('auth_token'))).toBeNull();
  await expect.poll(async () => page.evaluate(() => window.sessionStorage.getItem('auth_token'))).toBeNull();

  const authRelevantIssues = issues.filter((issue) => !issue.message.includes('/api/themes/active'));

  expect(authRelevantIssues, `Runtime issues detected in central auth reload flow:\n${formatIssues(authRelevantIssues)}`).toEqual([]);
});

test('central logout invalidates session restore in another tab', async ({ browser }) => {
  const context = await browser.newContext();
  const primaryPage = await context.newPage();
  const secondaryPage = await context.newPage();
  const primaryIssues = attachRuntimeGuards(primaryPage);
  const secondaryIssues = attachRuntimeGuards(secondaryPage);

  await ensureCentralLoginPageIsReachable(primaryPage);
  await loginWithCredentials(primaryPage, centralAdminCredentials);

  await expect(primaryPage).toHaveURL(/\/dashboard(\/|$)/);
  await secondaryPage.goto('/dashboard');
  await expect(secondaryPage).toHaveURL(/\/dashboard(\/|$)/);

  await logoutFromUserMenu(primaryPage);
  await expect(primaryPage).toHaveURL(/\/login(\/|$)/);

  await secondaryPage.reload();
  await expect(secondaryPage).toHaveURL(/\/login(\/|$)/);
  await expect.poll(async () => secondaryPage.evaluate(() => window.localStorage.getItem('auth_token'))).toBeNull();
  await expect.poll(async () => secondaryPage.evaluate(() => window.sessionStorage.getItem('auth_token'))).toBeNull();

  const authRelevantIssues = [...primaryIssues, ...secondaryIssues]
    .filter((issue) => !issue.message.includes('/api/themes/active'))
    .filter((issue) => !isExpectedPostLogoutAuthIssue(issue.message));

  expect(
    authRelevantIssues,
    `Runtime issues detected in central multi-tab logout flow:\n${formatIssues(authRelevantIssues)}`,
  ).toEqual([]);

  await context.close();
});
