import { createContext, useContext, type ReactNode } from 'react';
import type { WizardState } from './state';
import type { BookingAuthorableStep, BookingFlowResolution, BookingServiceMode } from './sectionOrder';
import type { BookingWidgetText } from './text';
import type { BookingProgressOrientation, BookingWidgetProps } from './types';

export interface BookingRenderContextValue {
  serviceId: number;
  primaryColor: string;
  showPrices: boolean;
  successMessage: string;
  successContent?: BookingWidgetProps['successContent'];
  timeFormat: string;
  flowResolution: BookingFlowResolution;
  submitHold: (customer: NonNullable<WizardState['customer']>) => void;
  submitConfirm: () => void;
  getNextStep: (step: BookingAuthorableStep, serviceMode?: BookingServiceMode) => BookingAuthorableStep | null;
  getPreviousStep: (step: BookingAuthorableStep, serviceMode?: BookingServiceMode) => BookingAuthorableStep | null;
  showProgress: boolean;
  progressOrientation: BookingProgressOrientation;
  autoSkipSingleResource: boolean;
  showResourceDescription: boolean;
  text: BookingWidgetText;
  mode?: 'runtime' | 'order-inspection';
  inspectionStep?: BookingAuthorableStep;
}

const BookingRenderContext = createContext<BookingRenderContextValue | null>(null);

export function BookingRenderProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: BookingRenderContextValue;
}) {
  return <BookingRenderContext.Provider value={value}>{children}</BookingRenderContext.Provider>;
}

export function useOptionalBookingRenderContext(): BookingRenderContextValue | null {
  return useContext(BookingRenderContext);
}

export function useBookingRenderContext(): BookingRenderContextValue {
  const context = useOptionalBookingRenderContext();

  if (!context) {
    throw new Error('useBookingRenderContext must be used within a BookingRenderProvider');
  }

  return context;
}
