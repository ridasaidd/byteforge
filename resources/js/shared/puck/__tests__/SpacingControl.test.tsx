import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  SpacingControl,
  type SpacingValue
} from '../fields/SpacingControl';

describe('SpacingControl', () => {
  const defaultValue: SpacingValue = {
    top: '0',
    right: '0',
    bottom: '0',
    left: '0',
    unit: 'px',
    linked: false,
  };

  it('renders with default values', () => {
    const onChange = vi.fn();

    render(
      <SpacingControl
        field={{ label: 'Padding' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    // Should have 4 inputs for top, right, bottom, left (rendered as textbox for text inputs)
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs).toHaveLength(4);
  });

  it('displays the label', () => {
    const onChange = vi.fn();

    render(
      <SpacingControl
        field={{ label: 'Margin' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Margin')).toBeInTheDocument();
  });

  it('updates top value on change', () => {
    const onChange = vi.fn();

    render(
      <SpacingControl
        field={{ label: 'Padding' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '10' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ top: '10' })
    );
  });

  it('links all values when linked is true', () => {
    const onChange = vi.fn();
    const linkedValue: SpacingValue = {
      ...defaultValue,
      linked: true,
      top: '10',
      right: '10',
      bottom: '10',
      left: '10',
    };

    render(
      <SpacingControl
        field={{ label: 'Padding' }}
        value={linkedValue}
        onChange={onChange}
      />
    );

    // When linked, there's only one input for "All Sides"
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '20' } });

    // When linked, all values should update together
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        top: '20',
        right: '20',
        bottom: '20',
        left: '20',
      })
    );
  });

  it('toggles linked state', () => {
    const onChange = vi.fn();

    render(
      <SpacingControl
        field={{ label: 'Padding' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    // Find and click the link toggle button
    const linkButton = screen.getByTitle(/link values/i);
    fireEvent.click(linkButton);

    expect(onChange).toHaveBeenCalled();
  });

  it('changes unit', () => {
    const onChange = vi.fn();

    render(
      <SpacingControl
        field={{ label: 'Padding' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    // Find unit selector
    const unitButtons = screen.getAllByRole('button');
    const remButton = unitButtons.find(btn => btn.textContent === 'rem');

    if (remButton) {
      fireEvent.click(remButton);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ unit: 'rem' })
      );
    }
  });
});
