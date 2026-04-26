import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GuestPortalPage } from '../GuestPortalPage';

const publicGetMock = vi.fn();
const restoreSessionMock = vi.fn();

vi.mock('@puckeditor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@puckeditor/core')>();

  return {
    ...actual,
    Render: ({ data }: { data: { root?: { props?: { title?: string } } } }) => (
      <div data-testid="system-surface-render">{data.root?.props?.title}</div>
    ),
  };
});

vi.mock('@/shared/services/api/systemSurfaces', () => ({
  tenantSystemSurfaces: {
    publicGet: (...args: unknown[]) => publicGetMock(...args),
  },
}));

vi.mock('../../services/guestPortal', () => ({
  guestPortalService: {
    restoreSession: (...args: unknown[]) => restoreSessionMock(...args),
    listBookings: vi.fn(),
    getBooking: vi.fn(),
    requestMagicLink: vi.fn(),
    logout: vi.fn(),
    cancelBooking: vi.fn(),
  },
}));

function renderPage(path = '/guest-portal') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/guest-portal" element={<GuestPortalPage />} />
        <Route path="/guest-portal/:bookingId" element={<GuestPortalPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GuestPortalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreSessionMock.mockResolvedValue(null);
  });

  it('renders the system surface runtime when guest_portal data exists', async () => {
    publicGetMock.mockResolvedValue({
      data: {
        surface_key: 'guest_portal',
        puck_data: {
          root: {
            props: {
              title: 'Portal from surface',
            },
          },
        },
      },
    });

    renderPage();

    await waitFor(() => expect(screen.getByTestId('system-surface-render')).toHaveTextContent('Portal from surface'));
    expect(publicGetMock).toHaveBeenCalledWith('guest_portal');
  });

  it('falls back to the standalone guest portal when no system surface is available', async () => {
    publicGetMock.mockRejectedValue(new Error('missing surface'));

    renderPage();

    await waitFor(() => expect(screen.getByRole('heading', { name: 'My bookings' })).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Get a sign-in link' })).toBeInTheDocument();
  });
});
