import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

test('tenant storefront routes load without runtime errors or central API/theme asset leaks', async ({ page }) => {
  test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable tenant storefront smoke tests.');

  const issues = attachRuntimeGuards(page);
  const requests: string[] = [];

  page.on('request', (request) => {
    requests.push(request.url());
  });

  await page.goto(`${tenantBaseUrl}/`);
  await expect(page.locator('#public-app')).toBeAttached();

  const homepageResponse = await page.request.get(`${tenantBaseUrl}/api/pages/public/homepage`);
  if (homepageResponse.ok()) {
    const homepagePayload = (await homepageResponse.json()) as { data?: { slug?: string } };
    const homepageSlug = homepagePayload.data?.slug;

    if (homepageSlug) {
      await page.goto(`${tenantBaseUrl}/pages/${homepageSlug}`);
      await expect(page.locator('#public-app')).toBeAttached();
    }
  }

  const leakedCentralThemeApiCalls = requests.filter((url) => url.includes('/api/superadmin/themes/active'));
  const leakedTenantAssetProxyCalls = requests.filter((url) => url.includes('/tenancy/assets/storage/themes/'));

  expect(leakedCentralThemeApiCalls, 'Storefront should never call central superadmin theme endpoint on tenant domain').toEqual([]);
  expect(leakedTenantAssetProxyCalls, 'Storefront should not request theme CSS via tenancy asset proxy path').toEqual([]);
  expect(issues, `Runtime issues detected in tenant storefront routes:\n${formatIssues(issues)}`).toEqual([]);
});
