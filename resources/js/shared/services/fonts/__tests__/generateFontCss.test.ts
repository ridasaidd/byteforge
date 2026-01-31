import { describe, it, expect } from 'vitest';
import {
  generateFontFaceCSS,
  generateFontVariablesCSS,
  generateCompleteFontCSS,
  generateFontCSSFromThemeData,
} from '../generateFontCss';

describe('Font CSS Generator', () => {
  describe('generateFontFaceCSS', () => {
    it('should generate @font-face for bundled fonts', () => {
      const css = generateFontFaceCSS({ sans: 'Inter' });

      expect(css).toContain("font-family: 'Inter'");
      expect(css).toContain("src: url('/fonts/sans/Inter-Variable.woff2')");
      expect(css).toContain('font-weight: 100 900');
      expect(css).toContain('font-display: swap');
    });

    it('should skip system fonts', () => {
      const css = generateFontFaceCSS({ sans: 'System Default' });

      expect(css).toBe('');
      expect(css).not.toContain('@font-face');
    });

    it('should generate multiple fonts', () => {
      const css = generateFontFaceCSS({
        sans: 'Inter',
        serif: 'Playfair Display',
        mono: 'JetBrains Mono',
      });

      expect(css).toContain("font-family: 'Inter'");
      expect(css).toContain("font-family: 'Playfair Display'");
      expect(css).toContain("font-family: 'JetBrains Mono'");
    });

    it('should respect variable font weight ranges', () => {
      const css = generateFontFaceCSS({ serif: 'Playfair Display' });

      expect(css).toContain('font-weight: 400 900');
    });

    it('should handle mixed selections', () => {
      const css = generateFontFaceCSS({
        sans: 'Inter',
        serif: undefined as any,
        mono: 'Fira Code',
      });

      expect(css).toContain("font-family: 'Inter'");
      expect(css).toContain("font-family: 'Fira Code'");
    });
  });

  describe('generateFontVariablesCSS', () => {
    it('should generate CSS variables for all categories', () => {
      const css = generateFontVariablesCSS({
        sans: 'Inter',
        serif: 'Playfair Display',
        mono: 'JetBrains Mono',
      });

      expect(css).toContain('--font-family-sans: "Inter", system-ui, -apple-system, sans-serif;');
      expect(css).toContain('--font-family-serif: "Playfair Display", Georgia, serif;');
      expect(css).toContain('--font-family-mono: "JetBrains Mono", Consolas, monospace;');
    });

    it('should handle system fonts correctly', () => {
      const css = generateFontVariablesCSS({
        sans: 'System Default',
      });

      expect(css).toContain('--font-family-sans: -apple-system, BlinkMacSystemFont');
      expect(css).not.toContain('System Default');
    });

    it('should wrap custom values in :root', () => {
      const css = generateFontVariablesCSS({ sans: 'Inter' });

      expect(css).toMatch(/^:root \{/);
      expect(css).toMatch(/\}$/);
    });

    it('should skip empty selections', () => {
      const css = generateFontVariablesCSS({ sans: 'Inter', serif: '' });

      expect(css).toContain('--font-family-sans');
      expect(css).not.toContain('--font-family-serif');
    });
  });

  describe('generateCompleteFontCSS', () => {
    it('should include both @font-face and variables', () => {
      const css = generateCompleteFontCSS({ sans: 'Inter' });

      expect(css).toContain('@font-face');
      expect(css).toContain(':root');
      expect(css).toContain('--font-family-sans');
      expect(css).toContain("font-family: 'Inter'");
    });

    it('should include base font application', () => {
      const css = generateCompleteFontCSS({ sans: 'Inter' });

      expect(css).toContain('body {');
      expect(css).toContain('font-family: var(--font-family-sans);');
    });

    it('should include code element styling', () => {
      const css = generateCompleteFontCSS({ mono: 'JetBrains Mono' });

      expect(css).toContain('code, pre, kbd, samp');
      expect(css).toContain('font-family: var(--font-family-mono, monospace);');
    });

    it('should be valid CSS with proper formatting', () => {
      const css = generateCompleteFontCSS({
        sans: 'Inter',
        serif: 'Playfair Display',
      });

      // Check basic structure
      expect(css).toContain('/*');
      expect(css).toContain('*/');
      expect(css).not.toContain('undefined');
      expect(css).not.toContain('null');
    });

    it('should skip system fonts from @font-face but include in variables', () => {
      const css = generateCompleteFontCSS({
        sans: 'System Default',
      });

      // No @font-face for system font
      expect(css).not.toContain("font-family: 'System Default'");
      // But CSS variable should exist
      expect(css).toContain('--font-family-sans');
    });
  });

  describe('generateFontCSSFromThemeData', () => {
    it('should handle FontConfig object format', () => {
      const themeData = {
        sans: {
          name: 'Inter',
          source: 'bundled',
          file: 'Inter-Variable.woff2',
          weights: [100, 900],
          isVariable: true,
        },
      };

      const css = generateFontCSSFromThemeData(themeData);

      expect(css).toContain("font-family: 'Inter'");
      expect(css).toContain('--font-family-sans');
    });

    it('should handle legacy string format', () => {
      const themeData = {
        sans: 'Inter',
      };

      const css = generateFontCSSFromThemeData(themeData);

      expect(css).toContain("font-family: 'Inter'");
    });

    it('should handle mixed formats', () => {
      const themeData = {
        sans: 'Inter', // legacy string
        serif: {
          // FontConfig object
          name: 'Playfair Display',
          source: 'bundled',
        },
        mono: '', // empty
      };

      const css = generateFontCSSFromThemeData(themeData);

      expect(css).toContain("font-family: 'Inter'");
      expect(css).toContain("font-family: 'Playfair Display'");
    });

    it('should skip missing name fields', () => {
      const themeData = {
        sans: {
          source: 'bundled',
          // missing 'name' field - will be skipped
        },
      };

      const css = generateFontCSSFromThemeData(themeData);

      // When name is missing, the font is not found and variable is not generated
      expect(css).not.toContain('undefined');
    });
  });

  describe('Edge cases', () => {
    it('should handle all empty selections', () => {
      const css = generateCompleteFontCSS({
        sans: '',
        serif: '',
        mono: '',
      });

      expect(css).toContain(':root');
      expect(css).not.toContain('@font-face');
    });

    it('should handle special characters in font names', () => {
      const css = generateFontFaceCSS({ serif: 'Playfair Display' });

      expect(css).toContain("font-family: 'Playfair Display'");
    });

    it('should escape quotes properly in CSS', () => {
      const css = generateFontVariablesCSS({ sans: 'Inter' });

      // Font names should be in quotes
      expect(css).toContain('"Inter"');
      // Fallback stacks use unquoted font names
      expect(css).toContain('system-ui');
    });
  });
});
