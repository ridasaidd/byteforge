import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FontPreview } from '../FontPreview';

describe('FontPreview Component', () => {
  it('should render font information', () => {
    render(<FontPreview fontName="Inter" category="sans" />);

    expect(screen.getByText('Inter')).toBeInTheDocument();
    expect(screen.getByText(/Category:/i)).toBeInTheDocument();
  });

  it('should display source type (Bundled or System)', () => {
    render(<FontPreview fontName="Inter" category="sans" />);

    expect(screen.getByText(/Source:/i)).toBeInTheDocument();
  });

  it('should show variable font weight range', () => {
    render(<FontPreview fontName="Inter" category="sans" />);

    expect(screen.getByText(/Variable Range:/i)).toBeInTheDocument();
  });

  it('should display fallback stack', () => {
    render(<FontPreview fontName="Inter" category="sans" />);

    expect(screen.getByText(/Fallback:/i)).toBeInTheDocument();
  });

  it('should show preview text at different weights', () => {
    render(<FontPreview fontName="Inter" category="sans" />);

    // Should have weight labels for variable fonts
    expect(screen.getAllByText(/Weight:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/The quick brown fox/i).length).toBeGreaterThan(0);
  });

  it('should display text size variations', () => {
    render(
      <FontPreview fontName="Inter" category="sans" />
    );

    // Should show text at different sizes - look for the size labels or text content
    expect(screen.getByText(/12px - Sample text/i)).toBeInTheDocument();
  });

  it('should show full character set preview', () => {
    render(<FontPreview fontName="Inter" category="sans" />);

    expect(screen.getByText(/Full Character Set/i)).toBeInTheDocument();
    expect(screen.getByText(/ABCDEFGHIJKLMNOPQRSTUVWXYZ/i)).toBeInTheDocument();
  });

  it('should handle serif fonts', () => {
    render(<FontPreview fontName="Playfair Display" category="serif" />);

    expect(screen.getByText('Playfair Display')).toBeInTheDocument();
  });

  it('should handle mono fonts', () => {
    render(<FontPreview fontName="JetBrains Mono" category="mono" />);

    expect(screen.getByText('JetBrains Mono')).toBeInTheDocument();
  });

  it('should handle system fonts', () => {
    render(<FontPreview fontName="System Default" category="sans" />);

    expect(screen.getByText('System Default')).toBeInTheDocument();
    expect(screen.getByText(/Source:/i)).toBeInTheDocument();
  });

  it('should show error for non-existent font', () => {
    render(<FontPreview fontName="NonExistentFont" category="sans" />);

    expect(screen.getByText(/Font not found/i)).toBeInTheDocument();
  });

  it('should accept custom className', () => {
    const { container } = render(
      <FontPreview
        fontName="Inter"
        category="sans"
        className="custom-class"
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  it('should apply font to preview elements', () => {
    const { container } = render(
      <FontPreview fontName="Inter" category="sans" />
    );

    // Elements with style attributes (the divs with fontFamily styles)
    const elementsWithStyle = container.querySelectorAll('[style]');
    expect(elementsWithStyle.length).toBeGreaterThan(0);
  });
});
