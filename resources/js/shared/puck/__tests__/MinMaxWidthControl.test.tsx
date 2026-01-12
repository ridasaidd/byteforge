import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MinWidthControl, type MinWidthValue } from '../fields/MinWidthControl';
import { MaxWidthControl, type MaxWidthValue } from '../fields/MaxWidthControl';

describe('MinWidthControl', () => {
  const defaultValue: MinWidthValue = {
    value: 'auto',
    unit: 'auto',
  };

  it('renders with default auto value', () => {
    const onChange = vi.fn();

    render(
      <MinWidthControl
        field={{ label: 'Min Width' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Min Width')).toBeInTheDocument();
    expect(screen.getByDisplayValue('auto')).toBeInTheDocument();
  });

  it('updates value and switches unit to px', () => {
    const onChange = vi.fn();

    render(
      <MinWidthControl
        field={{ label: 'Min Width' }}
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

  it('supports percentage units', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: MinWidthValue = { value: '50', unit: 'px' };

    render(
      <MinWidthControl
        field={{ label: 'Min Width' }}
        value={value}
        onChange={onChange}
      />
    );

    const percentButton = screen.getByRole('button', { name: '%' });
    await user.click(percentButton);

    expect(onChange).toHaveBeenCalledWith({
      value: '50',
      unit: '%',
    });
  });

  it('disables input when unit is auto', () => {
    const onChange = vi.fn();

    render(
      <MinWidthControl
        field={{ label: 'Min Width' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    const input = screen.getByDisplayValue('auto') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});

describe('MaxWidthControl', () => {
  const defaultValue: MaxWidthValue = {
    value: 'none',
    unit: 'none',
  };

  it('renders with default none value', () => {
    const onChange = vi.fn();

    render(
      <MaxWidthControl
        field={{ label: 'Max Width' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Max Width')).toBeInTheDocument();
    expect(screen.getByDisplayValue('none')).toBeInTheDocument();
  });

  it('updates value and switches unit to px when entering value with none unit', () => {
    const onChange = vi.fn();

    render(
      <MaxWidthControl
        field={{ label: 'Max Width' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    const input = screen.getByDisplayValue('none');
    fireEvent.change(input, { target: { value: '1200' } });

    expect(onChange).toHaveBeenCalledWith({
      value: '1200',
      unit: 'px',
    });
  });

  it('supports rem unit', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: MaxWidthValue = { value: '80', unit: 'px' };

    render(
      <MaxWidthControl
        field={{ label: 'Max Width' }}
        value={value}
        onChange={onChange}
      />
    );

    const remButton = screen.getByRole('button', { name: 'rem' });
    await user.click(remButton);

    expect(onChange).toHaveBeenCalledWith({
      value: '80',
      unit: 'rem',
    });
  });

  it('disables input when unit is none', () => {
    const onChange = vi.fn();

    render(
      <MaxWidthControl
        field={{ label: 'Max Width' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    const input = screen.getByDisplayValue('none') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('accepts decimal values with units', () => {
    const onChange = vi.fn();
    const value: MaxWidthValue = { value: '100', unit: 'vw' };

    render(
      <MaxWidthControl
        field={{ label: 'Max Width' }}
        value={value}
        onChange={onChange}
      />
    );

    const input = screen.getByDisplayValue('100');
    fireEvent.change(input, { target: { value: '80.5' } });

    expect(onChange).toHaveBeenCalledWith({
      value: '80.5',
      unit: 'vw',
    });
  });
});
