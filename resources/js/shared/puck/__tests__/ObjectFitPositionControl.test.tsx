import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ObjectFitControl, type ObjectFitValue } from '../fields/ObjectFitControl';
import { ObjectPositionControl, type ObjectPositionValue } from '../fields/ObjectPositionControl';

describe('ObjectFitControl', () => {
  it('renders all object-fit options', () => {
    const onChange = vi.fn();

    render(
      <ObjectFitControl
        field={{ label: 'Object Fit' }}
        value="cover"
        onChange={onChange}
      />
    );

    expect(screen.getByText('Object Fit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fill/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /contain/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cover/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /scale/i })).toBeInTheDocument();
  });

  it('sets default to cover', () => {
    const onChange = vi.fn();

    render(
      <ObjectFitControl
        field={{ label: 'Object Fit' }}
        onChange={onChange}
      />
    );

    const coverButton = screen.getByRole('button', { name: /cover/i });
    expect(coverButton).toHaveStyle('fontWeight: 600');
  });

  it('updates selection when clicking button', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ObjectFitControl
        field={{ label: 'Object Fit' }}
        value="cover"
        onChange={onChange}
      />
    );

    const containButton = screen.getByRole('button', { name: /contain/i });
    await user.click(containButton);

    expect(onChange).toHaveBeenCalledWith('contain');
  });

  it('highlights currently selected option', () => {
    const onChange = vi.fn();

    render(
      <ObjectFitControl
        field={{ label: 'Object Fit' }}
        value="fill"
        onChange={onChange}
      />
    );

    const fillButton = screen.getByRole('button', { name: /fill/i });
    expect(fillButton).toHaveStyle('fontWeight: 600');
    expect(fillButton).toHaveStyle('border: 2px solid var(--puck-color-azure-04)');
  });

  it('supports all valid fit values', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const fitValues: ObjectFitValue[] = ['fill', 'contain', 'cover', 'scale-down'];

    const { rerender } = render(
      <ObjectFitControl
        field={{ label: 'Object Fit' }}
        value="cover"
        onChange={onChange}
      />
    );

    for (const fitValue of fitValues) {
      const button = screen.getByRole('button', { name: new RegExp(fitValue, 'i') });
      await user.click(button);
      expect(onChange).toHaveBeenCalledWith(fitValue);
    }
  });
});

describe('ObjectPositionControl', () => {
  it('renders 3x3 grid of position buttons', () => {
    const onChange = vi.fn();

    render(
      <ObjectPositionControl
        field={{ label: 'Object Position' }}
        value="center"
        onChange={onChange}
      />
    );

    expect(screen.getByText('Object Position')).toBeInTheDocument();
    // Check for all 9 position buttons using arrow symbols
    expect(screen.getByRole('button', { name: '↖' })).toBeInTheDocument(); // top-left
    expect(screen.getByRole('button', { name: '↑' })).toBeInTheDocument();  // top-center
    expect(screen.getByRole('button', { name: '↗' })).toBeInTheDocument(); // top-right
    expect(screen.getByRole('button', { name: '←' })).toBeInTheDocument(); // center-left
    expect(screen.getByRole('button', { name: '●' })).toBeInTheDocument(); // center
    expect(screen.getByRole('button', { name: '→' })).toBeInTheDocument(); // center-right
    expect(screen.getByRole('button', { name: '↙' })).toBeInTheDocument(); // bottom-left
    expect(screen.getByRole('button', { name: '↓' })).toBeInTheDocument();  // bottom-center
    expect(screen.getByRole('button', { name: '↘' })).toBeInTheDocument(); // bottom-right
  });

  it('sets default to center', () => {
    const onChange = vi.fn();

    render(
      <ObjectPositionControl
        field={{ label: 'Object Position' }}
        onChange={onChange}
      />
    );

    const centerButton = screen.getByRole('button', { name: '●' });
    expect(centerButton).toHaveStyle('fontWeight: 600');
  });

  it('updates selection when clicking position button', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ObjectPositionControl
        field={{ label: 'Object Position' }}
        value="center"
        onChange={onChange}
      />
    );

    const topLeftButton = screen.getByRole('button', { name: /top-left/ });
    await user.click(topLeftButton);

    expect(onChange).toHaveBeenCalledWith('top-left');
  });

  it('highlights currently selected position', () => {
    const onChange = vi.fn();

    render(
      <ObjectPositionControl
        field={{ label: 'Object Position' }}
        value="top-right"
        onChange={onChange}
      />
    );

    const topRightButton = screen.getByRole('button', { name: /top-right/ }) as HTMLButtonElement;
    const style = topRightButton.getAttribute('style');
    expect(style).toContain('font-weight: 600');
    expect(style).toContain('border: 2px solid var(--puck-color-azure-04)');
  });

  it('supports all 9 position values', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const positions: ObjectPositionValue[] = [
      'top-left', 'top-center', 'top-right',
      'center-left', 'center', 'center-right',
      'bottom-left', 'bottom-center', 'bottom-right'
    ];

    render(
      <ObjectPositionControl
        field={{ label: 'Object Position' }}
        value="center"
        onChange={onChange}
      />
    );

    for (let i = 0; i < positions.length; i++) {
      const button = screen.getByRole('button', { name: new RegExp(`^Position: ${positions[i]}$`) });
      await user.click(button);
      expect(onChange).toHaveBeenCalledWith(positions[i]);
    }
  });

  it('has square button layout for position grid', () => {
    const onChange = vi.fn();

    render(
      <ObjectPositionControl
        field={{ label: 'Object Position' }}
        value="center"
        onChange={onChange}
      />
    );

    const centerButton = screen.getByRole('button', { name: /^Position: center$/ }) as HTMLButtonElement;
    const styles = window.getComputedStyle(centerButton);
    expect(styles.aspectRatio).toBe('1');
  });
});
