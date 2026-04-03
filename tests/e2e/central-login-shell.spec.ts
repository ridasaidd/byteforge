import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';

test('central login shell loads without runtime console errors', async ({ page }) => {
  const issues = attachRuntimeGuards(page);

  await page.goto('/login');
  await expect(page.locator('#superadmin-app')).toBeVisible();

  expect(issues, `Runtime issues detected on central login:\n${formatIssues(issues)}`).toEqual([]);
});
