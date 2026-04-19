import { test, expect } from '@playwright/test';
import { attachRuntimeGuards, formatIssues } from './support/consoleGuards';
import { loginWithCredentials, tenantOwnerCredentials } from './support/auth';

const tenantBaseUrl = process.env.PLAYWRIGHT_TENANT_BASE_URL;

const SECTION_LABELS = [
  'Booking Service Step',
  'Booking Date Step',
  'Booking Resource Step',
  'Booking Slot Step',
  'Booking Check-out Step',
  'Booking Customer Step',
  'Booking Confirm Step',
] as const;

type SectionType =
  | 'BookingServiceSection'
  | 'BookingDateSection'
  | 'BookingResourceSection'
  | 'BookingSlotSection'
  | 'BookingRangeCheckoutSection'
  | 'BookingCustomerSection'
  | 'BookingConfirmSection';

const SECTION_LABEL_BY_TYPE: Record<SectionType, (typeof SECTION_LABELS)[number]> = {
  BookingServiceSection: 'Booking Service Step',
  BookingDateSection: 'Booking Date Step',
  BookingResourceSection: 'Booking Resource Step',
  BookingSlotSection: 'Booking Slot Step',
  BookingRangeCheckoutSection: 'Booking Check-out Step',
  BookingCustomerSection: 'Booking Customer Step',
  BookingConfirmSection: 'Booking Confirm Step',
};

function getWidgetId(seed: string) {
  return `BookingWidget-${seed}`;
}

function getSectionId(type: SectionType, seed: string, index: number) {
  return `${type}-${seed}-${index}`;
}

function buildBookingWidgetEditorData(seed: string, sectionTypes: SectionType[] = [
  'BookingServiceSection',
  'BookingDateSection',
  'BookingCustomerSection',
]) {
  return {
    content: [
      {
        type: 'BookingWidget',
        props: {
          id: getWidgetId(seed),
          title: 'Playwright Booking Widget',
          serviceId: 0,
          showPrices: true,
          successMessage: 'Booked',
          layoutMode: 'sections',
          sections: sectionTypes.map((type, index) => ({
            type,
            props: { id: getSectionId(type, seed, index) },
          })),
        },
      },
    ],
    root: { props: {} },
    zones: {},
  };
}

async function isBookingAddonActive(
  request: import('@playwright/test').APIRequestContext,
  token: string,
): Promise<boolean> {
  const res = await request.get(`${tenantBaseUrl}/api/addons`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok()) return false;
  const body = await res.json() as { data: string[] };
  return Array.isArray(body.data) && body.data.includes('booking');
}

async function gotoWithAuth(
  page: import('@playwright/test').Page,
  url: string,
  token: string,
): Promise<void> {
  await page.addInitScript((value: string) => {
    window.localStorage.setItem('auth_token', value);
  }, token);
  await page.goto(url);
}

