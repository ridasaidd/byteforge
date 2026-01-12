import { describe, it, expect } from 'vitest';
import { buildLayoutCSS, buildTypographyCSS } from '../cssBuilder';

describe('Phase 4 Controls - CSS Generation in cssBuilder', () => {
  describe('Aspect Ratio', () => {
    it('generates aspect-ratio CSS for preset values', () => {
      const css = buildLayoutCSS({
        className: 'test-box',
        aspectRatio: '16/9',
      });
      
      expect(css).toContain('.test-box { aspect-ratio: 16/9; }');
    });

    it('generates aspect-ratio CSS for custom values', () => {
      const css = buildLayoutCSS({
        className: 'test-box',
        aspectRatio: 'custom',
        aspectRatioCustom: '5/4',
      });
      
      expect(css).toContain('.test-box { aspect-ratio: 5/4; }');
    });

    it('does not generate CSS for auto aspect ratio', () => {
      const css = buildLayoutCSS({
        className: 'test-box',
        aspectRatio: 'auto',
      });
      
      expect(css).not.toContain('aspect-ratio');
    });

    it('handles square (1:1) aspect ratio', () => {
      const css = buildLayoutCSS({
        className: 'test-box',
        aspectRatio: '1/1',
      });
      
      expect(css).toContain('.test-box { aspect-ratio: 1/1; }');
    });
  });

  describe('Text Decoration', () => {
    it('generates text-decoration CSS for underline', () => {
      const css = buildTypographyCSS({
        className: 'test-heading',
        textDecoration: 'underline',
      });
      
      expect(css).toContain('text-decoration: underline;');
    });

    it('generates text-decoration CSS for line-through', () => {
      const css = buildTypographyCSS({
        className: 'test-text',
        textDecoration: 'line-through',
      });
      
      expect(css).toContain('text-decoration: line-through;');
    });

    it('generates text-decoration-style CSS when decoration is set', () => {
      const css = buildTypographyCSS({
        className: 'test-heading',
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
      });
      
      expect(css).toContain('text-decoration: underline;');
      expect(css).toContain('text-decoration-style: dotted;');
    });

    it('does not generate CSS for none text decoration', () => {
      const css = buildTypographyCSS({
        className: 'test-text',
        textDecoration: 'none',
      });
      
      expect(css).not.toContain('text-decoration: none;');
    });

    it('generates wavy decoration style', () => {
      const css = buildTypographyCSS({
        className: 'test-heading',
        textDecoration: 'underline',
        textDecorationStyle: 'wavy',
      });
      
      expect(css).toContain('text-decoration-style: wavy;');
    });

    it('generates double decoration style', () => {
      const css = buildTypographyCSS({
        className: 'test-heading',
        textDecoration: 'underline',
        textDecorationStyle: 'double',
      });
      
      expect(css).toContain('text-decoration-style: double;');
    });
  });

  describe('Responsive Gap (Flex)', () => {
    it('generates responsive gap CSS for flex layout', () => {
      const css = buildLayoutCSS({
        className: 'test-flex',
        display: { mobile: 'flex' },
        flexGap: {
          mobile: { value: '8', unit: 'px' },
          desktop: { value: '16', unit: 'px' },
        },
      });
      
      expect(css).toContain('gap: 8px;');
      expect(css).toContain('@media (min-width: 1024px)');
      expect(css).toContain('gap: 16px;');
    });

    it('handles flex gap with rem units', () => {
      const css = buildLayoutCSS({
        className: 'test-flex',
        display: { mobile: 'flex' },
        flexGap: {
          mobile: { value: '1', unit: 'rem' },
        },
      });
      
      expect(css).toContain('gap: 1rem;');
    });
  });

  describe('Visibility', () => {
    it('generates visibility CSS to hide on mobile', () => {
      const css = buildLayoutCSS({
        className: 'test-box',
        visibility: {
          mobile: 'hidden',
          tablet: 'visible',
          desktop: 'visible',
        },
      });
      
      expect(css).toContain('.test-box { display: none; }');
      expect(css).toContain('@media (min-width: 768px)');
      expect(css).toContain('display: revert;');
    });

    it('generates visibility CSS to hide on desktop', () => {
      const css = buildLayoutCSS({
        className: 'test-box',
        visibility: {
          mobile: 'visible',
          tablet: 'visible',
          desktop: 'hidden',
        },
      });
      
      expect(css).toContain('@media (min-width: 1024px)');
      expect(css).toContain('display: none;');
    });

    it('does not generate CSS when all breakpoints are visible', () => {
      const css = buildLayoutCSS({
        className: 'test-box',
        visibility: {
          mobile: 'visible',
          tablet: 'visible',
          desktop: 'visible',
        },
      });
      
      // Should not contain any visibility-related CSS
      const hasVisibilityCSS = css.includes('display: none') || css.includes('display: revert');
      expect(hasVisibilityCSS).toBe(false);
    });
  });

  describe('Object Fit and Position', () => {
    it('generates object-fit CSS', () => {
      const css = buildLayoutCSS({
        className: 'test-image',
        objectFit: 'contain',
      });
      
      expect(css).toContain('.test-image { object-fit: contain; }');
    });

    it('does not generate CSS for default object-fit (cover)', () => {
      const css = buildLayoutCSS({
        className: 'test-image',
        objectFit: 'cover',
      });
      
      expect(css).not.toContain('object-fit');
    });

    it('generates object-position CSS', () => {
      const css = buildLayoutCSS({
        className: 'test-image',
        objectPosition: 'top left',
      });
      
      expect(css).toContain('.test-image { object-position: top left; }');
    });

    it('does not generate CSS for default object-position (center)', () => {
      const css = buildLayoutCSS({
        className: 'test-image',
        objectPosition: 'center',
      });
      
      expect(css).not.toContain('object-position');
    });
  });

  describe('Min/Max Width and Height', () => {
    it('generates min-width CSS', () => {
      const css = buildLayoutCSS({
        className: 'test-box',
        minWidth: {
          mobile: { value: '200', unit: 'px' },
        },
      });
      
      expect(css).toContain('min-width: 200px;');
    });

    it('generates max-width CSS', () => {
      const css = buildLayoutCSS({
        className: 'test-box',
        maxWidth: {
          mobile: { value: '1200', unit: 'px' },
        },
      });
      
      expect(css).toContain('max-width: 1200px;');
    });

    it('generates min-height CSS', () => {
      const css = buildLayoutCSS({
        className: 'test-box',
        minHeight: {
          mobile: { value: '300', unit: 'px' },
        },
      });
      
      expect(css).toContain('min-height: 300px;');
    });

    it('generates max-height CSS', () => {
      const css = buildLayoutCSS({
        className: 'test-box',
        maxHeight: {
          mobile: { value: '80', unit: 'vh' },
        },
      });
      
      expect(css).toContain('max-height: 80vh;');
    });
  });
});
