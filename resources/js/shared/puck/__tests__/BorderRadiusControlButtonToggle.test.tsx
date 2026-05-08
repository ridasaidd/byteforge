import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import { BorderRadiusControl, type BorderRadiusValue } from '../fields/BorderRadiusControl';

function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemeProvider
      initialTheme={{ id: 1, name: 'Test Theme', slug: 'test-theme', theme_data: {}, is_active: true, tenant_id: null } as any}
    >
      {ui}
    </ThemeProvider>
  );
}

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

    renderWithTheme(
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

    renderWithTheme(
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

    renderWithTheme(
      <BorderRadiusControl
        field={{ label: 'Border Radius' }}
        value={value}
        onChange={onChange}
      />
    );

    const percentButton = screen.getByRole('button', { name: '%' });
    expect(percentButton).toHaveStyle('fontWeight: 600');
    expect(percentButton).toHaveStyle('backgroundColor: rgb(239, 246, 255)');
  });

  it('supports all unit options including percent', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const units = ['px', 'em', 'rem', '%'];

    renderWithTheme(
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

    renderWithTheme(
      <BorderRadiusControl
        field={{ label: 'Border Radius' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    const inputs = screen.getAllByDisplayValue('0');
    fireEvent.change(inputs[0], { target: { value: '8' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ topLeft: '8' })
    );
  });

  it('supports decimal values for smooth radii', () => {
    const onChange = vi.fn();
    const value: BorderRadiusValue = { ...defaultValue, unit: 'rem' };

    renderWithTheme(
      <BorderRadiusControl
        field={{ label: 'Border Radius' }}
        value={value}
        onChange={onChange}
      />
    );

    const inputs = screen.getAllByDisplayValue('0');
    fireEvent.change(inputs[0], { target: { value: '0.5' } });

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

    renderWithTheme(
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

    renderWithTheme(
      <BorderRadiusControl
        field={{ label: 'Border Radius' }}
        value={value}
        onChange={onChange}
      />
    );

    // Preview box should be present (check component renders)
    expect(screen.getByText('Border Radius')).toBeInTheDocument();
  });

  it('supports unlinked mode for individual corners', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const { rerender } = renderWithTheme(
      <BorderRadiusControl
        field={{ label: 'Border Radius' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    // Toggle link button (shows 'Linked' when currently linked)
    const linkButton = screen.getByRole('button', { name: /linked/i });
    await user.click(linkButton);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ linked: false })
    );
  });
});
