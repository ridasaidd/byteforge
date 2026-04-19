import type { Page } from '@playwright/test';

export type Credentials = {
  email: string;
  password: string;
};

type LoginResponse = {
  token?: string;
};

type AuthSession = {
  token: string;
  cookies: Awaited<ReturnType<Page['context']['cookies']>>;
};

const DEFAULT_PASSWORD = 'password';

export const centralAdminCredentials: Credentials = {
  email: process.env.PLAYWRIGHT_CENTRAL_EMAIL ?? 'admin@byteforge.se',
  password: process.env.PLAYWRIGHT_CENTRAL_PASSWORD ?? DEFAULT_PASSWORD,
};

export const tenantOwnerCredentials: Credentials = {
  email: process.env.PLAYWRIGHT_TENANT_OWNER_EMAIL ?? 'user.multiple@byteforge.test',
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

export async function submitLoginAndCaptureToken(page: Page, credentials: Credentials): Promise<string> {
  const loginResponsePromise = page.waitForResponse((response) => {
    try {
      const url = new URL(response.url());

      return response.request().method() === 'POST'
        && url.pathname.endsWith('/api/auth/login');
    } catch {
      return false;
    }
  });

  await loginWithCredentials(page, credentials);

  const loginResponse = await loginResponsePromise;
  const payload = await loginResponse.json() as LoginResponse;
  const token = payload.token;

  if (!loginResponse.ok() || !token) {
    throw new Error(`Login did not return an access token. Status: ${loginResponse.status()}`);
  }

  return token;
}

export async function loginAndCaptureAuthSession(page: Page, credentials: Credentials): Promise<AuthSession> {
  const token = await submitLoginAndCaptureToken(page, credentials);

  return {
    token,
    cookies: await page.context().cookies(),
  };
}

export async function gotoWithAuthCookies(
  page: Page,
  url: string,
  cookies: Awaited<ReturnType<Page['context']['cookies']>>,
): Promise<void> {
  await page.context().clearCookies();
  await page.context().addCookies(cookies);
  await page.goto(url);
}

export async function openUserMenu(page: Page): Promise<void> {
  await page.locator('button.rounded-full').first().click();
}

export async function logoutFromUserMenu(page: Page): Promise<void> {
  await openUserMenu(page);
  await page.getByRole('menuitem', { name: /logout|logga ut|تسجيل الخروج/i }).click();
}
