export type BookingAuthorableStep =
  | 'service'
  | 'date'
  | 'resource'
  | 'slot'
  | 'range_checkout'
  | 'customer'
  | 'confirm';

export type BookingServiceMode = 'slot' | 'range';

type BookingMessageTone = 'info' | 'error';

export const bookingAuthorableSteps: BookingAuthorableStep[] = [
  'service',
  'date',
  'resource',
  'slot',
  'range_checkout',
  'customer',
  'confirm',
];

export const bookingStepLabels: Record<BookingAuthorableStep, string> = {
  service: 'Service',
  date: 'Date',
  resource: 'Resource',
  slot: 'Time',
  range_checkout: 'Check-out',
  customer: 'Details',
  confirm: 'Review',
};

export interface BookingFlowResolution {
  configuredOrder: BookingAuthorableStep[];
  normalizedOrder: BookingAuthorableStep[];
  runtimeOrder: BookingAuthorableStep[];
  supportedModes: BookingServiceMode[];
  usesServiceStep: boolean;
  usesFallback: boolean;
  message: string | null;
  messageTone: BookingMessageTone | null;
  selectionLabel: string | null;
}

const SLOT_ONLY_SUPPORTED_MODES: BookingServiceMode[] = ['slot'];

const SLOT_ONLY_UNSUPPORTED_STEP: BookingAuthorableStep = 'range_checkout';

function buildCanonicalBookingSectionOrder({
  usesServiceStep,
  includeSlot,
  includeRange,
}: {
  usesServiceStep: boolean;
  includeSlot: boolean;
  includeRange: boolean;
}): BookingAuthorableStep[] {
  const flow: BookingAuthorableStep[] = [];

  if (usesServiceStep) {
    flow.push('service');
  }

  flow.push('date', 'resource');

  if (includeSlot) {
    flow.push('slot');
  }

  if (includeRange) {
    flow.push('range_checkout');
  }

  flow.push('customer', 'confirm');

  return flow;
}

export function formatBookingSectionOrder(order: BookingAuthorableStep[]): string {
  return order.map((step) => bookingStepLabels[step]).join(' -> ');
}

function formatBookingSupportedRuntimeFlow(usesServiceStep: boolean, supportedModes: BookingServiceMode[]): string {
  const parts: string[] = [];

  if (usesServiceStep) {
    parts.push('Service');
  }

  parts.push('Date', 'Resource');

  if (supportedModes[0] === 'slot') {
    parts.push('Time');
  }

  parts.push('Details', 'Review');

  return parts.join(' -> ');
}

function dedupeBookingSectionOrder(order: BookingAuthorableStep[]) {
  const seen = new Set<BookingAuthorableStep>();
  const deduped: BookingAuthorableStep[] = [];
  const duplicates: BookingAuthorableStep[] = [];

  order.forEach((step) => {
    if (seen.has(step)) {
      duplicates.push(step);
      return;
    }

    seen.add(step);
    deduped.push(step);
  });

  return { deduped, duplicates, seen };
}

function buildRuntimeOrder(
  usesServiceStep: boolean,
  supportedModes: BookingServiceMode[],
  _selectedServiceMode?: BookingServiceMode,
): Pick<BookingFlowResolution, 'runtimeOrder' | 'selectionLabel'> {
  if (supportedModes[0] === 'slot') {
    return {
      runtimeOrder: buildCanonicalBookingSectionOrder({ usesServiceStep, includeSlot: true, includeRange: false }),
      selectionLabel: null,
    };
  }

  return {
    runtimeOrder: buildCanonicalBookingSectionOrder({ usesServiceStep, includeSlot: true, includeRange: false }),
    selectionLabel: null,
  };
}

function getMissingRequiredSteps(usesServiceStep: boolean, seen: Set<BookingAuthorableStep>): string[] {
  const missing: string[] = [];

  if (usesServiceStep && !seen.has('service')) {
    missing.push('Service');
  }

  ['date', 'resource', 'customer', 'confirm'].forEach((step) => {
    if (!seen.has(step as BookingAuthorableStep)) {
      missing.push(bookingStepLabels[step as BookingAuthorableStep]);
    }
  });

  if (!seen.has('slot') && !seen.has('range_checkout')) {
    missing.push('Time');
  }

  return missing;
}

