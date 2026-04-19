import type { ComponentConfig } from '@puckeditor/core';
import {
  BorderRadiusControl,
  ColorPickerControlColorful as ColorPickerControl,
  FontWeightControl,
  ResponsiveFontSizeControl,
  ResponsiveMaxWidthValue,
  ResponsiveSpacingControl,
  ResponsiveSpacingValue,
  ResponsiveWidthValue,
  ShadowControl,
  layoutFields,
  spacingFields,
  type BorderRadiusValue,
  type ColorValue,
  type FontWeightValue,
  type ResponsiveFontSizeValue,
  type ShadowValue,
} from '../../fields';
import { BookingWidgetRender } from './BookingWidget';
import { BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR } from './styles';
import type { BookingWidgetProps } from './types';

const BOOKING_SECTION_LAYOUT_ENABLED = false;

const LEGACY_PRIMARY_COLOR_TARGET_FIELDS = [
  'headerBg',
  'btnBg',
  'cardHoverBorderColor',
  'slotBorderColor',
  'slotColor',
  'calendarSelectedBg',
  'calendarTodayBorderColor',
  'processingSpinnerColor',
  'successIconColor',
] as const;

function toColorValue(value: string): ColorValue {
  return { type: 'custom', value };
}

const defaultColor = (value: string): ColorValue => ({ type: 'custom', value });

const defaultRadius = (value: string): BorderRadiusValue => ({
  topLeft: value,
  topRight: value,
  bottomRight: value,
  bottomLeft: value,
  unit: 'px',
  linked: true,
});

const defaultSpacing = (all: string): ResponsiveSpacingValue => ({
  mobile: { top: all, right: all, bottom: all, left: all, unit: 'px', linked: true },
});

const defaultInsetSpacing = (top: string, right: string, bottom: string, left: string): ResponsiveSpacingValue => ({
  mobile: { top, right, bottom, left, unit: 'px', linked: false },
});

const defaultFontSize = (value: string): ResponsiveFontSizeValue => ({
  mobile: { type: 'custom', value },
});

const defaultFontWeight = (value: string): FontWeightValue => ({
  type: 'custom',
  value,
});

const defaultShadow = (custom: string): ShadowValue => ({
  preset: 'custom',
  custom,
});

const defaultWidth = (value: string, unit: '%' | 'px' | 'vw' | 'rem' = '%'): ResponsiveWidthValue => ({
  mobile: { value, unit },
});

const defaultMaxWidth = (value: string, unit: 'px' | '%' | 'vw' | 'rem' | 'none' = 'px'): ResponsiveMaxWidthValue => ({
  mobile: { value, unit },
});

const defaultMargin = (top: string, right: string, bottom: string, left: string): ResponsiveSpacingValue => ({
  mobile: { top, right, bottom, left, unit: 'px', linked: false },
});

function toResponsiveMaxWidthValue(value: string): ResponsiveMaxWidthValue | undefined {
  if (!value) return undefined;
  if (value === 'none') {
    return { mobile: { value: 'none', unit: 'none' } };
  }

  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(px|%|vw|rem)$/);
  if (!match) return undefined;

  return {
    mobile: {
      value: match[1],
      unit: match[2] as 'px' | '%' | 'vw' | 'rem',
    },
  };
}

function createTextField(label: string) {
  return {
    type: 'text' as const,
    label,
  };
}

function createBooleanField(label: string) {
  return {
    type: 'radio' as const,
    label,
    options: [
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ],
  };
}

function createColorField(label: string, fallback: ColorValue) {
  return {
    type: 'custom' as const,
    label,
    render: (props: { field: { label?: string }; value?: ColorValue; onChange: (value: ColorValue) => void }) => (
      <ColorPickerControl field={props.field} value={props.value || fallback} onChange={props.onChange} />
    ),
  };
}

function createRadiusField(label: string, fallback: BorderRadiusValue) {
  return {
    type: 'custom' as const,
    label,
    render: (props: { field: { label?: string }; value?: BorderRadiusValue; onChange: (value: BorderRadiusValue) => void }) => (
      <BorderRadiusControl field={props.field} value={props.value || fallback} onChange={props.onChange} />
    ),
  };
}

