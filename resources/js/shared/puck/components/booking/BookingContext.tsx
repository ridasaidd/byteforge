import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { makeInitialState, reducer, type WizardAction, type WizardState } from './state';

interface BookingContextValue {
  state: WizardState;
  dispatch: Dispatch<WizardAction>;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({
  children,
  initialServiceId,
}: {
  children: ReactNode;
  initialServiceId: number;
}) {
  const [state, dispatch] = useReducer(reducer, makeInitialState(initialServiceId));
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBookingContext(): BookingContextValue {
  const context = useOptionalBookingContext();

  if (!context) {
    throw new Error('useBookingContext must be used within a BookingProvider');
  }

  return context;
}

export function useOptionalBookingContext(): BookingContextValue | null {
  return useContext(BookingContext);
}

export function useBookingState(): WizardState {
  return useBookingContext().state;
}

export function useBookingDispatch(): Dispatch<WizardAction> {
  return useBookingContext().dispatch;
}
