import '@testing-library/jest-dom/vitest';
import '../../../../../../i18n/index';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteRequestsPage } from '../QuoteRequestsPage';

const {
  listRequestsMock,
  createRequestMock,
  navigateMock,
  toastMock,
} = vi.hoisted(() => ({
  listRequestsMock: vi.fn(),
  createRequestMock: vi.fn(),
  navigateMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/shared/services/api/quotes', () => ({
  cmsQuotesApi: {
    listRequests: listRequestsMock,
    createRequest: createRequestMock,
  },
}));

vi.mock('@/shared/hooks/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: (permission: string) => permission === 'quotes.manage' || permission === 'quotes.view' }),
}));

vi.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <QuoteRequestsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('QuoteRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    listRequestsMock.mockResolvedValue({
      data: [
        {
          id: 1,
          requested_booking_service_id: 7,
          origin_surface: 'public',
          guest_name: 'Anna Andersson',
          guest_email: 'anna@example.com',
          guest_phone: '0701234567',
          subject_label: 'Long hair consultation',
          request_description: 'Need an estimate before booking.',
          preferred_start_at: null,
          preferred_end_at: null,
          status: 'submitted',
          submitted_at: '2026-05-15T10:00:00Z',
          last_activity_at: '2026-05-15T10:00:00Z',
          booking_service: { id: 7, name: 'Hair assessment' },
        },
      ],
    });

    createRequestMock.mockResolvedValue({
      data: {
        id: 77,
        requested_booking_service_id: null,
        origin_surface: 'manual',
        guest_name: 'Anna Andersson',
        guest_email: 'anna@example.com',
        guest_phone: '0701234567',
        subject_label: 'Hair assessment',
        request_description: 'Customer called and asked for an estimate.',
        preferred_start_at: null,
        preferred_end_at: null,
        status: 'submitted',
        submitted_at: '2026-05-18T09:00:00Z',
        last_activity_at: '2026-05-18T09:00:00Z',
        booking_service: null,
      },
    });
  });

  it('renders quote requests from the cms api', async () => {
    renderPage();

    expect(await screen.findByText('Quote Requests')).toBeInTheDocument();
    expect(await screen.findByText('Anna Andersson')).toBeInTheDocument();
    expect(screen.getByText('anna@example.com')).toBeInTheDocument();
    expect(screen.getByText('Long hair consultation')).toBeInTheDocument();
    expect(screen.getByText('Hair assessment')).toBeInTheDocument();
  });

  it('creates a manual quote request and navigates to the detail page', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'New manual request' }));

    fireEvent.change(await screen.findByLabelText('Customer name'), { target: { value: 'Anna Andersson' } });
    fireEvent.change(screen.getByLabelText('Customer email'), { target: { value: 'anna@example.com' } });
    fireEvent.change(screen.getByLabelText('Customer phone'), { target: { value: '0701234567' } });
    fireEvent.change(screen.getByLabelText('Subject or service'), { target: { value: 'Hair assessment' } });
    fireEvent.change(screen.getByLabelText('Request details'), { target: { value: 'Customer called and asked for an estimate.' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create manual request' }));

    await waitFor(() => {
      expect(createRequestMock).toHaveBeenCalledWith({
        guest_name: 'Anna Andersson',
        guest_email: 'anna@example.com',
        guest_phone: '0701234567',
        subject_label: 'Hair assessment',
        request_description: 'Customer called and asked for an estimate.',
        preferred_start_at: null,
        preferred_end_at: null,
      });
      expect(navigateMock).toHaveBeenCalledWith('/cms/quotes/77');
    });
  });
});
