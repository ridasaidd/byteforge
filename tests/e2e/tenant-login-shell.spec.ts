import { test, expect, type APIRequestContext } from '@playwright/test';
import { logoutFromUserMenu, submitLoginAndCaptureToken, tenantOwnerCredentials } from './support/auth';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function updateTenantLoginSurface(
  request: APIRequestContext,
  token: string,
  puckData: Record<string, unknown>,
): Promise<void> {
  const response = await request.put(`${tenantBaseUrl}/api/system-surfaces/tenant_login`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    data: {
      puck_data: puckData,
    },
  });

  expect(response.ok(), `Tenant login surface update failed with status ${response.status()}`).toBeTruthy();
}

async function resetTenantLoginSurface(request: APIRequestContext, token: string): Promise<void> {
  const response = await request.post(`${tenantBaseUrl}/api/system-surfaces/tenant_login/reset`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  expect(response.ok(), `Tenant login surface reset failed with status ${response.status()}`).toBeTruthy();
}

test('tenant login shell loads without runtime console errors', async ({ page }) => {
  test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable tenant-domain smoke tests.');

  const issues = attachRuntimeGuards(page);

  const response = await page.goto(`${tenantBaseUrl}/login`);
  expect(response?.ok(), `Tenant login page request failed with status ${response?.status()}`).toBeTruthy();
  await expect(page).toHaveTitle(/Tenant CMS/i);
  await expect(page.locator('#tenant-app')).toBeAttached();

  expect(issues, `Runtime issues detected on tenant login:\n${formatIssues(issues)}`).toEqual([]);
});

test('tenant login surface customization and reset keep the auth flow working', async ({ page, request }) => {
  test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable tenant-domain smoke tests.');

  const issues = attachRuntimeGuards(page);
  const customTitle = `Playwright tenant login ${Date.now()}`;
  const customPanelTitle = 'Customized sign-in panel';
  let surfaceCustomized = false;
  let surfaceReset = false;

  try {
    await page.goto(`${tenantBaseUrl}/login`);

    const ownerToken = await submitLoginAndCaptureToken(page, tenantOwnerCredentials);
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(tenantBaseUrl!)}/cms(/|$)`), { timeout: 30_000 });

    await updateTenantLoginSurface(request, ownerToken, {
      content: [],
      root: {
        props: {
          title: customTitle,
          panelTitle: customPanelTitle,
          description: 'Playwright customization coverage for the tenant login surface.',
          supportText: 'This customized shell should still keep the fixed login form working.',
        },
      },
    });
    surfaceCustomized = true;

    await logoutFromUserMenu(page);
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(tenantBaseUrl!)}/login(/|$)`));
    await expect(page.getByRole('heading', { name: customTitle })).toBeVisible();
    await expect(page.getByText(customPanelTitle)).toBeVisible();

    const secondToken = await submitLoginAndCaptureToken(page, tenantOwnerCredentials);
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(tenantBaseUrl!)}/cms(/|$)`), { timeout: 30_000 });

    await resetTenantLoginSurface(request, secondToken);
    surfaceReset = true;

    await logoutFromUserMenu(page);
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(tenantBaseUrl!)}/login(/|$)`));
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByText(customPanelTitle)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: customTitle })).toHaveCount(0);

    expect(issues, `Runtime issues detected in tenant login surface customization flow:\n${formatIssues(issues)}`).toEqual([]);
  } finally {
    if (surfaceCustomized && !surfaceReset) {
      try {
        await page.goto(`${tenantBaseUrl}/login`);
        const cleanupToken = await submitLoginAndCaptureToken(page, tenantOwnerCredentials);
        await resetTenantLoginSurface(request, cleanupToken);
      } catch {
        // Best-effort cleanup only.
      }
    }
  }
});