function createSpacingField(label: string, fallback: ResponsiveSpacingValue) {
  return {
    type: 'custom' as const,
    label,
    render: (props: { field: { label?: string }; value?: ResponsiveSpacingValue; onChange: (value: ResponsiveSpacingValue) => void }) => (
      <ResponsiveSpacingControl field={props.field} value={props.value || fallback} onChange={props.onChange} allowNegative={false} />
    ),
  };
}

function createFontSizeField(label: string, fallback: ResponsiveFontSizeValue) {
  return {
    type: 'custom' as const,
    label,
    render: (props: { field: { label?: string }; value?: ResponsiveFontSizeValue; onChange: (value: ResponsiveFontSizeValue) => void }) => (
      <ResponsiveFontSizeControl field={props.field} value={props.value || fallback} onChange={props.onChange} />
    ),
  };
}

function createFontWeightField(label: string, fallback: FontWeightValue) {
  return {
    type: 'custom' as const,
    label,
    render: (props: { field: { label?: string }; value?: FontWeightValue; onChange: (value: FontWeightValue) => void }) => (
      <FontWeightControl field={props.field} value={props.value || fallback} onChange={props.onChange} />
    ),
  };
}

function createShadowField(label: string, fallback: ShadowValue) {
  return {
    type: 'custom' as const,
    label,
    render: (props: { field: { label?: string }; value?: ShadowValue; onChange: (value: ShadowValue) => void }) => (
      <ShadowControl field={props.field} value={props.value || fallback} onChange={props.onChange} />
    ),
  };
}

