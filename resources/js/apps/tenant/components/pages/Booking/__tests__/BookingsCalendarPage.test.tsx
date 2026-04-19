import '@testing-library/jest-dom/vitest';
import '@/i18n';
import i18n from '@/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { format, startOfMonth } from 'date-fns';
import { sv as svDateLocale } from 'date-fns/locale';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingsCalendarPage } from '../BookingsCalendarPage';

const {
  listBookingsMock,
  listServicesMock,
  listResourcesMock,
} = vi.hoisted(() => ({
  listBookingsMock: vi.fn(),
  listServicesMock: vi.fn(),
  listResourcesMock: vi.fn(),
}));

vi.mock('@/shared/services/api/booking', () => ({
  cmsBookingApi: {
    listBookings: listBookingsMock,
    listServices: listServicesMock,
    listResources: listResourcesMock,
  },
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
      <MemoryRouter>
        <BookingsCalendarPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BookingsCalendarPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await act(async () => {
      await i18n.changeLanguage('sv');
    });

    listBookingsMock.mockResolvedValue({
      data: [
        {
          id: 42,
          service_id: 7,
          resource_id: 3,
          customer_name: 'Anna Andersson',
          customer_email: 'anna@example.com',
          customer_phone: '0701234567',
          customer_notes: null,
          internal_notes: null,
          starts_at: '2026-05-15T11:00:00Z',
          ends_at: '2026-05-15T12:00:00Z',
          status: 'confirmed',
          cancelled_at: null,
          cancelled_by: null,
          hold_expires_at: null,
          created_at: '2026-05-01T08:00:00Z',
          updated_at: '2026-05-01T08:00:00Z',
          service: { id: 7, name: 'Spa', booking_mode: 'slot' },
          resource: { id: 3, name: 'Room A', type: 'space' },
        },
      ],
      current_page: 1,
      last_page: 1,
      total: 1,
      per_page: 15,
    });
    listServicesMock.mockResolvedValue({ data: [] });
    listResourcesMock.mockResolvedValue({ data: [] });
  });

  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it('renders Swedish booking labels and localized month header', async () => {
    renderPage();

    const expectedMonthLabel = format(startOfMonth(new Date()), 'MMMM yyyy', {
      locale: svDateLocale,
    });

    expect(await screen.findByText('Bokningar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Månad' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(expectedMonthLabel)).toBeInTheDocument();
    });
  });
});
