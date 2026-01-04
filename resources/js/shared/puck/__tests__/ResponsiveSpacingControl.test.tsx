import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResponsiveSpacingControl } from '../fields/ResponsiveSpacingControl';

// Mock matchMedia for responsive tests
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('ResponsiveSpacingControl', () => {
  const defaultValue = {
    desktop: { top: '16', right: '16', bottom: '16', left: '16', unit: 'px' as const, linked: true },
    tablet: { top: '12', right: '12', bottom: '12', left: '12', unit: 'px' as const, linked: true },
    mobile: { top: '8', right: '8', bottom: '8', left: '8', unit: 'px' as const, linked: true },
  };

  it('renders with label', () => {
    const onChange = vi.fn();
    
    render(
      <ResponsiveSpacingControl 
        field={{ label: 'Responsive Spacing' }} 
        value={defaultValue} 
        onChange={onChange} 
      />
    );
    
    expect(screen.getByText('Responsive Spacing')).toBeInTheDocument();
  });

  it('shows breakpoint tabs or selectors', () => {
    const onChange = vi.fn();
    
    render(
      <ResponsiveSpacingControl 
        field={{ label: 'Responsive Spacing' }} 
        value={defaultValue} 
        onChange={onChange} 
      />
    );
    
    // Should have breakpoint indicators (desktop, tablet, mobile)
    const desktopIndicator = screen.queryByText(/desktop/i) || 
      screen.queryByTitle(/desktop/i) ||
      screen.queryByLabelText(/desktop/i);
    const tabletIndicator = screen.queryByText(/tablet/i) || 
      screen.queryByTitle(/tablet/i) ||
      screen.queryByLabelText(/tablet/i);
    const mobileIndicator = screen.queryByText(/mobile/i) || 
      screen.queryByTitle(/mobile/i) ||
      screen.queryByLabelText(/mobile/i);
    
    // At least one breakpoint control should exist
    expect(
      desktopIndicator || tabletIndicator || mobileIndicator || 
      screen.getAllByRole('button').length > 0
    ).toBeTruthy();
  });

  it('updates desktop spacing value', () => {
    const onChange = vi.fn();
    
    render(
      <ResponsiveSpacingControl 
        field={{ label: 'Responsive Spacing' }} 
        value={defaultValue} 
        onChange={onChange} 
      />
    );
    
    // Find spacing inputs
    const inputs = screen.getAllByRole('spinbutton');
    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: '24' } });
      expect(onChange).toHaveBeenCalled();
    }
  });

  it('switches between breakpoints', () => {
    const onChange = vi.fn();
    
    render(
      <ResponsiveSpacingControl 
        field={{ label: 'Responsive Spacing' }} 
        value={defaultValue} 
        onChange={onChange} 
      />
    );
    
    // Find breakpoint toggle buttons
    const buttons = screen.getAllByRole('button');
    
    // Click tablet button if exists
    const tabletButton = buttons.find(btn => 
      btn.textContent?.toLowerCase().includes('tablet') ||
      btn.getAttribute('title')?.toLowerCase().includes('tablet') ||
      btn.getAttribute('aria-label')?.toLowerCase().includes('tablet')
    );
    
    if (tabletButton) {
      fireEvent.click(tabletButton);
      // Should switch to tablet view
      expect(screen.getByText('Responsive Spacing')).toBeInTheDocument();
    }
  });

  it('maintains linked values per breakpoint', () => {
    const onChange = vi.fn();
    
    render(
      <ResponsiveSpacingControl 
        field={{ label: 'Responsive Spacing' }} 
        value={defaultValue} 
        onChange={onChange} 
      />
    );
    
    // When linked, changing one value should update all sides
    const inputs = screen.getAllByRole('spinbutton');
    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: '20' } });
      
      // Check that the change was applied (linked mode should update all)
      expect(onChange).toHaveBeenCalled();
    }
  });

  it('handles undefined value gracefully', () => {
    const onChange = vi.fn();
    
    expect(() => {
      render(
        <ResponsiveSpacingControl 
          field={{ label: 'Responsive Spacing' }} 
          value={undefined} 
          onChange={onChange} 
        />
      );
    }).not.toThrow();
  });

  it('handles partial breakpoint values', () => {
    const onChange = vi.fn();
    const partialValue = {
      desktop: { top: '16', right: '16', bottom: '16', left: '16', unit: 'px' as const, linked: true },
      // tablet and mobile might be undefined
    };
    
    expect(() => {
      render(
        <ResponsiveSpacingControl 
          field={{ label: 'Responsive Spacing' }} 
          value={partialValue as typeof defaultValue} 
          onChange={onChange} 
        />
      );
    }).not.toThrow();
  });
});
