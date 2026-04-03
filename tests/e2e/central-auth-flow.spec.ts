import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';
import { centralAdminCredentials, loginWithCredentials, logoutFromUserMenu } from './support/auth';

test('central user can login and logout without runtime errors', async ({ page }) => {
  const issues = attachRuntimeGuards(page);

  await page.goto('/login');
  await loginWithCredentials(page, centralAdminCredentials);

  await expect(page).toHaveURL(/\/dashboard(\/|$)/);

  await logoutFromUserMenu(page);
  await expect(page).toHaveURL(/\/login(\/|$)/);

  expect(issues, `Runtime issues detected in central auth flow:\n${formatIssues(issues)}`).toEqual([]);
});
