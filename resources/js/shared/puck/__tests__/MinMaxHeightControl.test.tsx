import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MinHeightControl, type MinHeightValue } from '../fields/MinHeightControl';
import { MaxHeightControl, type MaxHeightValue } from '../fields/MaxHeightControl';

describe('MinHeightControl', () => {
  const defaultValue: MinHeightValue = {
    value: 'auto',
    unit: 'auto',
  };

  it('renders with default auto value', () => {
    const onChange = vi.fn();

    render(
      <MinHeightControl
        field={{ label: 'Min Height' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Min Height')).toBeInTheDocument();
    expect(screen.getByDisplayValue('auto')).toBeInTheDocument();
  });

  it('renders height-specific units including vh and vw', () => {
    const onChange = vi.fn();

    render(
      <MinHeightControl
        field={{ label: 'Min Height' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    expect(screen.getByRole('button', { name: 'vh' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'vw' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'px' })).toBeInTheDocument();
  });

  it('updates value and switches unit to px', () => {
    const onChange = vi.fn();

    render(
      <MinHeightControl
        field={{ label: 'Min Height' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    const input = screen.getByDisplayValue('auto');
    fireEvent.change(input, { target: { value: '300' } });

    expect(onChange).toHaveBeenCalledWith({
      value: '300',
      unit: 'px',
    });
  });

  it('supports viewport height unit (vh)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: MinHeightValue = { value: '100', unit: 'px' };

    render(
      <MinHeightControl
        field={{ label: 'Min Height' }}
        value={value}
        onChange={onChange}
      />
    );

    const vhButton = screen.getByRole('button', { name: 'vh' });
    await user.click(vhButton);

    expect(onChange).toHaveBeenCalledWith({
      value: '100',
      unit: 'vh',
    });
  });

  it('disables input when unit is auto', () => {
    const onChange = vi.fn();

    render(
      <MinHeightControl
        field={{ label: 'Min Height' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    const input = screen.getByDisplayValue('auto') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});

describe('MaxHeightControl', () => {
  const defaultValue: MaxHeightValue = {
    value: 'none',
    unit: 'none',
  };

  it('renders with default none value', () => {
    const onChange = vi.fn();

    render(
      <MaxHeightControl
        field={{ label: 'Max Height' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Max Height')).toBeInTheDocument();
    expect(screen.getByDisplayValue('none')).toBeInTheDocument();
  });

  it('supports all height units including vh', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: MaxHeightValue = { value: '500', unit: 'px' };

    render(
      <MaxHeightControl
        field={{ label: 'Max Height' }}
        value={value}
        onChange={onChange}
      />
    );

    const vhButton = screen.getByRole('button', { name: 'vh' });
    expect(vhButton).toBeInTheDocument();

    await user.click(vhButton);
    expect(onChange).toHaveBeenCalledWith({
      value: '500',
      unit: 'vh',
    });
  });

  it('updates value and switches unit to px when entering value with none unit', () => {
    const onChange = vi.fn();

    render(
      <MaxHeightControl
        field={{ label: 'Max Height' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    const input = screen.getByDisplayValue('none');
    fireEvent.change(input, { target: { value: '800' } });

    expect(onChange).toHaveBeenCalledWith({
      value: '800',
      unit: 'px',
    });
  });

  it('disables input when unit is none', () => {
    const onChange = vi.fn();

    render(
      <MaxHeightControl
        field={{ label: 'Max Height' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    const input = screen.getByDisplayValue('none') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('accepts decimal values with viewport units', () => {
    const onChange = vi.fn();
    const value: MaxHeightValue = { value: '100', unit: 'vh' };

    render(
      <MaxHeightControl
        field={{ label: 'Max Height' }}
        value={value}
        onChange={onChange}
      />
    );

    const input = screen.getByDisplayValue('100');
    fireEvent.change(input, { target: { value: '75.5' } });

    expect(onChange).toHaveBeenCalledWith({
      value: '75.5',
      unit: 'vh',
    });
  });
});
