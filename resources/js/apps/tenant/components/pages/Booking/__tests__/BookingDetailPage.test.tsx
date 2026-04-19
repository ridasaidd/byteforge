import '@testing-library/jest-dom/vitest';
import '@/i18n';
import i18n from '@/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { BookingDetailPage } from '../BookingDetailPage';

const {
  getBookingMock,
  confirmBookingMock,
  completeBookingMock,
  noShowBookingMock,
  cancelBookingMock,
  rescheduleBookingMock,
  deleteBookingMock,
  tenantSettingsGetMock,
  toastMock,
  navigateMock,
} = vi.hoisted(() => ({
  getBookingMock: vi.fn(),
  confirmBookingMock: vi.fn(),
  completeBookingMock: vi.fn(),
  noShowBookingMock: vi.fn(),
  cancelBookingMock: vi.fn(),
  rescheduleBookingMock: vi.fn(),
  deleteBookingMock: vi.fn(),
  tenantSettingsGetMock: vi.fn(),
  toastMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useParams: () => ({ id: '42' }),
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/shared/services/api/booking', () => ({
  cmsBookingApi: {
    getBooking: getBookingMock,
    confirmBooking: confirmBookingMock,
    completeBooking: completeBookingMock,
    noShowBooking: noShowBookingMock,
    cancelBooking: cancelBookingMock,
    rescheduleBooking: rescheduleBookingMock,
    deleteBooking: deleteBookingMock,
  },
}));

vi.mock('@/shared/services/api', () => ({
  tenantSettings: {
    get: tenantSettingsGetMock,
  },
}));

vi.mock('@/shared/hooks/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: () => true }),
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
      <MemoryRouter>
        <BookingDetailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BookingDetailPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await act(async () => {
      await i18n.changeLanguage('ar');
    });

    tenantSettingsGetMock.mockResolvedValue({
      data: {
        date_format: 'PPPP',
        time_format: 'HH:mm',
      },
    });

    getBookingMock.mockResolvedValue({
      data: {
        id: 42,
        service_id: 9,
        resource_id: 4,
        customer_name: 'ليلى أحمد',
        customer_email: 'leila@example.com',
        customer_phone: '+966500000000',
        customer_notes: 'يرجى تجهيز الغرفة مبكراً.',
        internal_notes: null,
        starts_at: '2026-05-15T11:00:00Z',
        ends_at: '2026-05-15T12:00:00Z',
        status: 'confirmed',
        cancelled_at: null,
        cancelled_by: null,
        hold_expires_at: null,
        created_at: '2026-05-01T08:00:00Z',
        updated_at: '2026-05-01T08:00:00Z',
        service: { id: 9, name: 'جلسة سبا', booking_mode: 'slot' },
        resource: { id: 4, name: 'الغرفة A', type: 'space' },
        events: [
          {
            id: 1,
            from_status: 'pending',
            to_status: 'confirmed',
            actor_type: 'tenant',
            actor_id: 8,
            note: 'تمت الموافقة يدوياً',
            created_at: '2026-05-01T09:00:00Z',
          },
        ],
      },
    });
  });

  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it('renders Arabic booking labels and action text', async () => {
    renderPage();

    expect(await screen.findByText('الحجز #42')).toBeInTheDocument();
    expect(screen.getByText('العميل')).toBeInTheDocument();
    expect(screen.getByText('تفاصيل الحجز')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إعادة الجدولة' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إلغاء الحجز' })).toBeInTheDocument();
    expect(screen.getAllByText('مؤكد').length).toBeGreaterThan(0);
  });
});
