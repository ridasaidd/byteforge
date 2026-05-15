import '@testing-library/jest-dom/vitest';
import '@/i18n';
import i18n from '@/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { format, startOfMonth } from 'date-fns';
import { sv as svDateLocale } from 'date-fns/locale';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingsCalendarPage } from '../BookingsCalendarPage';

const {
  listBookingsMock,
  createBookingMock,
  listServicesMock,
  listResourcesMock,
} = vi.hoisted(() => ({
  listBookingsMock: vi.fn(),
  createBookingMock: vi.fn(),
  listServicesMock: vi.fn(),
  listResourcesMock: vi.fn(),
}));

vi.mock('@/shared/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: () => true,
  }),
}));

vi.mock('@/shared/services/api/booking', () => ({
  cmsBookingApi: {
    listBookings: listBookingsMock,
    createBooking: createBookingMock,
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
    createBookingMock.mockResolvedValue({ data: { id: 99 } });
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

  it('submits a new manual booking from the dashboard', async () => {
    listServicesMock.mockResolvedValue({
      data: [
        {
          id: 7,
          name: 'Spa',
          description: null,
          booking_mode: 'slot',
          duration_minutes: 60,
          slot_interval_minutes: 60,
          min_nights: null,
          max_nights: null,
          buffer_minutes: 0,
          advance_notice_hours: 0,
          max_advance_days: null,
          price: null,
          currency: 'SEK',
          requires_payment: false,
          is_active: true,
          resources: [{ id: 3, name: 'Room A', type: 'space' }],
          created_at: '2026-05-01T08:00:00Z',
          updated_at: '2026-05-01T08:00:00Z',
        },
      ],
    });
    listResourcesMock.mockResolvedValue({
      data: [
        {
          id: 3,
          name: 'Room A',
          type: 'space',
          description: null,
          checkin_time: null,
          checkout_time: null,
          capacity: 1,
          resource_label: null,
          user_id: null,
          is_active: true,
          created_at: '2026-05-01T08:00:00Z',
          updated_at: '2026-05-01T08:00:00Z',
        },
      ],
    });

    renderPage();

    const newBookingButton = await screen.findByRole('button', { name: 'Ny bokning' });
    await waitFor(() => {
      expect(newBookingButton).toBeEnabled();
    });

    fireEvent.click(newBookingButton);

    fireEvent.change(screen.getByLabelText('Namn'), { target: { value: 'VIP Client' } });
    fireEvent.change(screen.getByLabelText('E-post'), { target: { value: 'vip@example.com' } });
    fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '0701234567' } });
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '2026-05-15T10:00' } });
    fireEvent.change(screen.getByLabelText('Slut'), { target: { value: '2026-05-15T11:00' } });

    fireEvent.click(screen.getByRole('button', { name: 'Skapa bokning' }));

    await waitFor(() => {
      expect(createBookingMock).toHaveBeenCalledWith({
        service_id: 7,
        resource_id: 3,
        starts_at: '2026-05-15T10:00',
        ends_at: '2026-05-15T11:00',
        customer_name: 'VIP Client',
        customer_email: 'vip@example.com',
        customer_phone: '0701234567',
        customer_notes: null,
        internal_notes: null,
        force: false,
      });
    });
  });
});
