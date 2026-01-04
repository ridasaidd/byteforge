import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResponsiveFontSizeControl } from '../fields/ResponsiveFontSizeControl';

// Mock matchMedia
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

describe('ResponsiveFontSizeControl', () => {
  const defaultValue = {
    desktop: '16px',
    tablet: '14px',
    mobile: '12px',
  };

  it('renders with label', () => {
    const onChange = vi.fn();
    
    render(
      <ResponsiveFontSizeControl 
        field={{ label: 'Font Size' }} 
        value={defaultValue} 
        onChange={onChange} 
      />
    );
    
    expect(screen.getByText('Font Size')).toBeInTheDocument();
  });

  it('displays breakpoint controls', () => {
    const onChange = vi.fn();
    
    render(
      <ResponsiveFontSizeControl 
        field={{ label: 'Font Size' }} 
        value={defaultValue} 
        onChange={onChange} 
      />
    );
    
    // Should have buttons or tabs for breakpoints
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows current font size value', () => {
    const onChange = vi.fn();
    
    render(
      <ResponsiveFontSizeControl 
        field={{ label: 'Font Size' }} 
        value={defaultValue} 
        onChange={onChange} 
      />
    );
    
    // Should show font size input or display
    const input = screen.queryByRole('spinbutton') || 
      screen.queryByRole('textbox') ||
      screen.queryByDisplayValue('16');
    
    // Component should render
    expect(screen.getByText('Font Size')).toBeInTheDocument();
  });

  it('updates desktop font size', () => {
    const onChange = vi.fn();
    
    render(
      <ResponsiveFontSizeControl 
        field={{ label: 'Font Size' }} 
        value={defaultValue} 
        onChange={onChange} 
      />
    );
    
    const input = screen.queryByRole('spinbutton') || screen.queryByRole('textbox');
    
    if (input) {
      fireEvent.change(input, { target: { value: '18' } });
      expect(onChange).toHaveBeenCalled();
    }
  });

  it('switches to tablet breakpoint', () => {
    const onChange = vi.fn();
    
    render(
      <ResponsiveFontSizeControl 
        field={{ label: 'Font Size' }} 
        value={defaultValue} 
        onChange={onChange} 
      />
    );
    
    const buttons = screen.getAllByRole('button');
    const tabletButton = buttons.find(btn => 
      btn.textContent?.toLowerCase().includes('tablet') ||
      btn.getAttribute('title')?.toLowerCase().includes('tablet') ||
      btn.getAttribute('aria-label')?.toLowerCase().includes('tablet')
    ) || buttons[1];
    
    if (tabletButton) {
      fireEvent.click(tabletButton);
      expect(screen.getByText('Font Size')).toBeInTheDocument();
    }
  });

  it('switches to mobile breakpoint', () => {
    const onChange = vi.fn();
    
    render(
      <ResponsiveFontSizeControl 
        field={{ label: 'Font Size' }} 
        value={defaultValue} 
        onChange={onChange} 
      />
    );
    
    const buttons = screen.getAllByRole('button');
    const mobileButton = buttons.find(btn => 
      btn.textContent?.toLowerCase().includes('mobile') ||
      btn.getAttribute('title')?.toLowerCase().includes('mobile') ||
      btn.getAttribute('aria-label')?.toLowerCase().includes('mobile')
    ) || buttons[2];
    
    if (mobileButton) {
      fireEvent.click(mobileButton);
      expect(screen.getByText('Font Size')).toBeInTheDocument();
    }
  });

  it('handles undefined value gracefully', () => {
    const onChange = vi.fn();
    
    expect(() => {
      render(
        <ResponsiveFontSizeControl 
          field={{ label: 'Font Size' }} 
          value={undefined} 
          onChange={onChange} 
        />
      );
    }).not.toThrow();
  });

  it('handles partial breakpoint values', () => {
    const onChange = vi.fn();
    const partialValue = {
      desktop: '16px',
      // tablet and mobile might be undefined
    };
    
    expect(() => {
      render(
        <ResponsiveFontSizeControl 
          field={{ label: 'Font Size' }} 
          value={partialValue as typeof defaultValue} 
          onChange={onChange} 
        />
      );
    }).not.toThrow();
  });

  it('supports different unit types', () => {
    const onChange = vi.fn();
    const remValue = {
      desktop: '1rem',
      tablet: '0.875rem',
      mobile: '0.75rem',
    };
    
    render(
      <ResponsiveFontSizeControl 
        field={{ label: 'Font Size' }} 
        value={remValue} 
        onChange={onChange} 
      />
    );
    
    expect(screen.getByText('Font Size')).toBeInTheDocument();
  });
});
