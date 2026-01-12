import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeightControl, type HeightValue } from '../fields/HeightControl';

describe('HeightControl', () => {
  const defaultValue: HeightValue = {
    value: 'auto',
    unit: 'auto',
  };

  it('renders with default auto value', () => {
    const onChange = vi.fn();

    render(
      <HeightControl
        field={{ label: 'Height' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Height')).toBeInTheDocument();
    expect(screen.getByDisplayValue('auto')).toBeInTheDocument();
  });

  it('renders unit toggle buttons', () => {
    const onChange = vi.fn();

    render(
      <HeightControl
        field={{ label: 'Height' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    expect(screen.getByRole('button', { name: 'auto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'px' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'rem' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'em' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'vh' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'vw' })).toBeInTheDocument();
  });

  it('changes unit to px when entering value', () => {
    const onChange = vi.fn();

    render(
      <HeightControl
        field={{ label: 'Height' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    const input = screen.getByDisplayValue('auto');
    fireEvent.change(input, { target: { value: '200' } });

    expect(onChange).toHaveBeenCalledWith({
      value: '200',
      unit: 'px',
    });
  });

  it('switches between units with button toggles', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: HeightValue = { value: '100', unit: 'px' };

    const { rerender } = render(
      <HeightControl
        field={{ label: 'Height' }}
        value={value}
        onChange={onChange}
      />
    );

    const remButton = screen.getByRole('button', { name: 'rem' });
    await user.click(remButton);

    expect(onChange).toHaveBeenCalledWith({
      value: '100',
      unit: 'rem',
    });
  });

  it('disables input when unit is auto', () => {
    const onChange = vi.fn();

    render(
      <HeightControl
        field={{ label: 'Height' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    const input = screen.getByDisplayValue('auto') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('accepts decimal values like 0.5', async () => {
    const onChange = vi.fn();
    const value: HeightValue = { value: '100', unit: 'rem' };

    render(
      <HeightControl
        field={{ label: 'Height' }}
        value={value}
        onChange={onChange}
      />
    );

    const input = screen.getByDisplayValue('100');
    fireEvent.change(input, { target: { value: '0.5' } });

    expect(onChange).toHaveBeenCalledWith({
      value: '0.5',
      unit: 'rem',
    });
  });

  it('highlights active unit button', () => {
    const onChange = vi.fn();
    const value: HeightValue = { value: '100', unit: 'rem' };

    render(
      <HeightControl
        field={{ label: 'Height' }}
        value={value}
        onChange={onChange}
      />
    );

    const remButton = screen.getByRole('button', { name: 'rem' });
    expect(remButton).toHaveStyle('fontWeight: 600');
  });
});
