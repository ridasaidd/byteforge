import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FontFamilyPicker } from '../FontFamilyPicker';

describe('FontFamilyPicker Component', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it('should render dropdown with fonts', () => {
    render(
      <FontFamilyPicker
        category="sans"
        selectedFont="Inter"
        onSelect={mockOnSelect}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('should display available fonts in dropdown', () => {
    const { container } = render(
      <FontFamilyPicker
        category="sans"
        selectedFont="Inter"
        onSelect={mockOnSelect}
      />
    );

    const options = container.querySelectorAll('option');
    expect(options.length).toBeGreaterThan(0);
  });

  it('should mark system fonts in dropdown', () => {
    const { container } = render(
      <FontFamilyPicker
        category="sans"
        selectedFont="System Default"
        onSelect={mockOnSelect}
      />
    );

    const options = Array.from(container.querySelectorAll('option'));
    const systemFontOption = options.find(opt => opt.textContent?.includes('System'));
    expect(systemFontOption).toBeInTheDocument();
  });

  it('should call onSelect when font is selected', () => {
    const { container } = render(
      <FontFamilyPicker
        category="sans"
        selectedFont=""
        onSelect={mockOnSelect}
      />
    );

    const select = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Inter' } });

    expect(mockOnSelect).toHaveBeenCalledWith('Inter');
  });

  it('should display font preview when selected', () => {
    render(
      <FontFamilyPicker
        category="sans"
        selectedFont="Inter"
        onSelect={mockOnSelect}
      />
    );

    // Check that preview section with "Bundled" label is displayed
    expect(screen.getByText('Bundled')).toBeInTheDocument();
  });

  it('should show variable font weight range', () => {
    render(
      <FontFamilyPicker
        category="sans"
        selectedFont="Inter"
        onSelect={mockOnSelect}
      />
    );

    // Variable fonts should show weight range
    const text = screen.getByText(/Variable:/i);
    expect(text).toBeInTheDocument();
  });

  it('should accept custom className', () => {
    const { container } = render(
      <FontFamilyPicker
        category="sans"
        selectedFont="Inter"
        onSelect={mockOnSelect}
        className="custom-class"
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  it('should work with all categories', () => {
    const categories: Array<'sans' | 'serif' | 'mono'> = ['sans', 'serif', 'mono'];

    categories.forEach(category => {
      const { unmount } = render(
        <FontFamilyPicker
          category={category}
          selectedFont={undefined}
          onSelect={mockOnSelect}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();

      unmount();
    });
  });

  it('should handle undefined selectedFont', () => {
    render(
      <FontFamilyPicker
        category="sans"
        selectedFont={undefined}
        onSelect={mockOnSelect}
      />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('');
  });
});
