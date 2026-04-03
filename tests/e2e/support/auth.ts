import type { Page } from '@playwright/test';

export type Credentials = {
  email: string;
  password: string;
};

const DEFAULT_PASSWORD = 'password';

export const centralAdminCredentials: Credentials = {
  email: process.env.PLAYWRIGHT_CENTRAL_EMAIL ?? 'superadmin@byteforge.se',
  password: process.env.PLAYWRIGHT_CENTRAL_PASSWORD ?? DEFAULT_PASSWORD,
};

export const tenantOwnerCredentials: Credentials = {
  email: process.env.PLAYWRIGHT_TENANT_OWNER_EMAIL ?? 'owner@tenant-one.byteforge.se',
  password: process.env.PLAYWRIGHT_TENANT_OWNER_PASSWORD ?? DEFAULT_PASSWORD,
};

export const tenantViewerCredentials: Credentials = {
  email: process.env.PLAYWRIGHT_TENANT_VIEWER_EMAIL ?? 'viewer@tenant-one.byteforge.se',
  password: process.env.PLAYWRIGHT_TENANT_VIEWER_PASSWORD ?? DEFAULT_PASSWORD,
};

export async function loginWithCredentials(page: Page, credentials: Credentials): Promise<void> {
  await page.getByLabel(/email/i).fill(credentials.email);
  await page.getByLabel(/password/i).fill(credentials.password);
  await page.getByLabel(/password/i).press('Enter');
}

export async function openUserMenu(page: Page): Promise<void> {
  await page.locator('button.rounded-full').first().click();
}

export async function logoutFromUserMenu(page: Page): Promise<void> {
  await openUserMenu(page);
  await page.getByRole('menuitem', { name: /logout|logga ut|تسجيل الخروج/i }).click();
}
