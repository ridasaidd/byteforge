import '@testing-library/jest-dom/vitest';
import '@/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingSettingsPage } from '../BookingSettingsPage';

const {
  tenantSettingsGetMock,
  tenantSettingsUpdateMock,
  tenantPagesListMock,
  toastMock,
} = vi.hoisted(() => ({
  tenantSettingsGetMock: vi.fn(),
  tenantSettingsUpdateMock: vi.fn(),
  tenantPagesListMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/shared/services/api', () => ({
  tenantSettings: {
    get: tenantSettingsGetMock,
    update: tenantSettingsUpdateMock,
  },
}));

vi.mock('@/shared/services/api/pages', () => ({
  tenantPages: {
    list: tenantPagesListMock,
  },
}));

vi.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderPage() {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <BookingSettingsPage />
    </QueryClientProvider>,
  );
}

function buildSettings(overrides: Record<string, unknown> = {}) {
  return {
    timezone: 'Europe/Stockholm',
    booking_auto_confirm: true,
    booking_hold_minutes: 10,
    booking_checkin_time: '15:00',
    booking_checkout_time: '11:00',
    booking_reminder_hours: [24, 2],
    booking_cancellation_notice_hours: 12,
    booking_payment_page_id: null,
    ...overrides,
  };
}

describe('BookingSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    tenantSettingsGetMock.mockResolvedValue({
      data: buildSettings(),
    });
    tenantSettingsUpdateMock.mockResolvedValue({
      data: buildSettings(),
    });
    tenantPagesListMock.mockResolvedValue({
      data: [],
    });
  });

  it('shows the fallback option and only published pages in the payment page selector', async () => {
    tenantSettingsGetMock.mockResolvedValue({
      data: buildSettings({ booking_payment_page_id: 12 }),
    });
    tenantPagesListMock.mockResolvedValue({
      data: [
        { id: 12, title: 'Booking Payment', slug: 'booking-payment', status: 'published', is_homepage: false },
        { id: 99, title: 'Draft Payment', slug: 'draft-payment', status: 'draft', is_homepage: false },
        { id: 44, title: 'Home Payment', slug: 'ignored-home', status: 'published', is_homepage: true },
      ],
    });

    renderPage();

    const paymentPageSelect = await screen.findByLabelText('Payment page');

    expect(screen.getByRole('option', { name: 'System fallback payment page' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Booking Payment (/pages/booking-payment)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Home Payment (Homepage)' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Draft Payment (/pages/draft-payment)' })).not.toBeInTheDocument();
    expect(paymentPageSelect).toHaveValue('12');
  });

  it('saves the selected payment page id as a number', async () => {
    tenantPagesListMock.mockResolvedValue({
      data: [
        { id: 21, title: 'Checkout', slug: 'checkout', status: 'published', is_homepage: false },
      ],
    });

    renderPage();

    const paymentPageSelect = await screen.findByLabelText('Payment page');
    fireEvent.change(paymentPageSelect, { target: { value: '21' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => {
      expect(tenantSettingsUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
        booking_payment_page_id: 21,
      }));
    });
  });

  it('saves null when the fallback payment page option is selected', async () => {
    tenantSettingsGetMock.mockResolvedValue({
      data: buildSettings({ booking_payment_page_id: 21 }),
    });
    tenantPagesListMock.mockResolvedValue({
      data: [
        { id: 21, title: 'Checkout', slug: 'checkout', status: 'published', is_homepage: false },
      ],
    });

    renderPage();

    const paymentPageSelect = await screen.findByLabelText('Payment page');
    fireEvent.change(paymentPageSelect, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => {
      expect(tenantSettingsUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
        booking_payment_page_id: null,
      }));
    });
  });
});
