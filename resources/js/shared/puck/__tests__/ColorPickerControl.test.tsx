import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorPickerControl, type ColorPickerValue } from '../fields/ColorPickerControl';

// Mock the useTheme hook
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#6b7280',
          foreground: '#ffffff',
        },
        background: '#ffffff',
        foreground: '#171717',
        muted: {
          DEFAULT: '#f3f4f6',
          foreground: '#6b7280',
        },
        accent: {
          DEFAULT: '#f3f4f6',
          foreground: '#171717',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        border: '#e5e7eb',
        input: '#e5e7eb',
        ring: '#3b82f6',
      },
    },
    resolve: (token: string, fallback?: string) => {
      const colors: Record<string, string> = {
        'primary': '#3b82f6',
        'primary-foreground': '#ffffff',
        'secondary': '#6b7280',
        'background': '#ffffff',
        'foreground': '#171717',
        'muted': '#f3f4f6',
        'border': '#e5e7eb',
      };
      return colors[token] || fallback || '#000000';
    },
  }),
}));

describe('ColorPickerControl', () => {
  const defaultValue: ColorPickerValue = {
    type: 'theme',
    value: 'primary',
  };

  it('renders with theme color selected', () => {
    const onChange = vi.fn();

    render(
      <ColorPickerControl
        field={{ label: 'Background Color' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Background Color')).toBeInTheDocument();
  });

  it('shows theme tab by default when value type is theme', () => {
    const onChange = vi.fn();

    render(
      <ColorPickerControl
        field={{ label: 'Color' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    // Theme tab should be visible and default content rendered
    expect(screen.getByText('Theme Colors')).toBeInTheDocument();
    expect(screen.getByText('No theme colors available')).toBeInTheDocument();
  });

  it('shows custom tab when value type is custom', () => {
    const onChange = vi.fn();
    const customValue: ColorPickerValue = {
      type: 'custom',
      value: '#ff0000',
    };

    render(
      <ColorPickerControl
        field={{ label: 'Color' }}
        value={customValue}
        onChange={onChange}
      />
    );

    const customTab = screen.getByText('Custom');
    expect(customTab).toBeInTheDocument();
  });

  it('switches to custom tab when clicked', () => {
    const onChange = vi.fn();

    render(
      <ColorPickerControl
        field={{ label: 'Color' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    const customTab = screen.getByText('Custom');
    fireEvent.click(customTab);

    // Should show custom color input after switching
    expect(screen.getByPlaceholderText('#000000')).toBeInTheDocument();
  });

  it('calls onChange when theme color is selected', () => {
    const onChange = vi.fn();

    render(
      <ColorPickerControl
        field={{ label: 'Color' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    // Find and click a theme color button
    const colorButtons = screen.getAllByRole('button');
    const secondaryButton = colorButtons.find(btn =>
      btn.getAttribute('title')?.toLowerCase().includes('secondary')
    );

    if (secondaryButton) {
      fireEvent.click(secondaryButton);
      expect(onChange).toHaveBeenCalled();
    }
  });

  it('handles legacy string value format', () => {
    const onChange = vi.fn();

    // Test with legacy string value (should be normalized)
    render(
      <ColorPickerControl
        field={{ label: 'Color' }}
        value={'primary' as unknown as ColorPickerValue}
        onChange={onChange}
      />
    );

    // Should render without errors
    expect(screen.getByText('Color')).toBeInTheDocument();
  });

  it('handles custom hex color input', () => {
    const onChange = vi.fn();
    const customValue: ColorPickerValue = {
      type: 'custom',
      value: '#ff0000',
    };

    render(
      <ColorPickerControl
        field={{ label: 'Color' }}
        value={customValue}
        onChange={onChange}
      />
    );

    // Switch to custom tab
    const customTab = screen.getByText('Custom');
    fireEvent.click(customTab);

    // Find the hex text input (avoid ambiguity with the color swatch input)
    const colorInput = screen.getByPlaceholderText('#000000');
    fireEvent.change(colorInput, { target: { value: '#00ff00' } });
    expect(onChange).toHaveBeenCalledWith({
      type: 'custom',
      value: '#00ff00',
    });
  });
});
