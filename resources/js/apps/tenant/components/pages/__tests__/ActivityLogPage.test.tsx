import '@testing-library/jest-dom/vitest';
import '@/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityLogPage } from '../ActivityLogPage';

const { listMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
}));

vi.mock('@/shared/services/api/tenantActivity', () => ({
  tenantActivity: {
    list: listMock,
  },
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function renderPage() {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <ActivityLogPage />
    </QueryClientProvider>,
  );
}

describe('Tenant ActivityLogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    listMock.mockResolvedValue({
      data: [
        {
          id: 1,
          log_name: 'quotes',
          description: 'Quote sent',
          event: 'sent',
          subject_type: 'Quote',
          subject_id: 42,
          causer: {
            id: 25,
            name: 'Owner - Tenant One',
            email: 'owner@tenant-one.dev.byteforge.se',
          },
          properties: {},
          created_at: '2026-05-15T10:00:00Z',
        },
      ],
      meta: {
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 1,
      },
    });
  });

  it('renders tenant activity rows from the tenant api', async () => {
    renderPage();

    expect(await screen.findByText('Activity Log')).toBeInTheDocument();
    expect(await screen.findByText('Quote sent')).toBeInTheDocument();
    expect(screen.getByText('Quote #42')).toBeInTheDocument();
    expect(screen.getByText('Owner - Tenant One')).toBeInTheDocument();
    expect(screen.getByText('owner@tenant-one.dev.byteforge.se')).toBeInTheDocument();
  });
});