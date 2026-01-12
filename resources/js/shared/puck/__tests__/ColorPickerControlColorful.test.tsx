import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorPickerControlColorful } from '../fields/ColorPickerControlColorful';
import type { ColorPickerValue } from '../fields/ColorPickerControl';

// Mock the useTheme hook to provide theme_data.colors
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {
      theme_data: {
        colors: {
          primary: {
            500: '#13315c',
            600: '#102847',
          },
          secondary: {
            500: '#8da9c4',
          },
          semantic: {
            success: '#10b981',
          },
        },
      },
    },
    resolve: (token: string, fallback?: string) => {
      const colors: Record<string, string> = {
        'colors.primary.500': '#13315c',
        'colors.secondary.500': '#8da9c4',
        'colors.semantic.success': '#10b981',
      };
      return colors[token] || fallback || '#000000';
    },
  }),
}));

describe('ColorPickerControlColorful', () => {
  const defaultValue: ColorPickerValue = {
    type: 'theme',
    value: 'colors.primary.500',
  };

  it('renders label and theme swatches', () => {
    const { container } = render(
      <ColorPickerControlColorful
        field={{ label: 'Background Color' }}
        value={defaultValue}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('Background Color')).toBeInTheDocument();
    expect(screen.getByText('Theme Colors')).toBeInTheDocument();
    // Should render at least one theme color button (semantic + palette)
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('shows react-colorful picker by default', () => {
    const { container } = render(
      <ColorPickerControlColorful
        field={{ label: 'Color' }}
        value={defaultValue}
        onChange={vi.fn()}
      />
    );

    expect(container.querySelector('.react-colorful')).toBeInTheDocument();
  });

  it('selects a theme swatch and emits token while syncing input value', () => {
    const onChange = vi.fn();

    render(
      <ColorPickerControlColorful
        field={{ label: 'Color' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByTitle('Primary 500 (#13315c)'));

    expect(onChange).toHaveBeenCalledWith({ type: 'theme', value: 'colors.primary.500' });
    expect(screen.getByDisplayValue('#13315c')).toBeInTheDocument();
  });

  it('calls onChange when custom hex is edited', () => {
    const onChange = vi.fn();

    render(
      <ColorPickerControlColorful
        field={{ label: 'Color' }}
        value={{ type: 'custom', value: '#ff0000' }}
        onChange={onChange}
      />
    );

    const hexInput = screen.getByPlaceholderText('#000000');
    fireEvent.change(hexInput, { target: { value: '#00ff00' } });

    expect(onChange).toHaveBeenCalledWith({ type: 'custom', value: '#00ff00' });
  });

  it('handles legacy string value by normalizing to theme token', () => {
    render(
      <ColorPickerControlColorful
        field={{ label: 'Color' }}
        value={'colors.secondary.500'}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('Theme Colors')).toBeInTheDocument();
  });
});
