import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('BorderControl (Button Toggle Pattern)', () => {
  const defaultValue: BorderValue = {
    top: { width: '0', style: 'none', color: { type: 'custom', value: '#e5e7eb' } },
    right: { width: '0', style: 'none', color: { type: 'custom', value: '#e5e7eb' } },
    bottom: { width: '0', style: 'none', color: { type: 'custom', value: '#e5e7eb' } },
    left: { width: '0', style: 'none', color: { type: 'custom', value: '#e5e7eb' } },
    unit: 'px',
    linked: true,
  };

  it('renders style as button toggles instead of dropdown', () => {
    const onChange = vi.fn();

    render(
      <BorderControl
        field={{ label: 'Border' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    // Should have button toggles for all border styles
    expect(screen.getByRole('button', { name: 'None' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solid' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dashed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dotted' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Double' })).toBeInTheDocument();
  });

  it('renders unit as button toggles instead of dropdown', () => {
    const onChange = vi.fn();

    render(
      <BorderControl
        field={{ label: 'Border' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    // Should have unit toggle buttons
    expect(screen.getByRole('button', { name: 'px' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'em' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'rem' })).toBeInTheDocument();
  });

  it('updates border width with decimal support', () => {
    const onChange = vi.fn();

    render(
      <BorderControl
        field={{ label: 'Border' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    const widthInput = screen.getByTitle(/width/i);
    fireEvent.change(widthInput, { target: { value: '2.5' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        top: expect.objectContaining({ width: '2.5' })
      })
    );
  });

  it('updates border style using button toggles', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <BorderControl
        field={{ label: 'Border' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    const solidButton = screen.getByRole('button', { name: 'Solid' });
    await user.click(solidButton);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        top: expect.objectContaining({ style: 'solid' }),
        right: expect.objectContaining({ style: 'solid' }),
        bottom: expect.objectContaining({ style: 'solid' }),
        left: expect.objectContaining({ style: 'solid' }),
      })
    );
  });

  it('updates unit using button toggles', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <BorderControl
        field={{ label: 'Border' }}
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

  it('highlights active style button', () => {
    const onChange = vi.fn();
    const value: BorderValue = {
      ...defaultValue,
      top: { ...defaultValue.top, style: 'dashed' },
    };

    render(
      <BorderControl
        field={{ label: 'Border' }}
        value={value}
        onChange={onChange}
      />
    );

    const dashedButton = screen.getByRole('button', { name: 'Dashed' });
    expect(dashedButton).toHaveStyle('fontWeight: 600');
    expect(dashedButton).toHaveStyle('border: 2px solid var(--puck-color-azure-04)');
  });

  it('highlights active unit button', () => {
    const onChange = vi.fn();
    const value: BorderValue = { ...defaultValue, unit: 'em' };

    render(
      <BorderControl
        field={{ label: 'Border' }}
        value={value}
        onChange={onChange}
      />
    );

    const emButton = screen.getByRole('button', { name: 'em' });
    expect(emButton).toHaveStyle('fontWeight: 600');
    expect(emButton).toHaveStyle('border: 2px solid var(--puck-color-azure-04)');
  });

  it('supports linked and unlinked modes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <BorderControl
        field={{ label: 'Border' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    // Find the link/unlink button
    const linkButton = screen.getByTitle(/link|unlink/i);
    await user.click(linkButton);

    // Should call onChange with linked: false
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ linked: false })
    );
  });

  it('updates individual sides when unlinked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const unlinkedValue: BorderValue = { ...defaultValue, linked: false };

    const { rerender } = render(
      <BorderControl
        field={{ label: 'Border' }}
        value={unlinkedValue}
        onChange={onChange}
      />
    );

    // Now should show individual side inputs
    expect(screen.getByText('Top')).toBeInTheDocument();
    expect(screen.getByText('Right')).toBeInTheDocument();
    expect(screen.getByText('Bottom')).toBeInTheDocument();
    expect(screen.getByText('Left')).toBeInTheDocument();
  });

  it('supports all border style options', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const styles = ['None', 'Solid', 'Dashed', 'Dotted', 'Double'];

    render(
      <BorderControl
        field={{ label: 'Border' }}
        value={defaultValue}
        onChange={onChange}
      />
    );

    for (const style of styles) {
      const button = screen.getByRole('button', { name: style });
      await user.click(button);
      expect(onChange).toHaveBeenCalled();
    }
  });
});
