import type { FC, ReactNode } from 'react';
import type {
  BorderRadiusValue,
  ColorValue,
  FontWeightValue,
  ResponsiveFontSizeValue,
  ResponsiveMaxWidthValue,
  ResponsiveSpacingValue,
  ResponsiveWidthValue,
  ShadowValue,
} from '../../fields';

export interface BookingService {
  id: number;
  name: string;
  description: string | null;
  booking_mode: 'slot' | 'range';
  duration_minutes: number | null;
  price: number | null;
  currency: string | null;
  requires_payment?: boolean;
}

export interface BookingResource {
  id: number;
  name: string;
  type: string;
  description?: string | null;
  resource_label: string | null;
}

export interface Slot {
  starts_at: string;
  ends_at: string;
  available: boolean;
}

export type BookingLayoutMode = 'legacy' | 'sections';
export type BookingProgressOrientation = 'vertical' | 'horizontal';

export interface BookingSlotProps {
  className?: string;
  minEmptyHeight?: string | number;
}

export type BookingSlotComponent = (props?: BookingSlotProps) => ReactNode;

export interface BookingWidgetProps {
  id?: string;
  puck?: { isEditing?: boolean; dragRef?: ((element: Element | null) => void) | null };
  title?: string;
  headerContent?: FC | BookingSlotComponent;
  successContent?: FC | BookingSlotComponent;
  serviceId: number;
  primaryColor?: string | ColorValue;
  containerBg?: ColorValue;
  containerBorderRadius?: BorderRadiusValue;
  containerShadow?: ShadowValue;
  containerMaxWidth?: string;
  width?: ResponsiveWidthValue;
  maxWidth?: ResponsiveMaxWidthValue;
  margin?: ResponsiveSpacingValue;
  containerPadding?: ResponsiveSpacingValue;
  headerBg?: ColorValue;
  headerColor?: ColorValue;
  headerFontSize?: ResponsiveFontSizeValue;
  headerFontWeight?: FontWeightValue;
  headerPadding?: ResponsiveSpacingValue;
  showProgress?: boolean;
  progressOrientation?: BookingProgressOrientation;
  progressStepBg?: ColorValue;
  progressStepBorderColor?: ColorValue;
  progressStepActiveBg?: ColorValue;
  progressStepActiveBorderColor?: ColorValue;
  progressStepCompleteBg?: ColorValue;
  progressStepCompleteBorderColor?: ColorValue;
  progressLabelColor?: ColorValue;
  progressStateColor?: ColorValue;
  progressBadgeSize?: string;
  progressLabelFontSize?: ResponsiveFontSizeValue;
  progressStateFontSize?: ResponsiveFontSizeValue;
  cardBorderColor?: ColorValue;
  cardHoverBorderColor?: ColorValue;
  cardHoverBg?: ColorValue;
  cardBorderRadius?: BorderRadiusValue;
  cardPadding?: ResponsiveSpacingValue;
  cardTitleFontSize?: ResponsiveFontSizeValue;
  cardTitleFontWeight?: FontWeightValue;
  cardSubtitleFontSize?: ResponsiveFontSizeValue;
  cardSubtitleColor?: ColorValue;
  calendarSelectedBg?: ColorValue;
  calendarSelectedColor?: ColorValue;
  calendarTodayBorderColor?: ColorValue;
  formInputBorderColor?: ColorValue;
  formInputBorderRadius?: BorderRadiusValue;
  formInputFontSize?: ResponsiveFontSizeValue;
  formLabelColor?: ColorValue;
  formLabelFontSize?: ResponsiveFontSizeValue;
  formLabelFontWeight?: FontWeightValue;
  btnBg?: ColorValue;
  btnColor?: ColorValue;
  btnBorderRadius?: BorderRadiusValue;
  btnFontSize?: ResponsiveFontSizeValue;
  btnFontWeight?: FontWeightValue;
  btnDisabledBg?: ColorValue;
  processingSpinnerColor?: ColorValue;
  processingTitleColor?: ColorValue;
  processingTextColor?: ColorValue;
  slotBorderColor?: ColorValue;
  slotColor?: ColorValue;
  slotBorderRadius?: BorderRadiusValue;
  slotPadding?: ResponsiveSpacingValue;
  slotFontSize?: ResponsiveFontSizeValue;
  slotFontWeight?: FontWeightValue;
  stepHeadingFontSize?: ResponsiveFontSizeValue;
  stepHeadingFontWeight?: FontWeightValue;
  summaryFontSize?: ResponsiveFontSizeValue;
  summaryLabelColor?: ColorValue;
  summaryValueColor?: ColorValue;
  mutedColor?: ColorValue;
  successIconColor?: ColorValue;
  errorBg?: ColorValue;
  errorBorderColor?: ColorValue;
  errorColor?: ColorValue;
  autoSkipSingleResource?: boolean;
  showResourceDescription?: boolean;
  progressAriaLabel?: string;
  progressCurrentStepText?: string;
  progressCompleteStepText?: string;
  progressUpcomingStepText?: string;
  progressServiceLabel?: string;
  progressDateLabel?: string;
  progressResourceLabel?: string;
  progressSlotLabel?: string;
  progressCustomerLabel?: string;
  progressConfirmLabel?: string;
  progressSuccessLabel?: string;
  progressErrorLabel?: string;
  serviceStepTitle?: string;
  dateStepTitle?: string;
  resourceStepTitle?: string;
  resourceStepTitleWithLabelPrefix?: string;
  resourceAnyLabel?: string;
  resourceAnySubtitle?: string;
  slotStepTitlePrefix?: string;
  customerStepTitle?: string;
  confirmStepTitle?: string;
  backButtonText?: string;
  continueToReviewText?: string;
  confirmBookingText?: string;
  continueToPaymentText?: string;
  editDetailsText?: string;
  retryButtonText?: string;
  fullNameLabelText?: string;
  fullNamePlaceholderText?: string;
  emailLabelText?: string;
  emailPlaceholderText?: string;
  phoneLabelText?: string;
  phonePlaceholderText?: string;
  notesLabelText?: string;
  notesPlaceholderText?: string;
  noResourcesAvailableText?: string;
  noSlotsAvailableText?: string;
  allSlotsBookedText?: string;
  summaryServiceLabelText?: string;
  summaryResourceLabelText?: string;
  summaryDateLabelText?: string;
  summaryTimeLabelText?: string;
  summaryNameLabelText?: string;
  summaryEmailLabelText?: string;
  summaryPhoneLabelText?: string;
  holdExpiresPrefixText?: string;
  confirmationSentPrefixText?: string;
  genericErrorTitleText?: string;
  showPrices: boolean;
  successMessage: string;
  layoutMode?: BookingLayoutMode;
  sections?: FC | BookingSlotComponent;
}

export interface PaymentWidgetProps {
  id?: string;
  puck?: { isEditing?: boolean; dragRef?: ((element: Element | null) => void) | null };
  primaryColor?: ColorValue | string;
  standalone?: boolean;
}
