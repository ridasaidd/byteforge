import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderPuckComponent } from '@/shared/puck/__tests__/testUtils';

const { createRequestMock } = vi.hoisted(() => ({
  createRequestMock: vi.fn(),
}));

vi.mock('@/shared/services/api/publicQuotes', () => ({
  publicQuotesApi: {
    createRequest: createRequestMock,
  },
}));

describe('QuoteRequestWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createRequestMock.mockResolvedValue({
      id: 10,
      requested_booking_service_id: 7,
      guest_name: 'Anna Andersson',
      guest_email: 'anna@example.com',
      status: 'submitted',
      submitted_at: '2026-05-18T10:00:00Z',
    });
  });

  it('forwards Puck dragRef to the widget root', async () => {
    const { QuoteRequestWidget } = await import('../QuoteRequestWidget');
    const dragRef = vi.fn();

    renderPuckComponent(
      <QuoteRequestWidget.render
        title="Request a quote"
        description="Tell us what you need"
        serviceId={0}
        showPhoneField={true}
        showSubjectField={true}
        submitButtonText="Send request"
        successMessage="Thanks"
        errorMessage="Failed"
        editorPreviewText="Preview"
        maxWidth="760px"
        puck={{ dragRef }}
      />,
    );

    expect(dragRef.mock.calls.some(([node]) => node instanceof HTMLElement)).toBe(true);
  });

  it('submits a public quote request and renders success feedback', async () => {
    const { QuoteRequestWidget } = await import('../QuoteRequestWidget');

    renderPuckComponent(
      <QuoteRequestWidget.render
        title="Request a quote"
        description="Tell us what you need"
        serviceId={7}
        showPhoneField={true}
        showSubjectField={true}
        submitButtonText="Send request"
        successMessage="Thanks. We received your request."
        errorMessage="Failed"
        editorPreviewText="Preview"
        maxWidth="760px"
      />,
    );

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Anna Andersson' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'anna@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '0701234567' } });
    fireEvent.change(screen.getByLabelText('Request subject'), { target: { value: 'Hair restoration' } });
    fireEvent.change(screen.getByLabelText('Tell us what you need'), { target: { value: 'Need an estimate before booking.' } });
    const attachment = new File(['photo'], 'reference.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Reference photos or videos'), { target: { files: [attachment] } });
    fireEvent.change(screen.getByLabelText('Preferred earliest date'), { target: { value: '2026-05-25T09:00' } });
    fireEvent.change(screen.getByLabelText('Preferred latest date'), { target: { value: '2026-05-27T17:00' } });

    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));

    await waitFor(() => {
      expect(createRequestMock).toHaveBeenCalledWith({
        requested_booking_service_id: 7,
        guest_name: 'Anna Andersson',
        guest_email: 'anna@example.com',
        guest_phone: '0701234567',
        subject_label: 'Hair restoration',
        request_description: 'Need an estimate before booking.',
        preferred_start_at: '2026-05-25T09:00',
        preferred_end_at: '2026-05-27T17:00',
        attachments: [attachment],
      });
    });

    expect(await screen.findByText('Request received')).toBeInTheDocument();
    expect(screen.getByText('Thanks. We received your request.')).toBeInTheDocument();
  });
});
