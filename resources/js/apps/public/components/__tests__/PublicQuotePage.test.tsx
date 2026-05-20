import '@testing-library/jest-dom/vitest';
import '@/i18n';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicQuotePage } from '../PublicQuotePage';

const {
  getQuoteMock,
  acceptQuoteMock,
  rejectQuoteMock,
} = vi.hoisted(() => ({
  getQuoteMock: vi.fn(),
  acceptQuoteMock: vi.fn(),
  rejectQuoteMock: vi.fn(),
}));

vi.mock('../../services/quotes', () => ({
  publicQuotesService: {
    getQuote: getQuoteMock,
    acceptQuote: acceptQuoteMock,
    rejectQuote: rejectQuoteMock,
  },
}));

function renderPage(path = '/quotes/token-123') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/quotes/:token" element={<PublicQuotePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PublicQuotePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getQuoteMock.mockResolvedValue({
      id: 99,
      status: 'sent',
      currency: 'SEK',
      subtotal_minor: 9000,
      tax_minor: null,
      total_minor: 9000,
      estimated_duration_minutes: 150,
      customer_message: 'Estimate after inspection.',
      valid_until: '2026-05-22T10:00:00Z',
      sent_at: '2026-05-15T10:00:00Z',
      accepted_at: null,
      rejected_at: null,
      line_items: [
        {
          id: 1,
          label: 'Hair restoration session',
          description: 'Initial treatment and assessment',
          quantity: 2,
          unit_price_minor: 4500,
          line_total_minor: 9000,
        },
      ],
    });

    acceptQuoteMock.mockResolvedValue({
      id: 99,
      status: 'accepted',
      currency: 'SEK',
      subtotal_minor: 9000,
      tax_minor: null,
      total_minor: 9000,
      estimated_duration_minutes: 150,
      customer_message: 'Estimate after inspection.',
      valid_until: '2026-05-22T10:00:00Z',
      sent_at: '2026-05-15T10:00:00Z',
      accepted_at: '2026-05-16T10:00:00Z',
      rejected_at: null,
      line_items: [
        {
          id: 1,
          label: 'Hair restoration session',
          description: 'Initial treatment and assessment',
          quantity: 2,
          unit_price_minor: 4500,
          line_total_minor: 9000,
        },
      ],
    });

    rejectQuoteMock.mockResolvedValue({
      id: 99,
      status: 'rejected',
      currency: 'SEK',
      subtotal_minor: 9000,
      tax_minor: null,
      total_minor: 9000,
      estimated_duration_minutes: 150,
      customer_message: 'Estimate after inspection.',
      valid_until: '2026-05-22T10:00:00Z',
      sent_at: '2026-05-15T10:00:00Z',
      accepted_at: null,
      rejected_at: '2026-05-16T10:00:00Z',
      line_items: [
        {
          id: 1,
          label: 'Hair restoration session',
          description: 'Initial treatment and assessment',
          quantity: 2,
          unit_price_minor: 4500,
          line_total_minor: 9000,
        },
      ],
    });
  });

  it('loads a public quote by token and lets the guest accept it', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Your quote' })).toBeInTheDocument();
    expect(screen.getByText('Hair restoration session')).toBeInTheDocument();
    expect(screen.getAllByText('9000 SEK')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Accept quote' }));

    await waitFor(() => {
      expect(acceptQuoteMock).toHaveBeenCalledWith('token-123');
    });

    expect(await screen.findByText('Quote accepted')).toBeInTheDocument();
  });

  it('lets the guest reject the quote', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Your quote' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reject quote' }));

    await waitFor(() => {
      expect(rejectQuoteMock).toHaveBeenCalledWith('token-123');
    });

    expect(await screen.findByText('Quote rejected')).toBeInTheDocument();
  });

  it('renders an expired quote without decision actions', async () => {
    getQuoteMock.mockResolvedValueOnce({
      id: 99,
      status: 'expired',
      currency: 'SEK',
      subtotal_minor: 9000,
      tax_minor: null,
      total_minor: 9000,
      estimated_duration_minutes: 150,
      customer_message: 'Estimate after inspection.',
      valid_until: '2026-05-22T10:00:00Z',
      sent_at: '2026-05-15T10:00:00Z',
      accepted_at: null,
      rejected_at: null,
      expired_at: '2026-05-22T10:01:00Z',
      line_items: [
        {
          id: 1,
          label: 'Hair restoration session',
          description: 'Initial treatment and assessment',
          quantity: 2,
          unit_price_minor: 4500,
          line_total_minor: 9000,
        },
      ],
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Quote expired' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept quote' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject quote' })).not.toBeInTheDocument();
  });

  it('renders a cancelled quote without decision actions', async () => {
    getQuoteMock.mockResolvedValueOnce({
      id: 99,
      status: 'cancelled',
      currency: 'SEK',
      subtotal_minor: 9000,
      tax_minor: null,
      total_minor: 9000,
      estimated_duration_minutes: 150,
      customer_message: 'Estimate after inspection.',
      valid_until: '2026-05-22T10:00:00Z',
      sent_at: '2026-05-15T10:00:00Z',
      accepted_at: null,
      rejected_at: null,
      cancelled_at: '2026-05-16T12:00:00Z',
      line_items: [
        {
          id: 1,
          label: 'Hair restoration session',
          description: 'Initial treatment and assessment',
          quantity: 2,
          unit_price_minor: 4500,
          line_total_minor: 9000,
        },
      ],
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Quote cancelled' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept quote' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject quote' })).not.toBeInTheDocument();
  });
});
