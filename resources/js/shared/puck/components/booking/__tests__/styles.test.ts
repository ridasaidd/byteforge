import { describe, expect, it } from 'vitest';
import {
  BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR,
  BOOKING_WIDGET_STATIC_CSS,
  buildBookingWidgetCssVars,
  getBookingWidgetInstanceClassName,
  resolveBookingPrimaryColor,
} from '../styles';

describe('booking widget styles', () => {
  it('builds a stable instance class name', () => {
    expect(getBookingWidgetInstanceClassName('abc123')).toBe('bw-abc123');
    expect(getBookingWidgetInstanceClassName()).toBe('bw-unknown');
  });

  it('uses the booking primary color across accent variables', () => {
    const css = buildBookingWidgetCssVars('.bw-demo', '#ff0000');

    expect(css).toContain('.bw-demo');
    expect(css).toContain('--bw-header-bg: #ff0000;');
    expect(css).toContain('--bw-btn-bg: #ff0000;');
    expect(css).toContain('--bw-slot-border-color: #ff0000;');
    expect(css).toContain('--bw-processing-spinner-color: #ff0000;');
  });

  it('prefers explicit zone overrides over the base accent color', () => {
    const css = buildBookingWidgetCssVars('.bw-demo', {
      primaryColor: '#ff0000',
      headerBg: { type: 'custom', value: '#00ff00' },
      btnBg: { type: 'custom', value: '#0000ff' },
      maxWidth: { mobile: { value: '560', unit: 'px' } },
    });

    expect(css).toContain('--bw-header-bg: #00ff00;');
    expect(css).toContain('--bw-btn-bg: #0000ff;');
    expect(css).toContain('.bw-demo { max-width: 560px; }');
    expect(css).toContain('--bw-slot-border-color: #ff0000;');
  });

  it('uses shared responsive layout CSS for widget sizing', () => {
    const css = buildBookingWidgetCssVars('.bw-demo', {
      width: {
        mobile: { value: '100', unit: '%' },
        desktop: { value: '75', unit: '%' },
      },
      maxWidth: {
        mobile: { value: '640', unit: 'px' },
      },
      margin: {
        mobile: { top: '0', right: 'auto', bottom: '24', left: 'auto', unit: 'px', linked: false },
      },
    });

    expect(css).toContain('.bw-demo { width: 100%; }');
    expect(css).toContain('.bw-demo { max-width: 640px; }');
    expect(css).toContain('.bw-demo { margin: 0px auto 24px auto; }');
    expect(css).toContain('@media (min-width: 1024px)');
    expect(css).toContain('.bw-demo { width: 75%; }');
  });

  it('includes progress, card, and summary customization variables when provided', () => {
    const css = buildBookingWidgetCssVars('.bw-demo', {
      progressBadgeSize: '36px',
      progressStepActiveBg: { type: 'custom', value: '#fef3c7' },
      cardPadding: {
        mobile: { top: '10', right: '14', bottom: '10', left: '14', unit: 'px', linked: false },
      },
      summaryValueColor: { type: 'custom', value: '#0f172a' },
    });

    expect(css).toContain('--bw-progress-badge-size: 36px;');
    expect(css).toContain('--bw-progress-step-active-bg: #fef3c7;');
    expect(css).toContain('--bw-card-padding: 10px 14px 10px 14px;');
    expect(css).toContain('--bw-summary-value-color: #0f172a;');
  });

  it('derives fallback accent color from migrated zone props when primaryColor is absent', () => {
    const css = buildBookingWidgetCssVars('.bw-demo', {
      headerBg: { type: 'custom', value: '#22c55e' },
    });

    expect(css).toContain('--bw-header-bg: #22c55e;');
    expect(css).toContain('--bw-btn-bg: #22c55e;');
    expect(css).toContain('--bw-processing-spinner-color: #22c55e;');
  });

  it('resolves fallback primary color when none is provided', () => {
    expect(resolveBookingPrimaryColor(undefined)).toBe(BOOKING_WIDGET_DEFAULT_PRIMARY_COLOR);
  });

  it('includes shared class rules for widget rendering', () => {
    expect(BOOKING_WIDGET_STATIC_CSS).toContain('.bw-root');
    expect(BOOKING_WIDGET_STATIC_CSS).toContain('.bw-btn');
    expect(BOOKING_WIDGET_STATIC_CSS).toContain('.bw-calendar-day.is-selected');
  });
});
