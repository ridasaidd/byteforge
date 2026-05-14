import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import {
  createBorderRadiusField,
  createColorField,
  createFontWeightField,
  createPositionOffsetField,
  createResponsiveColorField,
  createResponsiveFontSizeField,
  createResponsiveSpacingField,
  createShadowField,
  createWidthField,
  type ColorValue,
} from '../fields';

function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemeProvider
      initialTheme={{ id: 1, name: 'Test Theme', slug: 'test-theme', theme_data: {}, is_active: true, tenant_id: null } as any}
    >
      {ui}
    </ThemeProvider>
  );
}

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('createResponsiveColorField', () => {
  it('renders a labeled responsive color control', () => {
    const onChange = vi.fn();
    const field = createResponsiveColorField('Responsive Color');

    renderWithTheme(
      field.render({
        field: { label: 'Responsive Color' },
        value: undefined,
        onChange,
      })
    );

    expect(screen.getByText('Responsive Color')).toBeInTheDocument();
  });

  it('provides a mobile responsive default value shape', () => {
    const defaultValue = createResponsiveColorField('Responsive Color').defaultValue as { mobile: ColorValue };

    expect(defaultValue).toEqual({
      mobile: { type: 'custom', value: '' },
    });
  });
});

describe('shared field factories', () => {
  it('renders the generic visual field helpers with their labels', () => {
    const onChange = vi.fn();
    const colorField = createColorField('Color', { type: 'custom', value: '#111827' });
    const radiusField = createBorderRadiusField('Radius', { topLeft: '8', topRight: '8', bottomRight: '8', bottomLeft: '8', unit: 'px', linked: true });
    const shadowField = createShadowField('Shadow', { preset: 'custom', custom: '0 1px 3px rgba(0, 0, 0, 0.1)' });

    renderWithTheme(
      <>
        {colorField.render({ field: { label: 'Color' }, value: undefined, onChange })}
        {radiusField.render({ field: { label: 'Radius' }, value: undefined, onChange })}
        {shadowField.render({ field: { label: 'Shadow' }, value: undefined, onChange })}
      </>
    );

    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.getByText('Radius')).toBeInTheDocument();
    expect(screen.getByText('Shadow')).toBeInTheDocument();
  });

  it('renders the generic typography and spacing helpers with their labels', () => {
    const onChange = vi.fn();
    const spacingField = createResponsiveSpacingField('Spacing', { mobile: { top: '12', right: '12', bottom: '12', left: '12', unit: 'px', linked: true } });
    const fontSizeField = createResponsiveFontSizeField('Font Size', { mobile: { type: 'custom', value: '14px' } });
    const fontWeightField = createFontWeightField('Font Weight', { type: 'custom', value: '600' });

    renderWithTheme(
      <>
        {spacingField.render({ field: { label: 'Spacing' }, value: undefined, onChange })}
        {fontSizeField.render({ field: { label: 'Font Size' }, value: undefined, onChange })}
        {fontWeightField.render({ field: { label: 'Font Weight' }, value: undefined, onChange })}
      </>
    );

    expect(screen.getAllByText('Spacing').length).toBeGreaterThan(0);
    expect(screen.getByText('Font Size')).toBeInTheDocument();
    expect(screen.getByText('Font Weight')).toBeInTheDocument();
  });

  it('renders a labeled width control', () => {
    const onChange = vi.fn();
    const field = createWidthField('Menu Width');

    renderWithTheme(
      field.render({
        field: { label: 'Menu Width' },
        value: undefined,
        onChange,
      })
    );

    expect(screen.getByText('Menu Width')).toBeInTheDocument();
  });

  it('preserves provided offset defaults', () => {
    const defaultOffset = { top: '12', right: '12', bottom: '', left: '', unit: 'px' as const, linked: false };
    const field = createPositionOffsetField('Offset', defaultOffset);

    expect(field.defaultValue).toEqual(defaultOffset);
  });
});
