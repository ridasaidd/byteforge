import type { ComponentConfig, Config } from '@puckeditor/core';
import { usePuckEditMode } from '@/shared/hooks';
import { useOptionalBookingContext } from './BookingContext';
import { useOptionalBookingRenderContext } from './BookingRenderContext';
import type { BookingAuthorableStep } from './sectionOrder';
import {
  BookingErrorBanner,
  BookingErrorStep,
  ConfirmStep,
  CustomerStep,
  DateStep,
  ResourceStep,
  ServiceStep,
  SlotStep,
  SuccessContentStep,
} from './BookingWidgetSteps';

type EmptyProps = Record<string, never>;
type PuckDragRef = ((element: Element | null) => void) | null;

interface BookingSectionRenderProps {
  puck?: {
    dragRef?: PuckDragRef;
  };
}

function EditorSectionCard({ title, description }: { title: string; description: string }) {
  return (
    <div
      style={{
        border: '1px dashed #93c5fd',
        borderRadius: 10,
        background: '#f8fbff',
        padding: 14,
        marginBottom: 10,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: '#1d4ed8', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{description}</div>
    </div>
  );
}

function EditorGuardCard({ title }: { title: string }) {
  return (
    <div
      style={{
        border: '1px dashed #f59e0b',
        borderRadius: 10,
        background: '#fffaf0',
        padding: 14,
        marginBottom: 10,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: '#b45309', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
        This block only works inside the Booking Widget sections slot.
      </div>
    </div>
  );
}

function withBookingSection(
  title: string,
  description: string,
  renderRuntime: () => JSX.Element | null,
  inspectionStep?: BookingAuthorableStep,
): ComponentConfig<EmptyProps> {
  function SectionComponent({ puck }: BookingSectionRenderProps) {
    const isEditing = usePuckEditMode();
    const bookingContext = useOptionalBookingContext();
    const renderContext = useOptionalBookingRenderContext();
    const insideBookingWidget = Boolean(bookingContext && renderContext);
    let content: JSX.Element | null = null;

    if (renderContext?.mode === 'order-inspection' && inspectionStep) {
      content = <div data-booking-section-step={inspectionStep} />;
    } else if (isEditing) {
      content = insideBookingWidget
        ? <EditorSectionCard title={title} description={description} />
        : <EditorGuardCard title={title} />;
    } else if (insideBookingWidget) {
      content = renderRuntime();
    }

    if (!content) {
      return null;
    }

    return (
      <div ref={puck?.dragRef} className="bw-section-block">
        {content}
      </div>
    );
  }

  return {
    label: title,
    inline: true,
    fields: {},
    render: (props: EmptyProps & BookingSectionRenderProps) => <SectionComponent puck={props.puck} />,
  };
}

export const BookingErrorBannerSection = withBookingSection(
  'Booking Error Banner',
  'Displays recoverable booking errors at the top of the widget.',
  () => <BookingErrorBanner />,
);

export const BookingServiceSection = withBookingSection(
  'Booking Service Step',
  'Service selection view for the beginning of the booking flow.',
  () => {
    const bookingContext = useOptionalBookingContext();
    const renderContext = useOptionalBookingRenderContext();

    if (!bookingContext || !renderContext || bookingContext.state.step !== 'service') return null;

    return <ServiceStep primaryColor={renderContext.primaryColor} showPrices={renderContext.showPrices} />;
  },
  'service',
);

export const BookingDateSection = withBookingSection(
  'Booking Date Step',
  'Calendar step for selecting the booking date.',
  () => {
    const bookingContext = useOptionalBookingContext();
    const renderContext = useOptionalBookingRenderContext();

    if (!bookingContext || !renderContext || bookingContext.state.step !== 'date') return null;

    return <DateStep serviceId={renderContext.serviceId} primaryColor={renderContext.primaryColor} />;
  },
  'date',
);

export const BookingResourceSection = withBookingSection(
  'Booking Resource Step',
  'Resource selection step filtered by the chosen date.',
  () => {
    const bookingContext = useOptionalBookingContext();
    const renderContext = useOptionalBookingRenderContext();

    if (!bookingContext || !renderContext || bookingContext.state.step !== 'resource') return null;

    return <ResourceStep primaryColor={renderContext.primaryColor} />;
  },
  'resource',
);

export const BookingSlotSection = withBookingSection(
  'Booking Slot Step',
  'Time-slot selection for slot-based services.',
  () => {
    const bookingContext = useOptionalBookingContext();
    const renderContext = useOptionalBookingRenderContext();

    if (!bookingContext || !renderContext || bookingContext.state.step !== 'slot') return null;

    return <SlotStep primaryColor={renderContext.primaryColor} timeFormat={renderContext.timeFormat} />;
  },
  'slot',
);

export const BookingRangeCheckoutSection = withBookingSection(
  'Booking Check-out Step',
  'Legacy range-mode block retained only so old saved section data can be detected and rejected safely.',
  () => null,
  'range_checkout',
);

export const BookingCustomerSection = withBookingSection(
  'Booking Customer Step',
  'Customer details form for the booking hold.',
  () => {
    const bookingContext = useOptionalBookingContext();
    const renderContext = useOptionalBookingRenderContext();

    if (!bookingContext || !renderContext || bookingContext.state.step !== 'customer') return null;

    return (
      <CustomerStep
        onSubmit={renderContext.submitHold}
        loading={bookingContext.state.loading}
        primaryColor={renderContext.primaryColor}
      />
    );
  },
  'customer',
);

export const BookingConfirmSection = withBookingSection(
  'Booking Confirm Step',
  'Booking summary and confirmation action.',
  () => {
    const bookingContext = useOptionalBookingContext();
    const renderContext = useOptionalBookingRenderContext();

    if (!bookingContext || !renderContext || bookingContext.state.step !== 'confirm') return null;

    return (
      <ConfirmStep
        onSubmit={renderContext.submitConfirm}
        loading={bookingContext.state.loading}
        primaryColor={renderContext.primaryColor}
        timeFormat={renderContext.timeFormat}
      />
    );
  },
  'confirm',
);

export const BookingSuccessSection = withBookingSection(
  'Booking Success State',
  'Success panel shown when the booking has been confirmed.',
  () => {
    const bookingContext = useOptionalBookingContext();
    const renderContext = useOptionalBookingRenderContext();

    if (!bookingContext || !renderContext || bookingContext.state.step !== 'success') return null;

    return (
      <SuccessContentStep
        primaryColor={renderContext.primaryColor}
        successMessage={renderContext.successMessage}
        successContent={renderContext.successContent}
      />
    );
  },
);

export const BookingErrorStateSection = withBookingSection(
  'Booking Error State',
  'Terminal error state with retry action.',
  () => {
    const bookingContext = useOptionalBookingContext();
    const renderContext = useOptionalBookingRenderContext();

    if (!bookingContext || !renderContext || bookingContext.state.step !== 'error') return null;

    return <BookingErrorStep primaryColor={renderContext.primaryColor} />;
  },
);

export const bookingAuthorableSectionNames = [
  'BookingServiceSection',
  'BookingDateSection',
  'BookingResourceSection',
  'BookingSlotSection',
  'BookingCustomerSection',
  'BookingConfirmSection',
] as const;

export const bookingRegisteredSectionNames = [
  'BookingErrorBannerSection',
  'BookingServiceSection',
  'BookingDateSection',
  'BookingResourceSection',
  'BookingSlotSection',
  'BookingRangeCheckoutSection',
  'BookingCustomerSection',
  'BookingConfirmSection',
  'BookingSuccessSection',
  'BookingErrorStateSection',
] as const;

export const bookingPuckSectionComponents: Config['components'] = {
  BookingErrorBannerSection: BookingErrorBannerSection as Config['components'][string],
  BookingServiceSection: BookingServiceSection as Config['components'][string],
  BookingDateSection: BookingDateSection as Config['components'][string],
  BookingResourceSection: BookingResourceSection as Config['components'][string],
  BookingSlotSection: BookingSlotSection as Config['components'][string],
  BookingRangeCheckoutSection: BookingRangeCheckoutSection as Config['components'][string],
  BookingCustomerSection: BookingCustomerSection as Config['components'][string],
  BookingConfirmSection: BookingConfirmSection as Config['components'][string],
  BookingSuccessSection: BookingSuccessSection as Config['components'][string],
  BookingErrorStateSection: BookingErrorStateSection as Config['components'][string],
};

export const bookingPuckSectionCategories: Config['categories'] = {
  bookingSections: {
    components: [...bookingAuthorableSectionNames],
    title: 'Booking Sections',
    defaultExpanded: false,
  },
};
