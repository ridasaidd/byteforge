import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BorderControl, type BorderValue } from '../fields/BorderControl';

// Mock useTheme hook
vi.mock('@/shared/hooks', () => ({
  useTheme: () => ({
    theme: {
      theme_data: {
        colors: {
          primary: { 500: '#13315c' },
          semantic: { success: '#10b981' },
        },
      },
    },
    resolve: (token: string, fallback?: string) => fallback || '#000000',
  }),
}));

describe('BorderControl', () => {
  const defaultValue: BorderValue = {
    top: { width: '0', style: 'none', color: { type: 'custom', value: '#e5e7eb' } },
    right: { width: '0', style: 'none', color: { type: 'custom', value: '#e5e7eb' } },
    bottom: { width: '0', style: 'none', color: { type: 'custom', value: '#e5e7eb' } },
    left: { width: '0', style: 'none', color: { type: 'custom', value: '#e5e7eb' } },
    unit: 'px',
    linked: true,
  };

  it('renders with default values', () => {
    const onChange = vi.fn();

    render(
      <BorderControl
        field={{ label: 'Border' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Border')).toBeInTheDocument();
  });

  it('updates border width', () => {
    const onChange = vi.fn();

    render(
      <BorderControl
        field={{ label: 'Border' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    const widthInput = screen.getByTitle(/width/i);
    fireEvent.change(widthInput, { target: { value: '2' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ top: expect.objectContaining({ width: '2' }) })
    );
  });

  it('updates border style', () => {
    const onChange = vi.fn();

    render(
      <BorderControl
        field={{ label: 'Border' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    const solidButton = screen.getByRole('button', { name: 'Solid' });
    fireEvent.click(solidButton);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        top: expect.objectContaining({ style: 'solid' }),
      })
    );
  });

  it('updates border radius', () => {
    const onChange = vi.fn();

    render(
      <BorderControl
        field={{ label: 'Border' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    // Toggle unlink to expose per-side inputs
    fireEvent.click(screen.getByRole('button', { name: /unlink/i }));
    const inputs = screen.getAllByRole('spinbutton');
    const rightInput = inputs[1];

    fireEvent.change(rightInput, { target: { value: '8' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ right: expect.objectContaining({ width: '8' }) })
    );
  });

  it('updates border color', () => {
    const onChange = vi.fn();

    render(
      <BorderControl
        field={{ label: 'Border' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    // Find color input
    const colorInput = screen.getByDisplayValue('#e5e7eb');
    fireEvent.change(colorInput, { target: { value: '#ff0000' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ 
        top: expect.objectContaining({ 
          color: expect.objectContaining({ type: 'custom', value: '#ff0000' }) 
        }) 
      })
    );
  });

  it('displays correct border styles options', () => {
    const onChange = vi.fn();

    render(
      <BorderControl
        field={{ label: 'Border' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    expect(screen.getByRole('button', { name: 'None' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solid' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dashed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dotted' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Double' })).toBeInTheDocument();
  });
});
