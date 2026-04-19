import { renderPuckComponent } from '@/shared/puck/__tests__/testUtils';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/hooks', async () => {
  const actual = await vi.importActual<typeof import('@/shared/hooks')>('@/shared/hooks');

  return {
    ...actual,
    usePuckEditMode: () => true,
    useTheme: () => ({ resolve: (_path: string, fallback?: string) => fallback ?? '' }),
  };
});

import { BookingWidgetRender } from '../BookingWidget';

describe('BookingWidgetRender', () => {
  it('forwards Puck dragRef to the booking widget root', () => {
    const dragRef = vi.fn();

    renderPuckComponent(
      <BookingWidgetRender
        serviceId={0}
        showPrices={true}
        successMessage="Booked"
        puck={{ dragRef }}
      />,
    );

    expect(dragRef.mock.calls.some(([node]) => node instanceof HTMLElement)).toBe(true);
  });

  it('renders heading slot content when provided', () => {
    renderPuckComponent(
      <BookingWidgetRender
        headerContent={() => <h2>Custom booking heading</h2>}
        serviceId={0}
        showPrices={true}
        successMessage="Booked"
      />,
    );

    expect(screen.getByText('Custom booking heading')).toBeInTheDocument();
  });

  it('omits the shell header when the heading slot is empty', () => {
    const { container } = renderPuckComponent(
      <BookingWidgetRender
        serviceId={0}
        showPrices={true}
        successMessage="Booked"
      />,
    );

    expect(container.querySelector('.bw-shell-header')).toBeNull();
  });

  it('falls back to the legacy editor preview when section layout is requested', () => {
    const Sections = ({ className }: { className?: string }) => (
      <div className={className}>
        <div>Section One</div>
        <div>Section Two</div>
      </div>
    );

    renderPuckComponent(
      <BookingWidgetRender
        serviceId={0}
        showPrices={true}
        successMessage="Booked"
        layoutMode="sections"
        sections={Sections}
      />,
    );

    expect(screen.queryByText('Custom Booking Sections')).not.toBeInTheDocument();
    expect(screen.getByText('Select a service')).toBeInTheDocument();
    expect(screen.getByText('Choose a date')).toBeInTheDocument();
    expect(screen.getByText('Your details')).toBeInTheDocument();
    expect(within(document.body).queryByText('Section One')).not.toBeInTheDocument();
  });

  it('uses progress and copy overrides in the legacy editor preview', () => {
    renderPuckComponent(
      <BookingWidgetRender
        serviceId={0}
        showPrices={true}
        successMessage="Booked"
        showProgress={false}
        serviceStepTitle="Choose an offering"
        customerStepTitle="Guest details"
        phoneLabelText="Mobile number"
        notesLabelText="Custom message"
        continueToReviewText="Review booking"
      />,
    );

    expect(screen.queryByLabelText('Booking progress')).not.toBeInTheDocument();
    expect(screen.getByText('Choose an offering')).toBeInTheDocument();
    expect(screen.getByText('Guest details')).toBeInTheDocument();
    expect(screen.getByText('Mobile number')).toBeInTheDocument();
    expect(screen.getByText('Custom message')).toBeInTheDocument();
    expect(screen.getByText('Review booking')).toBeInTheDocument();
  });

  it('renders custom success slot content in the editor preview', () => {
    renderPuckComponent(
      <BookingWidgetRender
        serviceId={0}
        showPrices={true}
        successMessage="Booked"
        successContent={() => <div>Custom success layout</div>}
      />,
    );

    expect(screen.getByText('Custom success layout')).toBeInTheDocument();
    expect(screen.queryByText('Preview of the success state styling.')).not.toBeInTheDocument();
  });
});
