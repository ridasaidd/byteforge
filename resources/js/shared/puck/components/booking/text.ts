import type { WizardStep } from './state';
import type { BookingWidgetProps } from './types';

export interface BookingWidgetText {
  progressAriaLabel: string;
  progressCurrentStepText: string;
  progressCompleteStepText: string;
  progressUpcomingStepText: string;
  progressServiceLabel: string;
  progressDateLabel: string;
  progressResourceLabel: string;
  progressSlotLabel: string;
  progressCustomerLabel: string;
  progressConfirmLabel: string;
  progressSuccessLabel: string;
  progressErrorLabel: string;
  serviceStepTitle: string;
  dateStepTitle: string;
  resourceStepTitle: string;
  resourceStepTitleWithLabelPrefix: string;
  resourceAnyLabel: string;
  resourceAnySubtitle: string;
  slotStepTitlePrefix: string;
  customerStepTitle: string;
  confirmStepTitle: string;
  backButtonText: string;
  continueToReviewText: string;
  confirmBookingText: string;
  continueToPaymentText: string;
  editDetailsText: string;
  retryButtonText: string;
  fullNameLabelText: string;
  fullNamePlaceholderText: string;
  emailLabelText: string;
  emailPlaceholderText: string;
  phoneLabelText: string;
  phonePlaceholderText: string;
  notesLabelText: string;
  notesPlaceholderText: string;
  noResourcesAvailableText: string;
  noSlotsAvailableText: string;
  allSlotsBookedText: string;
  summaryServiceLabelText: string;
  summaryResourceLabelText: string;
  summaryDateLabelText: string;
  summaryTimeLabelText: string;
  summaryNameLabelText: string;
  summaryEmailLabelText: string;
  summaryPhoneLabelText: string;
  holdExpiresPrefixText: string;
  confirmationSentPrefixText: string;
  genericErrorTitleText: string;
}

export function getBookingWidgetText(props: Partial<BookingWidgetProps>): BookingWidgetText {
  return {
    progressAriaLabel: props.progressAriaLabel || 'Booking progress',
    progressCurrentStepText: props.progressCurrentStepText || 'Current step',
    progressCompleteStepText: props.progressCompleteStepText || 'Edit selection',
    progressUpcomingStepText: props.progressUpcomingStepText || 'Upcoming',
    progressServiceLabel: props.progressServiceLabel || 'Service',
    progressDateLabel: props.progressDateLabel || 'Date',
    progressResourceLabel: props.progressResourceLabel || 'Resource',
    progressSlotLabel: props.progressSlotLabel || 'Time',
    progressCustomerLabel: props.progressCustomerLabel || 'Details',
    progressConfirmLabel: props.progressConfirmLabel || 'Review',
    progressSuccessLabel: props.progressSuccessLabel || 'Complete',
    progressErrorLabel: props.progressErrorLabel || 'Resolve',
    serviceStepTitle: props.serviceStepTitle || 'Select a service',
    dateStepTitle: props.dateStepTitle || 'Choose a date',
    resourceStepTitle: props.resourceStepTitle || 'Choose a resource',
    resourceStepTitleWithLabelPrefix: props.resourceStepTitleWithLabelPrefix || 'Choose your',
    resourceAnyLabel: props.resourceAnyLabel || 'Any available',
    resourceAnySubtitle: props.resourceAnySubtitle || 'Assign me to the first available slot',
    slotStepTitlePrefix: props.slotStepTitlePrefix || 'Slots for',
    customerStepTitle: props.customerStepTitle || 'Your details',
    confirmStepTitle: props.confirmStepTitle || 'Confirm your booking',
    backButtonText: props.backButtonText || 'Back',
    continueToReviewText: props.continueToReviewText || 'Continue to review',
    confirmBookingText: props.confirmBookingText || 'Confirm booking',
    continueToPaymentText: props.continueToPaymentText || 'Continue to payment',
    editDetailsText: props.editDetailsText || 'Edit details',
    retryButtonText: props.retryButtonText || 'Try again',
    fullNameLabelText: props.fullNameLabelText || 'Full name *',
    fullNamePlaceholderText: props.fullNamePlaceholderText || 'Your name',
    emailLabelText: props.emailLabelText || 'Email *',
    emailPlaceholderText: props.emailPlaceholderText || 'your@email.com',
    phoneLabelText: props.phoneLabelText || 'Phone',
    phonePlaceholderText: props.phonePlaceholderText || '+46 70 000 00 00',
    notesLabelText: props.notesLabelText || 'Custom message',
    notesPlaceholderText: props.notesPlaceholderText || 'Share anything we should know...',
    noResourcesAvailableText: props.noResourcesAvailableText || 'No resources available on this date.',
    noSlotsAvailableText: props.noSlotsAvailableText || 'No availability configured for this date. Please try a different date.',
    allSlotsBookedText: props.allSlotsBookedText || 'All slots are booked on this date. Please try a different date.',
    summaryServiceLabelText: props.summaryServiceLabelText || 'Service',
    summaryResourceLabelText: props.summaryResourceLabelText || 'Resource',
    summaryDateLabelText: props.summaryDateLabelText || 'Date',
    summaryTimeLabelText: props.summaryTimeLabelText || 'Time',
    summaryNameLabelText: props.summaryNameLabelText || 'Name',
    summaryEmailLabelText: props.summaryEmailLabelText || 'Email',
    summaryPhoneLabelText: props.summaryPhoneLabelText || 'Phone',
    holdExpiresPrefixText: props.holdExpiresPrefixText || 'Your slot is reserved until',
    confirmationSentPrefixText: props.confirmationSentPrefixText || 'A confirmation has been sent to',
    genericErrorTitleText: props.genericErrorTitleText || 'Something went wrong',
  };
}

export function getBookingWidgetProgressLabel(
  step: WizardStep,
  fallbackLabel: string,
  text: BookingWidgetText,
): string {
  switch (step) {
    case 'service':
      return text.progressServiceLabel;
    case 'date':
      return text.progressDateLabel;
    case 'resource':
      return text.progressResourceLabel;
    case 'slot':
      return text.progressSlotLabel;
    case 'customer':
      return text.progressCustomerLabel;
    case 'confirm':
      return text.progressConfirmLabel;
    case 'success':
      return text.progressSuccessLabel;
    case 'error':
      return text.progressErrorLabel;
    default:
      return fallbackLabel;
  }
}

export function getBookingWidgetProgressStateText(
  status: 'upcoming' | 'current' | 'complete',
  text: BookingWidgetText,
): string {
  switch (status) {
    case 'current':
      return text.progressCurrentStepText;
    case 'complete':
      return text.progressCompleteStepText;
    default:
      return text.progressUpcomingStepText;
  }
}
