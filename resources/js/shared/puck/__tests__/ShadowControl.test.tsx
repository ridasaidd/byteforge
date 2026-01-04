import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShadowControl, type ShadowValue } from '../fields/ShadowControl';

describe('ShadowControl', () => {
  const defaultValue: ShadowValue = {
    x: '0',
    y: '4',
    blur: '6',
    spread: '0',
    color: 'rgba(0,0,0,0.1)',
    inset: false,
    unit: 'px',
  };

  const noShadowValue: ShadowValue = {
    x: '0',
    y: '0',
    blur: '0',
    spread: '0',
    color: 'rgba(0,0,0,0)',
    inset: false,
    unit: 'px',
  };

  it('renders with label', () => {
    const onChange = vi.fn();

    render(
      <ShadowControl
        field={{ label: 'Shadow' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Shadow')).toBeInTheDocument();
  });

  it('renders shadow preset buttons', () => {
    const onChange = vi.fn();

    render(
      <ShadowControl
        field={{ label: 'Shadow' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    // Should have preset buttons (None, Small, Medium, Large, etc.)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('selects shadow preset', () => {
    const onChange = vi.fn();

    render(
      <ShadowControl
        field={{ label: 'Shadow' }}
        value={noShadowValue}
        onChange={onChange}
      />
    );

    // Click a preset button (e.g., Small)
    const smallButton = screen.getByTitle('Small');
    fireEvent.click(smallButton);

    expect(onChange).toHaveBeenCalled();
  });

  it('selects medium shadow preset', () => {
    const onChange = vi.fn();

    render(
      <ShadowControl
        field={{ label: 'Shadow' }}
        value={noShadowValue}
        onChange={onChange}
      />
    );

    const mediumButton = screen.getByTitle('Medium');
    fireEvent.click(mediumButton);

    expect(onChange).toHaveBeenCalled();
  });

  it('selects large shadow preset', () => {
    const onChange = vi.fn();

    render(
      <ShadowControl
        field={{ label: 'Shadow' }}
        value={noShadowValue}
        onChange={onChange}
      />
    );

    const largeButton = screen.getByTitle('Large');
    fireEvent.click(largeButton);

    expect(onChange).toHaveBeenCalled();
  });

  it('selects no shadow preset', () => {
    const onChange = vi.fn();

    render(
      <ShadowControl
        field={{ label: 'Shadow' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    const noneButton = screen.getByTitle('None');
    fireEvent.click(noneButton);

    expect(onChange).toHaveBeenCalled();
  });

  it('renders shadow preview', () => {
    const onChange = vi.fn();

    render(
      <ShadowControl
        field={{ label: 'Shadow' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    // Should have a preview section
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('handles undefined value gracefully', () => {
    const onChange = vi.fn();

    // Should not throw when value is undefined
    expect(() => {
      render(
        <ShadowControl
          field={{ label: 'Shadow' }}
          value={undefined as unknown as ShadowValue}
          onChange={onChange}
        />
      );
    }).not.toThrow();
  });

  it('has preset label', () => {
    const onChange = vi.fn();

    render(
      <ShadowControl
        field={{ label: 'Shadow' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    // Should have preset label
    expect(screen.getByText('Preset')).toBeInTheDocument();
  });
});