export const BookingWidget: ComponentConfig<BookingWidgetProps> = {
  label: 'Booking Widget',

  resolveData: ({ props }) => {
    const nextProps = {
      ...props,
      layoutMode: BOOKING_SECTION_LAYOUT_ENABLED ? props.layoutMode : 'legacy',
    } as BookingWidgetProps & Record<string, unknown>;

    if (!props.maxWidth && typeof props.containerMaxWidth === 'string') {
      const migratedMaxWidth = toResponsiveMaxWidthValue(props.containerMaxWidth);
      if (migratedMaxWidth) {
        nextProps.maxWidth = migratedMaxWidth;
      }
    }

    if (typeof props.primaryColor !== 'string' || !props.primaryColor) {
      return { props: nextProps };
    }

    LEGACY_PRIMARY_COLOR_TARGET_FIELDS.forEach((fieldName) => {
      if (!nextProps[fieldName]) {
        nextProps[fieldName] = toColorValue(props.primaryColor as string);
      }
    });

    delete nextProps.primaryColor;

    return { props: nextProps };
  },

  fields: {
    headerContent: {
      type: 'slot',
      label: 'Heading',
      allow: ['Heading'],
    },
    successContent: {
      type: 'slot',
      label: 'Success Content',
    },
    serviceId: {
      type: 'number',
      label: 'Pre-selected Service ID (0 = customer picks)',
    },
    showProgress: createBooleanField('Show Progress Steps'),
    progressOrientation: {
      type: 'select',
      label: 'Progress Layout',
      options: [
        { label: 'Vertical', value: 'vertical' },
        { label: 'Horizontal', value: 'horizontal' },
      ],
    },
    autoSkipSingleResource: createBooleanField('Auto-skip Single Resource'),
    showResourceDescription: createBooleanField('Show Resource Descriptions'),
    showPrices: {
      type: 'radio',
      label: 'Show prices',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    successMessage: {
      type: 'text',
      label: 'Success message',
    },
    width: {
      ...layoutFields.width,
      label: 'Container Width',
    },
    maxWidth: {
      ...layoutFields.maxWidth,
      label: 'Container Max Width',
    },
    margin: {
      ...spacingFields.margin,
      label: 'Container Margin',
    },
    containerBg: createColorField('Container Background', defaultColor('#ffffff')),
    containerBorderRadius: createRadiusField('Container Radius', defaultRadius('12')),
    containerShadow: createShadowField('Container Shadow', defaultShadow('0 1px 8px rgba(0, 0, 0, 0.08)')),
    containerPadding: createSpacingField('Container Padding', defaultSpacing('20')),
    headerBg: createColorField('Header Background', defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR)),
    headerColor: createColorField('Header Text Color', defaultColor('#ffffff')),
    headerFontSize: createFontSizeField('Header Font Size', defaultFontSize('18px')),
    headerFontWeight: createFontWeightField('Header Font Weight', defaultFontWeight('700')),
    headerPadding: createSpacingField('Header Padding', defaultInsetSpacing('16', '20', '16', '20')),
    progressStepBg: createColorField('Progress Step Background', defaultColor('#ffffff')),
    progressStepBorderColor: createColorField('Progress Step Border', defaultColor('#e5e7eb')),
    progressStepActiveBg: createColorField('Progress Active Background', defaultColor('rgba(59, 130, 246, 0.07)')),
    progressStepActiveBorderColor: createColorField('Progress Active Border', defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR)),
    progressStepCompleteBg: createColorField('Progress Complete Background', defaultColor('#ffffff')),
    progressStepCompleteBorderColor: createColorField('Progress Complete Border', defaultColor('#e5e7eb')),
    progressLabelColor: createColorField('Progress Label Color', defaultColor('#111827')),
    progressStateColor: createColorField('Progress State Color', defaultColor('#6b7280')),
    progressBadgeSize: {
      type: 'select',
      label: 'Progress Badge Size',
      options: [
        { label: '24px', value: '24px' },
        { label: '28px', value: '28px' },
        { label: '32px', value: '32px' },
        { label: '36px', value: '36px' },
        { label: '40px', value: '40px' },
      ],
    },
    progressLabelFontSize: createFontSizeField('Progress Label Font Size', defaultFontSize('13px')),
    progressStateFontSize: createFontSizeField('Progress State Font Size', defaultFontSize('12px')),
    cardBorderColor: createColorField('Card Border Color', defaultColor('#e5e7eb')),
    cardHoverBorderColor: createColorField('Card Hover Border', defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR)),
    cardHoverBg: createColorField('Card Hover Background', defaultColor('rgba(59, 130, 246, 0.07)')),
    cardBorderRadius: createRadiusField('Card Radius', defaultRadius('8')),
    cardPadding: createSpacingField('Card Padding', defaultInsetSpacing('12', '16', '12', '16')),
    cardTitleFontSize: createFontSizeField('Card Title Font Size', defaultFontSize('14px')),
    cardTitleFontWeight: createFontWeightField('Card Title Font Weight', defaultFontWeight('600')),
    cardSubtitleFontSize: createFontSizeField('Card Subtitle Font Size', defaultFontSize('12px')),
    cardSubtitleColor: createColorField('Card Subtitle Color', defaultColor('#6b7280')),
    calendarSelectedBg: createColorField('Calendar Selected Background', defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR)),
    calendarSelectedColor: createColorField('Calendar Selected Text', defaultColor('#ffffff')),
    calendarTodayBorderColor: createColorField('Calendar Today Border', defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR)),
    formInputBorderColor: createColorField('Form Input Border', defaultColor('#e5e7eb')),
    formInputBorderRadius: createRadiusField('Form Input Radius', defaultRadius('6')),
    formInputFontSize: createFontSizeField('Form Input Font Size', defaultFontSize('14px')),
    formLabelColor: createColorField('Form Label Color', defaultColor('#374151')),
    formLabelFontSize: createFontSizeField('Form Label Font Size', defaultFontSize('13px')),
    formLabelFontWeight: createFontWeightField('Form Label Font Weight', defaultFontWeight('600')),
    btnBg: createColorField('Button Background', defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR)),
    btnColor: createColorField('Button Text Color', defaultColor('#ffffff')),
    btnBorderRadius: createRadiusField('Button Radius', defaultRadius('8')),
    btnFontSize: createFontSizeField('Button Font Size', defaultFontSize('14px')),
    btnFontWeight: createFontWeightField('Button Font Weight', defaultFontWeight('600')),
    btnDisabledBg: createColorField('Button Disabled Background', defaultColor('#9ca3af')),
    processingSpinnerColor: createColorField('Processing Spinner Color', defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR)),
    processingTitleColor: createColorField('Processing Title Color', defaultColor('#111827')),
    processingTextColor: createColorField('Processing Text Color', defaultColor('#6b7280')),
    slotBorderColor: createColorField('Slot Border Color', defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR)),
    slotColor: createColorField('Slot Text Color', defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR)),
    slotBorderRadius: createRadiusField('Slot Radius', defaultRadius('6')),
    slotPadding: createSpacingField('Slot Padding', defaultInsetSpacing('8', '4', '8', '4')),
    slotFontSize: createFontSizeField('Slot Font Size', defaultFontSize('13px')),
    slotFontWeight: createFontWeightField('Slot Font Weight', defaultFontWeight('600')),
    stepHeadingFontSize: createFontSizeField('Step Heading Font Size', defaultFontSize('15px')),
    stepHeadingFontWeight: createFontWeightField('Step Heading Font Weight', defaultFontWeight('600')),
    summaryFontSize: createFontSizeField('Summary Font Size', defaultFontSize('14px')),
    summaryLabelColor: createColorField('Summary Label Color', defaultColor('#6b7280')),
    summaryValueColor: createColorField('Summary Value Color', defaultColor('#111827')),
    mutedColor: createColorField('Muted Text Color', defaultColor('#6b7280')),
    successIconColor: createColorField('Success Icon Color', defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR)),
    errorBg: createColorField('Error Background', defaultColor('#fef2f2')),
    errorBorderColor: createColorField('Error Border Color', defaultColor('#fca5a5')),
    errorColor: createColorField('Error Text Color', defaultColor('#dc2626')),
    progressAriaLabel: createTextField('Text: Progress Aria Label'),
    progressCurrentStepText: createTextField('Text: Progress Current Step'),
    progressCompleteStepText: createTextField('Text: Progress Complete Step'),
    progressUpcomingStepText: createTextField('Text: Progress Upcoming Step'),
    progressServiceLabel: createTextField('Text: Progress Service Label'),
    progressDateLabel: createTextField('Text: Progress Date Label'),
    progressResourceLabel: createTextField('Text: Progress Resource Label'),
    progressSlotLabel: createTextField('Text: Progress Time Label'),
    progressCustomerLabel: createTextField('Text: Progress Details Label'),
    progressConfirmLabel: createTextField('Text: Progress Review Label'),
    progressSuccessLabel: createTextField('Text: Progress Complete Label'),
    progressErrorLabel: createTextField('Text: Progress Error Label'),
    serviceStepTitle: createTextField('Text: Service Step Title'),
    dateStepTitle: createTextField('Text: Date Step Title'),
    resourceStepTitle: createTextField('Text: Resource Step Title'),
    resourceStepTitleWithLabelPrefix: createTextField('Text: Resource Label Prefix'),
    resourceAnyLabel: createTextField('Text: Any Resource Label'),
    resourceAnySubtitle: createTextField('Text: Any Resource Subtitle'),
    slotStepTitlePrefix: createTextField('Text: Time Step Prefix'),
    customerStepTitle: createTextField('Text: Details Step Title'),
    confirmStepTitle: createTextField('Text: Confirmation Step Title'),
    backButtonText: createTextField('Text: Back Button'),
    continueToReviewText: createTextField('Text: Continue To Review'),
    confirmBookingText: createTextField('Text: Confirm Booking'),
    continueToPaymentText: createTextField('Text: Continue To Payment'),
    editDetailsText: createTextField('Text: Edit Details'),
    retryButtonText: createTextField('Text: Retry Button'),
    fullNameLabelText: createTextField('Text: Full Name Label'),
    fullNamePlaceholderText: createTextField('Text: Full Name Placeholder'),
    emailLabelText: createTextField('Text: Email Label'),
    emailPlaceholderText: createTextField('Text: Email Placeholder'),
    phoneLabelText: createTextField('Text: Phone Label'),
    phonePlaceholderText: createTextField('Text: Phone Placeholder'),
    notesLabelText: createTextField('Text: Custom Message Label'),
    notesPlaceholderText: createTextField('Text: Custom Message Placeholder'),
    noResourcesAvailableText: createTextField('Text: No Resources Message'),
    noSlotsAvailableText: createTextField('Text: No Slots Message'),
    allSlotsBookedText: createTextField('Text: All Slots Booked Message'),
    summaryServiceLabelText: createTextField('Text: Summary Service Label'),
    summaryResourceLabelText: createTextField('Text: Summary Resource Label'),
    summaryDateLabelText: createTextField('Text: Summary Date Label'),
    summaryTimeLabelText: createTextField('Text: Summary Time Label'),
    summaryNameLabelText: createTextField('Text: Summary Name Label'),
    summaryEmailLabelText: createTextField('Text: Summary Email Label'),
    summaryPhoneLabelText: createTextField('Text: Summary Phone Label'),
    holdExpiresPrefixText: createTextField('Text: Hold Expires Prefix'),
    confirmationSentPrefixText: createTextField('Text: Confirmation Sent Prefix'),
    genericErrorTitleText: createTextField('Text: Generic Error Title'),
  },

  defaultProps: {
    layoutMode: 'legacy',
    serviceId: 0,
    showProgress: true,
    progressOrientation: 'vertical',
    autoSkipSingleResource: false,
    showResourceDescription: false,
    width: defaultWidth('100'),
    maxWidth: defaultMaxWidth('420'),
    margin: defaultMargin('0', 'auto', '0', 'auto'),
    containerBg: defaultColor('#ffffff'),
    containerBorderRadius: defaultRadius('12'),
    containerShadow: defaultShadow('0 1px 8px rgba(0, 0, 0, 0.08)'),
    containerPadding: defaultSpacing('20'),
    headerBg: defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR),
    headerColor: defaultColor('#ffffff'),
    headerFontSize: defaultFontSize('18px'),
    headerFontWeight: defaultFontWeight('700'),
    headerPadding: defaultInsetSpacing('16', '20', '16', '20'),
    progressStepBg: defaultColor('#ffffff'),
    progressStepBorderColor: defaultColor('#e5e7eb'),
    progressStepActiveBg: defaultColor('rgba(59, 130, 246, 0.07)'),
    progressStepActiveBorderColor: defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR),
    progressStepCompleteBg: defaultColor('#ffffff'),
    progressStepCompleteBorderColor: defaultColor('#e5e7eb'),
    progressLabelColor: defaultColor('#111827'),
    progressStateColor: defaultColor('#6b7280'),
    progressBadgeSize: '28px',
    progressLabelFontSize: defaultFontSize('13px'),
    progressStateFontSize: defaultFontSize('12px'),
    cardBorderColor: defaultColor('#e5e7eb'),
    cardHoverBorderColor: defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR),
    cardHoverBg: defaultColor('rgba(59, 130, 246, 0.07)'),
    cardBorderRadius: defaultRadius('8'),
    cardPadding: defaultInsetSpacing('12', '16', '12', '16'),
    cardTitleFontSize: defaultFontSize('14px'),
    cardTitleFontWeight: defaultFontWeight('600'),
    cardSubtitleFontSize: defaultFontSize('12px'),
    cardSubtitleColor: defaultColor('#6b7280'),
    calendarSelectedBg: defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR),
    calendarSelectedColor: defaultColor('#ffffff'),
    calendarTodayBorderColor: defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR),
    formInputBorderColor: defaultColor('#e5e7eb'),
    formInputBorderRadius: defaultRadius('6'),
    formInputFontSize: defaultFontSize('14px'),
    formLabelColor: defaultColor('#374151'),
    formLabelFontSize: defaultFontSize('13px'),
    formLabelFontWeight: defaultFontWeight('600'),
    btnBg: defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR),
    btnColor: defaultColor('#ffffff'),
    btnBorderRadius: defaultRadius('8'),
    btnFontSize: defaultFontSize('14px'),
    btnFontWeight: defaultFontWeight('600'),
    btnDisabledBg: defaultColor('#9ca3af'),
    processingSpinnerColor: defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR),
    processingTitleColor: defaultColor('#111827'),
    processingTextColor: defaultColor('#6b7280'),
    slotBorderColor: defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR),
    slotColor: defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR),
    slotBorderRadius: defaultRadius('6'),
    slotPadding: defaultInsetSpacing('8', '4', '8', '4'),
    slotFontSize: defaultFontSize('13px'),
    slotFontWeight: defaultFontWeight('600'),
    stepHeadingFontSize: defaultFontSize('15px'),
    stepHeadingFontWeight: defaultFontWeight('600'),
    summaryFontSize: defaultFontSize('14px'),
    summaryLabelColor: defaultColor('#6b7280'),
    summaryValueColor: defaultColor('#111827'),
    mutedColor: defaultColor('#6b7280'),
    successIconColor: defaultColor(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR),
    errorBg: defaultColor('#fef2f2'),
    errorBorderColor: defaultColor('#fca5a5'),
    errorColor: defaultColor('#dc2626'),
    showPrices: true,
    successMessage: 'Your booking is confirmed!',
  },

  render: BookingWidgetRender,
};
