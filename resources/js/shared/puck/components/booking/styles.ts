import {
  generateMarginCSS,
  generateMaxWidthCSS,
  generateWidthCSS,
  getValueForBreakpoint,
  type BorderRadiusValue,
  type ColorValue,
  type FontSizeValue,
  type FontWeightValue,
  type ResponsiveFontSizeValue,
  type ResponsiveSpacingValue,
  type ShadowValue,
  type SpacingValue,
} from '../../fields';
import type { BookingWidgetProps } from './types';

export const BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR = '#3b82f6';

export const BOOKING_WIDGET_STATIC_CSS = `
@keyframes bw-spin {
  to {
    transform: rotate(360deg);
  }
}

.bw-root {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  background: var(--bw-container-bg);
  border-radius: var(--bw-container-border-radius);
  box-shadow: var(--bw-container-shadow);
  overflow: hidden;
  font-family: inherit;
}

.bw-shell-header {
  background: var(--bw-header-bg);
  color: var(--bw-header-color);
  padding: var(--bw-header-padding);
  font-weight: var(--bw-header-font-weight);
  font-size: var(--bw-header-font-size);
}

.bw-shell-body {
  padding: var(--bw-container-padding);
}

.bw-flow-nav {
  display: grid;
  gap: var(--bw-progress-gap);
  margin-bottom: 20px;
}

.bw-flow-nav.is-horizontal {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
}

.bw-flow-nav.is-horizontal .bw-flow-step {
  flex: 1 1 160px;
  width: auto;
}

.bw-sections-slot {
  display: grid;
  gap: 10px;
}

.bw-sections-slot.is-editing {
  min-height: 96px;
}

.bw-sections-dropzone {
  display: grid;
  gap: 10px;
}

.bw-flow-step {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  border: 1px solid var(--bw-progress-step-border-color);
  border-radius: var(--bw-card-border-radius);
  background: var(--bw-progress-step-bg);
  color: inherit;
}

.bw-flow-step.is-active {
  border-color: var(--bw-progress-step-active-border-color);
  background: var(--bw-progress-step-active-bg);
}

.bw-flow-step.is-complete {
  border-color: var(--bw-progress-step-complete-border-color);
  background: var(--bw-progress-step-complete-bg);
}

.bw-flow-step.is-clickable {
  cursor: pointer;
}

.bw-flow-step:disabled {
  opacity: 1;
}

.bw-flow-step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--bw-progress-badge-size);
  height: var(--bw-progress-badge-size);
  border-radius: 999px;
  border: 1px solid var(--bw-progress-step-border-color);
  color: var(--bw-muted-color);
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.bw-flow-step.is-active .bw-flow-step-badge,
.bw-flow-step.is-complete .bw-flow-step-badge {
  border-color: var(--bw-btn-bg);
  background: var(--bw-btn-bg);
  color: var(--bw-btn-color);
}

.bw-flow-step-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.bw-flow-step-label {
  font-size: var(--bw-progress-label-font-size);
  font-weight: 600;
  color: var(--bw-progress-label-color);
}

.bw-flow-step-state {
  font-size: var(--bw-progress-state-font-size);
  color: var(--bw-progress-state-color);
}

.bw-step-heading {
  margin: 0 0 16px;
  font-size: var(--bw-step-heading-font-size);
  font-weight: var(--bw-step-heading-font-weight);
}

.bw-back-button {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--bw-muted-color);
  font-size: 13px;
  padding: 0 0 12px;
}

.bw-card-grid {
  display: grid;
  gap: 8px;
}

.bw-card {
  width: 100%;
  text-align: left;
  padding: var(--bw-card-padding);
  border-radius: var(--bw-card-border-radius);
  border: 1px solid var(--bw-card-border-color);
  background: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
}

.bw-card:hover {
  border-color: var(--bw-card-hover-border-color);
  background: var(--bw-card-hover-bg);
}

.bw-card-title {
  font-weight: var(--bw-card-title-font-weight);
  font-size: var(--bw-card-title-font-size);
}

.bw-card-subtitle {
  font-size: var(--bw-card-subtitle-font-size);
  color: var(--bw-card-subtitle-color);
  margin-top: 2px;
  line-height: 1.5;
}

.bw-calendar {
  user-select: none;
}

.bw-calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.bw-calendar-nav {
  padding: 4px 8px;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 4px;
}

.bw-calendar-month {
  font-weight: 600;
  font-size: 15px;
}

.bw-calendar-weekdays,
.bw-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.bw-calendar-weekdays {
  margin-bottom: 4px;
}

.bw-calendar-weekday {
  text-align: center;
  font-size: 11px;
  color: #9ca3af;
  font-weight: 600;
  padding: 2px 0;
}

.bw-calendar-day {
  padding: 6px 0;
  text-align: center;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: #111827;
  cursor: pointer;
  font-weight: 400;
  transition: background 0.15s ease;
}

.bw-calendar-day.is-today:not(.is-selected) {
  border-color: var(--bw-calendar-today-border-color);
}

.bw-calendar-day.is-selected {
  background: var(--bw-calendar-selected-bg);
  color: var(--bw-calendar-selected-color);
  font-weight: 700;
}

.bw-calendar-day.is-disabled,
.bw-calendar-day.is-outside-month {
  color: #d1d5db;
}

.bw-calendar-day.is-disabled {
  cursor: not-allowed;
}

.bw-slot-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.bw-slot {
  padding: var(--bw-slot-padding);
  text-align: center;
  border-radius: var(--bw-slot-border-radius);
  border: 1px solid var(--bw-slot-border-color);
  background: #fff;
  color: var(--bw-slot-color);
  cursor: pointer;
  font-weight: var(--bw-slot-font-weight);
  font-size: var(--bw-slot-font-size);
  transition: all 0.15s ease;
}

.bw-muted-text,
.bw-slot-empty,
.bw-meta,
.bw-state-text,
.bw-editor-card-copy,
.bw-editor-guard-copy {
  color: var(--bw-muted-color);
  font-size: 13px;
}

.bw-slot-empty {
  grid-column: 1 / -1;
}

.bw-form {
  display: block;
}

.bw-label {
  display: block;
  font-size: var(--bw-form-label-font-size);
  font-weight: var(--bw-form-label-font-weight);
  margin-bottom: 4px;
  color: var(--bw-form-label-color);
}

.bw-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--bw-form-input-border-color);
  border-radius: var(--bw-form-input-border-radius);
  font-size: var(--bw-form-input-font-size);
  box-sizing: border-box;
  margin-bottom: 10px;
  outline: none;
}

.bw-btn:disabled {
  background: var(--bw-btn-disabled-bg);
  cursor: not-allowed;
}

.bw-error-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--bw-error-bg);
  border: 1px solid var(--bw-error-border-color);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--bw-error-color);
}

.bw-error-banner-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.bw-error-banner-message {
  flex: 1;
}

.bw-error-banner-dismiss {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--bw-error-color);
  padding: 0;
}

.bw-summary {
  font-size: var(--bw-summary-font-size);
  line-height: 1.7;
  margin-bottom: 16px;
}

.bw-summary-row {
  display: flex;
  gap: 8px;
}

.bw-summary-label {
  color: var(--bw-summary-label-color);
  min-width: 80px;
}

.bw-summary-value {
  font-weight: 500;
  color: var(--bw-summary-value-color);
}

.bw-secondary-action {
  display: block;
  width: 100%;
  margin-top: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--bw-muted-color);
  font-size: 13px;
}

.bw-state {
  text-align: center;
  padding: 24px 0;
}

.bw-state-title {
  font-weight: 700;
  font-size: 16px;
  margin: 0 0 8px;
}

.bw-state-title.processing {
  color: var(--bw-processing-title-color);
}

.bw-state-text.processing {
  color: var(--bw-processing-text-color);
}

.bw-state-icon {
  display: inline-block;
  margin-bottom: 12px;
}

.bw-state-icon.success {
  color: var(--bw-success-icon-color);
}

.bw-state-icon.error {
  color: var(--bw-error-color);
}

.bw-state-icon.processing {
  color: var(--bw-processing-spinner-color);
}

.bw-spinner {
  animation: bw-spin 1s linear infinite;
}

.bw-loading {
  display: block;
  margin: 24px auto;
}

.bw-payment-panel {
  color: var(--bw-payment-text-color);
}

.bw-payment-amount {
  font-size: 14px;
  color: var(--bw-payment-text-color);
  margin-bottom: 16px;
}

.bw-payment-surface {
  background: var(--bw-payment-surface-bg);
  border: 1px solid var(--bw-payment-surface-border-color);
  border-radius: var(--bw-payment-surface-border-radius);
  padding: 16px;
}

.bw-payment-note {
  margin-top: 8px;
  color: var(--bw-payment-muted-color);
  font-size: 13px;
}

.bw-editor-card,
.bw-editor-guard {
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 10px;
}

.bw-editor-card {
  border: 1px dashed #93c5fd;
  background: #f8fbff;
}

.bw-editor-guard {
  border: 1px dashed #f59e0b;
  background: #fffaf0;
}

.bw-editor-card-title,
.bw-editor-guard-title {
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 4px;
}

.bw-editor-card-title {
  color: #1d4ed8;
}

.bw-editor-guard-title {
  color: #b45309;
}

.bw-editor-card-copy,
.bw-editor-guard-copy {
  line-height: 1.5;
  font-size: 12px;
}

.bw-editor-placeholder {
  border: 2px dashed var(--bw-header-bg);
  border-radius: 12px;
  padding: 24px;
  background: #eff6ff;
  text-align: center;
  color: #1d4ed8;
}

.bw-editor-placeholder-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.bw-editor-placeholder-title {
  font-weight: 700;
  font-size: 16px;
  margin-bottom: 4px;
}

.bw-editor-placeholder-copy {
  font-size: 13px;
  color: var(--bw-header-bg);
}

.bw-editor-placeholder-note {
  font-size: 12px;
  color: var(--bw-muted-color);
  margin-top: 6px;
}
`;

