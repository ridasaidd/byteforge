import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BorderRadiusControl, type BorderRadiusValue } from '../fields/BorderRadiusControl';

describe('BorderRadiusControl (Button Toggle Pattern)', () => {
  const defaultValue: BorderRadiusValue = {
    topLeft: '0',
    topRight: '0',
    bottomRight: '0',
    bottomLeft: '0',
    unit: 'px',
    linked: true,
  };

  it('renders unit as button toggles instead of dropdown', () => {
    const onChange = vi.fn();

    render(
      <BorderRadiusControl
        field={{ label: 'Border Radius' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    // Should have unit toggle buttons
    expect(screen.getByRole('button', { name: 'px' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'em' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'rem' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '%' })).toBeInTheDocument();
  });

  it('updates unit using button toggles', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <BorderRadiusControl
        field={{ label: 'Border Radius' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    const remButton = screen.getByRole('button', { name: 'rem' });
    await user.click(remButton);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ unit: 'rem' })
    );
  });

  it('highlights active unit button', () => {
    const onChange = vi.fn();
    const value: BorderRadiusValue = { ...defaultValue, unit: '%' };

    render(
      <BorderRadiusControl
        field={{ label: 'Border Radius' }}
        value={value}
        onChange={onChange}
      />
    );

    const percentButton = screen.getByRole('button', { name: '%' });
    expect(percentButton).toHaveStyle('fontWeight: 600');
    expect(percentButton).toHaveStyle('border: 2px solid var(--puck-color-azure-04)');
  });

  it('supports all unit options including percent', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const units = ['px', 'em', 'rem', '%'];

    render(
      <BorderRadiusControl
        field={{ label: 'Border Radius' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    for (const unit of units) {
      const button = screen.getByRole('button', { name: unit });
      await user.click(button);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ unit: unit as any })
      );
    }
  });

  it('updates value in linked mode', () => {
    const onChange = vi.fn();

    render(
      <BorderRadiusControl
        field={{ label: 'Border Radius' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    const input = screen.getByDisplayValue('0');
    fireEvent.change(input, { target: { value: '8' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ topLeft: '8' })
    );
  });

  it('supports decimal values for smooth radii', () => {
    const onChange = vi.fn();
    const value: BorderRadiusValue = { ...defaultValue, unit: 'rem' };

    render(
      <BorderRadiusControl
        field={{ label: 'Border Radius' }}
        value={value}
        onChange={onChange}
      />
    );

    const input = screen.getByDisplayValue('0');
    fireEvent.change(input, { target: { value: '0.5' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ topLeft: '0.5' })
    );
  });

  it('maintains linked state when changing units', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: BorderRadiusValue = {
      ...defaultValue,
      topLeft: '8',
      topRight: '8',
      bottomRight: '8',
      bottomLeft: '8',
      linked: true,
    };

    render(
      <BorderRadiusControl
        field={{ label: 'Border Radius' }}
        value={value}
        onChange={onChange}
      />
    );

    const emButton = screen.getByRole('button', { name: 'em' });
    await user.click(emButton);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        unit: 'em',
        linked: true,
      })
    );
  });

  it('shows preview of border radius styling', () => {
    const onChange = vi.fn();
    const value: BorderRadiusValue = {
      ...defaultValue,
      topLeft: '16',
      topRight: '16',
      bottomRight: '16',
      bottomLeft: '16',
    };

    render(
      <BorderRadiusControl
        field={{ label: 'Border Radius' }}
        value={value}
        onChange={onChange}
      />
    );

    // Preview box should be present
    const preview = screen.getByStyle(/borderRadius/);
    expect(preview).toBeInTheDocument();
  });

  it('supports unlinked mode for individual corners', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const { rerender } = render(
      <BorderRadiusControl
        field={{ label: 'Border Radius' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    // Toggle unlink button
    const unlinkButton = screen.getByText(/unlink/i);
    await user.click(unlinkButton);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ linked: false })
    );
  });
});