function joinList(values: string[]): string {
  if (values.length <= 1) {
    return values[0] ?? '';
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function buildFallbackResolution(
  configuredOrder: BookingAuthorableStep[],
  serviceId: number,
  selectedServiceMode?: BookingServiceMode,
  message?: string,
): BookingFlowResolution {
  const usesServiceStep = serviceId === 0;
  const runtime = buildRuntimeOrder(
    usesServiceStep,
    SLOT_ONLY_SUPPORTED_MODES,
    selectedServiceMode === 'slot' ? 'slot' : undefined,
  );

  return {
    configuredOrder,
    normalizedOrder: buildCanonicalBookingSectionOrder({ usesServiceStep, includeSlot: true, includeRange: false }),
    runtimeOrder: runtime.runtimeOrder,
    supportedModes: SLOT_ONLY_SUPPORTED_MODES,
    usesServiceStep,
    usesFallback: true,
    message: message ?? null,
    messageTone: message ? 'error' : null,
    selectionLabel: runtime.selectionLabel,
  };
}

export function getDefaultBookingFlowResolution(
  serviceId: number,
  selectedServiceMode?: BookingServiceMode,
): BookingFlowResolution {
  return {
    ...buildFallbackResolution([], serviceId, selectedServiceMode),
    usesFallback: false,
  };
}

export function resolveBookingSectionFlow(
  configuredOrder: BookingAuthorableStep[],
  {
    serviceId,
    selectedServiceMode,
  }: {
    serviceId: number;
    selectedServiceMode?: BookingServiceMode;
  },
): BookingFlowResolution {
  if (configuredOrder.length === 0) {
    return buildFallbackResolution(
      configuredOrder,
      serviceId,
      selectedServiceMode,
      'No booking sections are configured. Storefront falls back to the safe default flow until the section slot is populated.',
    );
  }

  const usesServiceStep = serviceId === 0;
  const { deduped, duplicates, seen } = dedupeBookingSectionOrder(configuredOrder);
  const includeSlot = seen.has('slot');
  const includeRange = seen.has('range_checkout');
  const missingRequired = getMissingRequiredSteps(usesServiceStep, seen);
  const ignoredServiceStep = !usesServiceStep && seen.has('service');

  if (includeRange) {
    return buildFallbackResolution(
      configuredOrder,
      serviceId,
      selectedServiceMode,
      'Check-out sections are not supported in the current appointment booking widget. Use slot-based booking sections only.',
    );
  }

  if (missingRequired.length > 0) {
    return buildFallbackResolution(
      configuredOrder,
      serviceId,
      selectedServiceMode,
      `Sections mode is missing ${joinList(missingRequired)}. Storefront falls back to the safe default flow ${formatBookingSupportedRuntimeFlow(usesServiceStep, SLOT_ONLY_SUPPORTED_MODES)} until the section configuration is repaired.`,
    );
  }

  if (selectedServiceMode && selectedServiceMode !== 'slot') {
    return buildFallbackResolution(
      configuredOrder,
      serviceId,
      selectedServiceMode,
      'The current appointment booking widget only supports slot-based services. Storefront falls back to the safe default slot flow until the widget configuration is repaired.',
    );
  }

  const normalizedOrder = buildCanonicalBookingSectionOrder({
    usesServiceStep,
    includeSlot,
    includeRange: false,
  });
  const comparableConfiguredOrder = deduped
    .filter((step) => step !== SLOT_ONLY_UNSUPPORTED_STEP)
    .filter((step) => usesServiceStep || step !== 'service');
  const orderingChanged = comparableConfiguredOrder.join('|') !== normalizedOrder.join('|');
  const runtime = buildRuntimeOrder(usesServiceStep, SLOT_ONLY_SUPPORTED_MODES, 'slot');
  const shouldShowInfo = orderingChanged || duplicates.length > 0 || ignoredServiceStep;

  return {
    configuredOrder,
    normalizedOrder,
    runtimeOrder: runtime.runtimeOrder,
    supportedModes: SLOT_ONLY_SUPPORTED_MODES,
    usesServiceStep,
    usesFallback: false,
    message: shouldShowInfo
      ? `Storefront normalizes the saved section configuration to ${formatBookingSupportedRuntimeFlow(usesServiceStep, SLOT_ONLY_SUPPORTED_MODES)}. Editor composition is preserved visually, but runtime always follows the validated dependency order.`
      : null,
    messageTone: shouldShowInfo ? 'info' : null,
    selectionLabel: runtime.selectionLabel,
  };
}
