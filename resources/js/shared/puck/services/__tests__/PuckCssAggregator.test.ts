import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractCssFromPuckData,
  generateVariablesCss,
  extractLayoutComponentsCss,
  extractTypographyComponentsCss,
} from '../PuckCssAggregator';
import type { Data } from '@puckeditor/core';

describe('PuckCssAggregator', () => {
  describe('generateVariablesCss', () => {
    it('should generate CSS variables from theme data', () => {
      const themeData = {
        colors: {
          primary: { 500: '#3b82f6', 600: '#2563eb' },
          secondary: { 500: '#10b981' },
        },
        fonts: {
          heading: { size: '32px', weight: '700' },
          body: { size: '16px', weight: '400' },
        },
      };

      const css = generateVariablesCss(themeData);

      expect(css).toContain(':root');
      expect(css).toContain('--colors-primary-500: #3b82f6');
      expect(css).toContain('--colors-primary-600: #2563eb');
      expect(css).toContain('--colors-secondary-500: #10b981');
      expect(css).toContain('--fonts-heading-size: 32px');
      expect(css).toContain('--fonts-heading-weight: 700');
    });

    it('should handle nested theme data with multiple levels', () => {
      const themeData = {
        colors: {
          brand: {
            light: '#f0f9ff',
            main: '#0ea5e9',
            dark: '#0369a1',
          },
        },
        typography: {
          sizes: {
            xs: '12px',
            sm: '14px',
            md: '16px',
          },
        },
      };

      const css = generateVariablesCss(themeData);

      expect(css).toContain('--colors-brand-light: #f0f9ff');
      expect(css).toContain('--colors-brand-main: #0ea5e9');
      expect(css).toContain('--colors-brand-dark: #0369a1');
      expect(css).toContain('--typography-sizes-xs: 12px');
    });

    it('should return empty CSS if theme data is empty', () => {
      const css = generateVariablesCss({});

      expect(css).toContain(':root');
      expect(css).toContain('{}');
    });
  });

  describe('extractLayoutComponentsCss', () => {
    it('should extract CSS from layout components in Puck data', () => {
      const puckData: Partial<Data> = {
        content: [
          {
            type: 'box',
            props: {
              padding: { top: 40, bottom: 40, left: 20, right: 20 },
              backgroundColor: '#ffffff',
              borderRadius: 8,
            },
          },
        ],
      };

      const css = extractLayoutComponentsCss(puckData as Data);

      expect(css).toBeTruthy();
      expect(css.length).toBeGreaterThan(0);
      // Should contain component-specific selectors
      expect(css).toMatch(/\.box|box\s*{/);
    });

    it('should handle multiple layout components', () => {
      const puckData: Partial<Data> = {
        content: [
          {
            type: 'box',
            props: { padding: { top: 40, bottom: 40, left: 20, right: 20 } },
          },
          {
            type: 'box',
            props: { padding: { top: 20, bottom: 20, left: 10, right: 10 } },
          },
        ],
      };

      const css = extractLayoutComponentsCss(puckData as Data);

      expect(css).toBeTruthy();
      expect(css.length).toBeGreaterThan(0);
    });

    it('should return empty CSS if no layout components', () => {
      const puckData: Partial<Data> = {
        content: [
          {
            type: 'text',
            props: { content: 'Hello' },
          },
        ],
      };

      const css = extractLayoutComponentsCss(puckData as Data);

      expect(css).toBe('');
    });
  });

  describe('extractTypographyComponentsCss', () => {
    it('should extract CSS from typography components in Puck data', () => {
      const puckData: Partial<Data> = {
        content: [
          {
            type: 'heading',
            props: {
              content: 'Title',
              fontSize: 32,
              fontWeight: 700,
              lineHeight: 1.2,
              color: '#000000',
            },
          },
        ],
      };

      const css = extractTypographyComponentsCss(puckData as Data);

      expect(css).toBeTruthy();
      expect(css.length).toBeGreaterThan(0);
      // Should contain component-specific selectors
      expect(css).toMatch(/\.heading|heading\s*{/);
    });

    it('should handle multiple typography components', () => {
      const puckData: Partial<Data> = {
        content: [
          {
            type: 'heading',
            props: { fontSize: 32, fontWeight: 700 },
          },
          {
            type: 'paragraph',
            props: { fontSize: 16, fontWeight: 400 },
          },
        ],
      };

      const css = extractTypographyComponentsCss(puckData as Data);

      expect(css).toBeTruthy();
      expect(css.length).toBeGreaterThan(0);
    });

    it('should return empty CSS if no typography components', () => {
      const puckData: Partial<Data> = {
        content: [
          {
            type: 'image',
            props: { src: 'test.jpg' },
          },
        ],
      };

      const css = extractTypographyComponentsCss(puckData as Data);

      expect(css).toBe('');
    });
  });

  describe('extractCssFromPuckData', () => {
    it('should combine variables, layout, and typography CSS', () => {
      const themeData = {
        colors: { primary: { 500: '#3b82f6' } },
      };

      const puckData: Partial<Data> = {
        content: [
          {
            type: 'box',
            props: { padding: { top: 40, bottom: 40, left: 20, right: 20 } },
          },
          {
            type: 'heading',
            props: { fontSize: '32px', fontWeight: '700' },
          },
        ],
      };

      const css = extractCssFromPuckData(puckData as Data, themeData);

      // Should contain variables
      expect(css).toContain('--colors-primary-500: #3b82f6');
      // Should contain component CSS
      expect(css.length).toBeGreaterThan(100);
    });

    it('should handle empty Puck data', () => {
      const themeData = { colors: { primary: { 500: '#3b82f6' } } };
      const puckData: Partial<Data> = { content: [] };

      const css = extractCssFromPuckData(puckData as Data, themeData);

      expect(css).toBeTruthy();
      expect(css).toContain('--colors-primary-500');
    });

    it('should handle missing theme data gracefully', () => {
      const puckData: Partial<Data> = {
        content: [
          {
            type: 'Box',
            id: 'box-123',
            props: { id: 'box-123', padding: { mobile: { top: '40', bottom: '40', left: '20', right: '20', unit: 'px', linked: false } } },
          },
        ],
      };

      const css = extractCssFromPuckData(puckData as Data);

      expect(css).toBeTruthy();
      expect(css.length).toBeGreaterThan(0);
    });

    it('should return non-empty CSS with valid format', () => {
      const puckData: Partial<Data> = {
        content: [
          {
            type: 'Box',
            id: 'box-456',
            props: { id: 'box-456', padding: { mobile: { top: '40', bottom: '40', left: '20', right: '20', unit: 'px', linked: false } } },
          },
        ],
      };

      const css = extractCssFromPuckData(puckData as Data);

      // Should have proper CSS structure
      expect(css).toMatch(/{|}/);
      expect(css.length).toBeGreaterThan(0);
    });
  });
});
