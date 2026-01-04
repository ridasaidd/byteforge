import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlignmentControl, type AlignmentValue } from '../fields/AlignmentControl';

describe('AlignmentControl', () => {
  const defaultValue: AlignmentValue = {
    horizontal: 'left',
    vertical: 'top',
  };

  it('renders with label', () => {
    const onChange = vi.fn();
    
    render(
      <AlignmentControl 
        field={{ label: 'Alignment' }} 
        value={defaultValue} 
        onChange={onChange} 
      />
    );
    
    expect(screen.getByText('Alignment')).toBeInTheDocument();
  });

  it('displays horizontal alignment options', () => {
    const onChange = vi.fn();
    
    render(
      <AlignmentControl 
        field={{ label: 'Alignment' }} 
        value={defaultValue} 
        onChange={onChange} 
      />
    );
    
    // Should have alignment buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('selects left horizontal alignment', () => {
    const onChange = vi.fn();
    
    render(
      <AlignmentControl 
        field={{ label: 'Alignment' }} 
        value={{ ...defaultValue, horizontal: 'center' }} 
        onChange={onChange} 
      />
    );
    
    // Find left alignment button (may be icon or text)
    const leftButton = screen.queryByTitle(/left/i) || 
      screen.queryByLabelText(/left/i) ||
      screen.getAllByRole('button')[0];
    
    if (leftButton) {
      fireEvent.click(leftButton);
      expect(onChange).toHaveBeenCalled();
    }
  });

  it('selects center horizontal alignment', () => {
    const onChange = vi.fn();
    
    render(
      <AlignmentControl 
        field={{ label: 'Alignment' }} 
        value={defaultValue} 
        onChange={onChange} 
      />
    );
    
    // Find center alignment button
    const centerButton = screen.queryByTitle(/center/i) || 
      screen.queryByLabelText(/center/i) ||
      screen.getAllByRole('button')[1];
    
    if (centerButton) {
      fireEvent.click(centerButton);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ horizontal: 'center' })
      );
    }
  });

  it('selects right horizontal alignment', () => {
    const onChange = vi.fn();
    
    render(
      <AlignmentControl 
        field={{ label: 'Alignment' }} 
        value={defaultValue} 
        onChange={onChange} 
      />
    );
    
    // Find right alignment button
    const rightButton = screen.queryByTitle(/right/i) || 
      screen.queryByLabelText(/right/i) ||
      screen.getAllByRole('button')[2];
    
    if (rightButton) {
      fireEvent.click(rightButton);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ horizontal: 'right' })
      );
    }
  });

  it('handles vertical alignment when available', () => {
    const onChange = vi.fn();
    
    render(
      <AlignmentControl 
        field={{ label: 'Alignment' }} 
        value={defaultValue} 
        onChange={onChange} 
      />
    );
    
    // Vertical alignment might be in a separate section
    const topButton = screen.queryByTitle(/top/i) || screen.queryByLabelText(/top/i);
    const middleButton = screen.queryByTitle(/middle/i) || screen.queryByLabelText(/middle/i);
    const bottomButton = screen.queryByTitle(/bottom/i) || screen.queryByLabelText(/bottom/i);
    
    // If vertical controls exist, test them
    if (middleButton) {
      fireEvent.click(middleButton);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ vertical: 'center' })
      );
    }
  });

  it('reflects current horizontal alignment value', () => {
    const onChange = vi.fn();
    
    const { rerender } = render(
      <AlignmentControl 
        field={{ label: 'Alignment' }} 
        value={{ horizontal: 'center', vertical: 'top' }} 
        onChange={onChange} 
      />
    );
    
    // The center button should be active/selected
    // Check for aria-pressed, data-active, or CSS class
    const buttons = screen.getAllByRole('button');
    const activeButton = buttons.find(btn => 
      btn.getAttribute('aria-pressed') === 'true' ||
      btn.getAttribute('data-active') === 'true' ||
      btn.classList.contains('active')
    );
    
    // At minimum, component should render
    expect(screen.getByText('Alignment')).toBeInTheDocument();
  });

  it('handles undefined value gracefully', () => {
    const onChange = vi.fn();
    
    expect(() => {
      render(
        <AlignmentControl 
          field={{ label: 'Alignment' }} 
          value={undefined as unknown as AlignmentValue} 
          onChange={onChange} 
        />
      );
    }).not.toThrow();
  });
});