async function createBookingEditorPage(
  request: import('@playwright/test').APIRequestContext,
  ownerToken: string,
  seed: string,
  sectionTypes?: SectionType[],
) {
  const uniquePageTitle = `Playwright Booking Widget ${seed}`;
  const createResponse = await request.post(`${tenantBaseUrl}/api/pages`, {
    headers: {
      Authorization: `Bearer ${ownerToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    data: {
      title: uniquePageTitle,
      slug: `playwright-booking-widget-${seed}`,
      page_type: 'general',
      status: 'draft',
      is_homepage: false,
      puck_data: buildBookingWidgetEditorData(seed, sectionTypes),
    },
  });

  expect(createResponse.ok(), `Failed to create booking editor page: ${createResponse.status()} ${createResponse.statusText()}`).toBeTruthy();

  const payload = await createResponse.json() as { data?: { id?: number } };
  const pageId = payload.data?.id;
  expect(pageId, 'Booking editor page creation response did not include page id').toBeTruthy();

  return { pageId: pageId as number, uniquePageTitle };
}

async function openBookingEditor(
  page: import('@playwright/test').Page,
  pageId: number,
  ownerToken: string,
  uniquePageTitle: string,
) {
  await gotoWithAuth(page, `${tenantBaseUrl}/cms/pages/${pageId}/edit`, ownerToken);
  await expect(page).toHaveURL(new RegExp(`${tenantBaseUrl}/cms/pages/${pageId}/edit(/|$)`));
  await expect(page.getByText(uniquePageTitle, { exact: false })).toBeVisible();
}

async function dragLocatorToLocator(
  page: import('@playwright/test').Page,
  source: import('@playwright/test').Locator,
  target: import('@playwright/test').Locator,
  targetYOffsetRatio = 0.5,
) {
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  expect(sourceBox, 'Expected draggable source locator to have a bounding box').toBeTruthy();
  expect(targetBox, 'Expected draggable target locator to have a bounding box').toBeTruthy();

  await page.mouse.move(
    sourceBox!.x + sourceBox!.width / 2,
    sourceBox!.y + sourceBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBox!.x + targetBox!.width / 2,
    targetBox!.y + Math.max(12, targetBox!.height * targetYOffsetRatio),
    { steps: 20 },
  );
  await page.mouse.up();
}

async function publishBookingEditorPage(page: import('@playwright/test').Page, pageId: number) {
  const saveResponse = page.waitForResponse((response) => {
    const request = response.request();
    return response.url().includes(`/api/pages/${pageId}`)
      && ['PUT', 'PATCH'].includes(request.method())
      && response.ok();
  });

  await page.getByText('Publish', { exact: true }).click();
  await saveResponse;
}

async function getOutlineSectionOrder(page: import('@playwright/test').Page) {
  await page.getByText('Outline').click();
  const texts = await page.locator('[class*="OutlinePlugin"] [class*="Layer-name"]').allTextContents();

  return texts.filter((text) => SECTION_LABELS.includes(text.trim() as (typeof SECTION_LABELS)[number]));
}

async function openBookingSectionsDrawer(page: import('@playwright/test').Page) {
  const drawerToggle = page.getByRole('button', { name: 'Booking Sections' });
  const dateSectionItem = page.locator('[data-testid="drawer-item:BookingDateSection"]');

  if (await dateSectionItem.isVisible()) {
    return;
  }

  await drawerToggle.scrollIntoViewIfNeeded();
  await drawerToggle.click();
  await expect(dateSectionItem).toBeVisible();
}

test.describe.skip('Booking widget editor sections', () => {
  test.describe.configure({ mode: 'serial' });

  let ownerToken = '';

  test.beforeAll(async ({ browser }) => {
    if (!tenantBaseUrl) return;
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    try {
      await page.goto(`${tenantBaseUrl}/login`);
      await loginWithCredentials(page, tenantOwnerCredentials);
      await page.waitForURL(new RegExp(`${tenantBaseUrl}/cms(/|$)`), { timeout: 30_000 });
      ownerToken = (await page.evaluate(() => window.localStorage.getItem('auth_token'))) ?? '';
    } finally {
      await ctx.close();
    }
  });

  test('renders multiple booking section children inside the Puck editor', async ({ page, request }) => {
    test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable booking widget editor tests.');

    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    const issues = attachRuntimeGuards(page);
    const seed = String(Date.now());
    const { pageId, uniquePageTitle } = await createBookingEditorPage(request, ownerToken, seed);

    await openBookingEditor(page, pageId, ownerToken, uniquePageTitle);

    const previewFrame = page.frameLocator('iframe#preview-frame');

    await expect(previewFrame.getByText('Custom Booking Sections')).toBeVisible();
    await expect(previewFrame.getByText('Booking Service Step')).toBeVisible();
    await expect(previewFrame.getByText('Booking Date Step')).toBeVisible();
    await expect(previewFrame.getByText('Booking Customer Step')).toBeVisible();

    expect(issues, `Runtime issues detected in booking widget editor flow:\n${formatIssues(issues)}`).toEqual([]);
  });

  test('can add a booking section block from the drawer and persist it after publish', async ({ page, request }) => {
    test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable booking widget editor tests.');

    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    const issues = attachRuntimeGuards(page);
    const seed = `${Date.now()}-add`;
    const { pageId, uniquePageTitle } = await createBookingEditorPage(request, ownerToken, seed, ['BookingServiceSection']);

    await openBookingEditor(page, pageId, ownerToken, uniquePageTitle);
    await openBookingSectionsDrawer(page);

    const previewFrame = page.frameLocator('iframe#preview-frame');
    const slotHintCard = previewFrame.locator('.bw-editor-card');

    await dragLocatorToLocator(
      page,
      page.locator('[data-testid="drawer-item:BookingDateSection"]'),
      slotHintCard,
      0.5,
    );

    await expect(previewFrame.locator('[data-puck-component^="BookingDateSection-"]')).toHaveCount(1);
    await expect.poll(() => getOutlineSectionOrder(page)).toEqual([
      'Booking Date Step',
      'Booking Service Step',
    ]);

    await publishBookingEditorPage(page, pageId);
    await page.reload();
    await openBookingEditor(page, pageId, ownerToken, uniquePageTitle);

    await expect(previewFrame.locator('[data-puck-component^="BookingDateSection-"]')).toHaveCount(1);
    await expect.poll(() => getOutlineSectionOrder(page)).toEqual([
      'Booking Date Step',
      'Booking Service Step',
    ]);

    expect(issues, `Runtime issues detected in booking widget add-section flow:\n${formatIssues(issues)}`).toEqual([]);
  });

  test('can reorder booking sections and persist the saved order', async ({ page, request }) => {
    test.skip(!tenantBaseUrl, 'Set PLAYWRIGHT_TENANT_BASE_URL to enable booking widget editor tests.');

    const addonActive = await isBookingAddonActive(request, ownerToken);
    test.skip(!addonActive, 'booking addon is not active on this tenant — skipping.');

    const issues = attachRuntimeGuards(page);
    const seed = `${Date.now()}-reorder`;
    const initialSections: SectionType[] = [
      'BookingServiceSection',
      'BookingDateSection',
      'BookingCustomerSection',
    ];
    const { pageId, uniquePageTitle } = await createBookingEditorPage(request, ownerToken, seed, initialSections);

    await openBookingEditor(page, pageId, ownerToken, uniquePageTitle);

    const previewFrame = page.frameLocator('iframe#preview-frame');
    const slotHintCard = previewFrame.locator('.bw-editor-card');

    await expect.poll(() => getOutlineSectionOrder(page)).toEqual(initialSections.map((type) => SECTION_LABEL_BY_TYPE[type]));

    await dragLocatorToLocator(
      page,
      previewFrame.locator(`[data-puck-component="${getSectionId('BookingCustomerSection', seed, 2)}"]`),
      slotHintCard,
      0.5,
    );

    await expect.poll(() => getOutlineSectionOrder(page)).toEqual([
      'Booking Customer Step',
      'Booking Service Step',
      'Booking Date Step',
    ]);

    await publishBookingEditorPage(page, pageId);
    await page.reload();
    await openBookingEditor(page, pageId, ownerToken, uniquePageTitle);

    await expect.poll(() => getOutlineSectionOrder(page)).toEqual([
      'Booking Customer Step',
      'Booking Service Step',
      'Booking Date Step',
    ]);

    expect(issues, `Runtime issues detected in booking widget reorder flow:\n${formatIssues(issues)}`).toEqual([]);
  });
});