export function getBookingWidgetInstanceClassName(id?: string): string {
  return `bw-${id || 'unknown'}`;
}

export function resolveBookingPrimaryColor(value: ColorValue | string | undefined): string {
  if (!value) return BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR;
  if (typeof value === 'string') return value || BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR;
  return value.value || BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR;
}

type ThemeResolver = (path: string, fallback?: string) => string;

type BookingWidgetStyleInput = Partial<BookingWidgetProps> & {
  primaryColor?: string | ColorValue;
};

const SHADOW_PRESETS: Record<ShadowValue['preset'], string> = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  custom: '',
};

function resolveColorToken(
  value: ColorValue | string | undefined,
  resolver: ThemeResolver | undefined,
  fallback: string,
): string {
  if (!value) return fallback;

  if (typeof value === 'string') {
    if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl') || value.startsWith('var(') || value.startsWith('color-mix(')) {
      return value;
    }

    return resolver?.(value, fallback) ?? fallback;
  }

  if (value.type === 'custom') {
    return value.value || fallback;
  }

  const themeValue = value.value || fallback;
  if (themeValue.startsWith('#') || themeValue.startsWith('rgb') || themeValue.startsWith('hsl') || themeValue.startsWith('var(') || themeValue.startsWith('color-mix(')) {
    return themeValue;
  }

  return resolver?.(themeValue, fallback) ?? fallback;
}

function formatSide(value: string, unit: string): string {
  if (value === 'auto') return value;
  return `${value}${unit}`;
}

function formatSpacingValue(value: ResponsiveSpacingValue | undefined, fallback: string): string {
  const spacing = getValueForBreakpoint(value, 'mobile') as SpacingValue | undefined;
  if (!spacing) return fallback;

  return [
    formatSide(spacing.top, spacing.unit),
    formatSide(spacing.right, spacing.unit),
    formatSide(spacing.bottom, spacing.unit),
    formatSide(spacing.left, spacing.unit),
  ].join(' ');
}

function formatBorderRadiusValue(value: BorderRadiusValue | undefined, fallback: string): string {
  if (!value) return fallback;

  const topLeft = `${value.topLeft}${value.unit}`;
  const topRight = `${value.topRight}${value.unit}`;
  const bottomRight = `${value.bottomRight}${value.unit}`;
  const bottomLeft = `${value.bottomLeft}${value.unit}`;

  if (value.linked || (topLeft === topRight && topLeft === bottomRight && topLeft === bottomLeft)) {
    return topLeft;
  }

  return `${topLeft} ${topRight} ${bottomRight} ${bottomLeft}`;
}

function formatShadowValue(value: ShadowValue | undefined, fallback: string): string {
  if (!value) return fallback;
  if (value.preset === 'custom') {
    return value.custom || fallback;
  }

  return SHADOW_PRESETS[value.preset] || fallback;
}

function formatFontSizeValue(
  value: ResponsiveFontSizeValue | undefined,
  resolver: ThemeResolver | undefined,
  fallback: string,
): string {
  const fontSize = getValueForBreakpoint(value, 'mobile') as FontSizeValue | undefined;
  if (!fontSize) return fallback;

  if (typeof fontSize === 'string') {
    return resolver?.(fontSize, fontSize) ?? fontSize;
  }

  if (fontSize.type === 'custom') {
    return fontSize.value || fallback;
  }

  return resolver?.(fontSize.value, fallback) ?? fontSize.value ?? fallback;
}

function formatFontWeightValue(
  value: FontWeightValue | undefined,
  resolver: ThemeResolver | undefined,
  fallback: string,
): string {
  if (!value) return fallback;
  if (value.type === 'custom') {
    return value.value || fallback;
  }

  return resolver?.(value.value, fallback) ?? value.value ?? fallback;
}

export function buildBookingWidgetCssVars(
  selector: string,
  input: string | BookingWidgetStyleInput,
  resolver?: ThemeResolver,
): string {
  const props = typeof input === 'string' ? { primaryColor: input } : input;
  const className = selector.startsWith('.') ? selector.slice(1) : selector;
  const accentColor =
    resolveColorToken(props.primaryColor, resolver, '') ||
    resolveColorToken(props.headerBg, resolver, '') ||
    resolveColorToken(props.btnBg, resolver, '') ||
    resolveColorToken(props.cardHoverBorderColor, resolver, '') ||
    resolveColorToken(props.slotBorderColor, resolver, '') ||
    resolveColorToken(props.calendarSelectedBg, resolver, '') ||
    resolveColorToken(props.successIconColor, resolver, '') ||
    BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR;
  const mutedColor = resolveColorToken(props.mutedColor, resolver, '#6b7280');
  const widthCss = generateWidthCSS(className, props.width);
  const maxWidthCss = props.maxWidth
    ? generateMaxWidthCSS(className, props.maxWidth)
    : props.containerMaxWidth
      ? `.${className} { max-width: ${props.containerMaxWidth}; }\n`
      : '';
  const marginCss = generateMarginCSS(className, props.margin);

  return `${selector} {
  --bw-container-bg: ${resolveColorToken(props.containerBg, resolver, '#ffffff')};
  --bw-container-border-radius: ${formatBorderRadiusValue(props.containerBorderRadius, '12px')};
  --bw-container-shadow: ${formatShadowValue(props.containerShadow, '0 1px 8px rgba(0, 0, 0, 0.08)')};
  --bw-container-padding: ${formatSpacingValue(props.containerPadding, '20px')};
  --bw-header-bg: ${resolveColorToken(props.headerBg, resolver, accentColor)};
  --bw-header-color: ${resolveColorToken(props.headerColor, resolver, '#ffffff')};
  --bw-header-font-size: ${formatFontSizeValue(props.headerFontSize, resolver, '18px')};
  --bw-header-font-weight: ${formatFontWeightValue(props.headerFontWeight, resolver, '700')};
  --bw-header-padding: ${formatSpacingValue(props.headerPadding, '16px 20px')};
  --bw-progress-gap: 8px;
  --bw-progress-step-bg: ${resolveColorToken(props.progressStepBg, resolver, '#ffffff')};
  --bw-progress-step-border-color: ${resolveColorToken(props.progressStepBorderColor, resolver, '#e5e7eb')};
  --bw-progress-step-active-bg: ${resolveColorToken(props.progressStepActiveBg, resolver, `color-mix(in srgb, ${accentColor} 7%, white)`) };
  --bw-progress-step-active-border-color: ${resolveColorToken(props.progressStepActiveBorderColor, resolver, accentColor)};
  --bw-progress-step-complete-bg: ${resolveColorToken(props.progressStepCompleteBg, resolver, '#ffffff')};
  --bw-progress-step-complete-border-color: ${resolveColorToken(props.progressStepCompleteBorderColor, resolver, '#e5e7eb')};
  --bw-progress-badge-size: ${props.progressBadgeSize || '28px'};
  --bw-progress-label-font-size: ${formatFontSizeValue(props.progressLabelFontSize, resolver, '13px')};
  --bw-progress-state-font-size: ${formatFontSizeValue(props.progressStateFontSize, resolver, '12px')};
  --bw-progress-label-color: ${resolveColorToken(props.progressLabelColor, resolver, '#111827')};
  --bw-progress-state-color: ${resolveColorToken(props.progressStateColor, resolver, mutedColor)};
  --bw-card-border-color: ${resolveColorToken(props.cardBorderColor, resolver, '#e5e7eb')};
  --bw-card-hover-border-color: ${resolveColorToken(props.cardHoverBorderColor, resolver, accentColor)};
  --bw-card-hover-bg: ${resolveColorToken(props.cardHoverBg, resolver, `color-mix(in srgb, ${accentColor} 7%, white)`) };
  --bw-card-border-radius: ${formatBorderRadiusValue(props.cardBorderRadius, '8px')};
  --bw-card-padding: ${formatSpacingValue(props.cardPadding, '12px 16px')};
  --bw-card-title-font-size: ${formatFontSizeValue(props.cardTitleFontSize, resolver, '14px')};
  --bw-card-title-font-weight: ${formatFontWeightValue(props.cardTitleFontWeight, resolver, '600')};
  --bw-card-subtitle-font-size: ${formatFontSizeValue(props.cardSubtitleFontSize, resolver, '12px')};
  --bw-card-subtitle-color: ${resolveColorToken(props.cardSubtitleColor, resolver, mutedColor)};
  --bw-slot-border-color: ${resolveColorToken(props.slotBorderColor, resolver, accentColor)};
  --bw-slot-color: ${resolveColorToken(props.slotColor, resolver, accentColor)};
  --bw-slot-border-radius: ${formatBorderRadiusValue(props.slotBorderRadius, '6px')};
  --bw-slot-padding: ${formatSpacingValue(props.slotPadding, '8px 4px')};
  --bw-slot-font-size: ${formatFontSizeValue(props.slotFontSize, resolver, '13px')};
  --bw-slot-font-weight: ${formatFontWeightValue(props.slotFontWeight, resolver, '600')};
  --bw-calendar-selected-bg: ${resolveColorToken(props.calendarSelectedBg, resolver, accentColor)};
  --bw-calendar-selected-color: ${resolveColorToken(props.calendarSelectedColor, resolver, '#ffffff')};
  --bw-calendar-today-border-color: ${resolveColorToken(props.calendarTodayBorderColor, resolver, accentColor)};
  --bw-form-input-border-color: ${resolveColorToken(props.formInputBorderColor, resolver, '#e5e7eb')};
  --bw-form-input-border-radius: ${formatBorderRadiusValue(props.formInputBorderRadius, '6px')};
  --bw-form-input-font-size: ${formatFontSizeValue(props.formInputFontSize, resolver, '14px')};
  --bw-form-label-color: ${resolveColorToken(props.formLabelColor, resolver, '#374151')};
  --bw-form-label-font-size: ${formatFontSizeValue(props.formLabelFontSize, resolver, '13px')};
  --bw-form-label-font-weight: ${formatFontWeightValue(props.formLabelFontWeight, resolver, '600')};
  --bw-btn-bg: ${resolveColorToken(props.btnBg, resolver, accentColor)};
  --bw-btn-color: ${resolveColorToken(props.btnColor, resolver, '#ffffff')};
  --bw-btn-border-radius: ${formatBorderRadiusValue(props.btnBorderRadius, '8px')};
  --bw-btn-font-size: ${formatFontSizeValue(props.btnFontSize, resolver, '14px')};
  --bw-btn-font-weight: ${formatFontWeightValue(props.btnFontWeight, resolver, '600')};
  --bw-btn-disabled-bg: ${resolveColorToken(props.btnDisabledBg, resolver, '#9ca3af')};
  --bw-processing-spinner-color: ${resolveColorToken(props.processingSpinnerColor, resolver, accentColor)};
  --bw-processing-title-color: ${resolveColorToken(props.processingTitleColor, resolver, '#111827')};
  --bw-processing-text-color: ${resolveColorToken(props.processingTextColor, resolver, mutedColor)};
  --bw-success-icon-color: ${resolveColorToken(props.successIconColor, resolver, accentColor)};
  --bw-error-bg: ${resolveColorToken(props.errorBg, resolver, '#fef2f2')};
  --bw-error-border-color: ${resolveColorToken(props.errorBorderColor, resolver, '#fca5a5')};
  --bw-error-color: ${resolveColorToken(props.errorColor, resolver, '#dc2626')};
  --bw-step-heading-font-size: ${formatFontSizeValue(props.stepHeadingFontSize, resolver, '15px')};
  --bw-step-heading-font-weight: ${formatFontWeightValue(props.stepHeadingFontWeight, resolver, '600')};
  --bw-summary-font-size: ${formatFontSizeValue(props.summaryFontSize, resolver, '14px')};
  --bw-summary-label-color: ${resolveColorToken(props.summaryLabelColor, resolver, mutedColor)};
  --bw-summary-value-color: ${resolveColorToken(props.summaryValueColor, resolver, '#111827')};
  --bw-muted-color: ${mutedColor};
}
${widthCss}${maxWidthCss}${marginCss}`;
}
