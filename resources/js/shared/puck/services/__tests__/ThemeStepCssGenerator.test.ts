import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateThemeStepCss, ThemeStepCssGenerator } from '../ThemeStepCssGenerator';
import { generateVariablesCss, extractCssFromPuckData } from '../PuckCssAggregator';
import type { Data } from '@puckeditor/core';
import type { ThemeData } from '../PuckCssAggregator';

vi.mock('../PuckCssAggregator', () => ({
  generateVariablesCss: vi.fn(),
  extractCssFromPuckData: vi.fn(),
}));

describe('ThemeStepCssGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateThemeStepCss', () => {
    it('should generate variables CSS for settings step', () => {
      const themeData: ThemeData = {
        colors: { primary: { 500: '#3b82f6' } },
      };

      vi.mocked(generateVariablesCss).mockReturnValue(
        ':root { --colors-primary-500: #3b82f6; }'
      );

      const css = generateThemeStepCss('settings', { themeData });

      expect(generateVariablesCss).toHaveBeenCalledWith(themeData);
      expect(css).toBe(':root { --colors-primary-500: #3b82f6; }');
    });

    it('should generate header CSS from Puck data', () => {
      const headerData: Data = {
        content: [
          {
            type: 'hero',
            props: { padding: { top: 40, bottom: 40, left: 20, right: 20 } },
          },
        ],
      };

      vi.mocked(extractCssFromPuckData).mockReturnValue(
        '.hero { padding: 40px 20px 40px 20px; }'
      );

      const css = generateThemeStepCss('header', { puckData: headerData });

      expect(extractCssFromPuckData).toHaveBeenCalledWith(headerData, undefined);
      expect(css).toBe('.hero { padding: 40px 20px 40px 20px; }');
    });

    it('should generate footer CSS from Puck data', () => {
      const footerData: Data = {
        content: [
          {
            type: 'footer',
            props: { padding: { top: 20, bottom: 20, left: 10, right: 10 } },
          },
        ],
      };

      vi.mocked(extractCssFromPuckData).mockReturnValue(
        '.footer { padding: 20px 10px 20px 10px; }'
      );

      const css = generateThemeStepCss('footer', { puckData: footerData });

      expect(extractCssFromPuckData).toHaveBeenCalledWith(footerData, undefined);
      expect(css).toBe('.footer { padding: 20px 10px 20px 10px; }');
    });

    it('should generate template CSS from Puck data with theme data', () => {
      const templateData: Data = { content: [] };
      const themeData: ThemeData = { colors: { primary: { 500: '#3b82f6' } } };

      vi.mocked(extractCssFromPuckData).mockReturnValue(
        ':root { --colors-primary-500: #3b82f6; } .template { }'
      );

      const css = generateThemeStepCss('template', {
        puckData: templateData,
        themeData,
      });

      expect(extractCssFromPuckData).toHaveBeenCalledWith(templateData, themeData);
      expect(css).toBe(':root { --colors-primary-500: #3b82f6; } .template { }');
    });

    it('should throw error for unknown step', () => {
      expect(() =>
        generateThemeStepCss('unknown', { themeData: {} })
      ).toThrow('Unknown theme builder step: unknown');
    });

    it('should return empty string when no data provided for settings', () => {
      vi.mocked(generateVariablesCss).mockReturnValue(':root {}');

      const css = generateThemeStepCss('settings', { themeData: {} });

      expect(css).toBe(':root {}');
    });

    it('should handle missing Puck data for header', () => {
      vi.mocked(extractCssFromPuckData).mockReturnValue('');

      const css = generateThemeStepCss('header', { puckData: { content: [], root: {} } });

      expect(css).toBe('');
    });
  });

  describe('ThemeStepCssGenerator class', () => {
    let generator: ThemeStepCssGenerator;

    beforeEach(() => {
      generator = new ThemeStepCssGenerator();
    });

    it('should generate CSS with theme context', () => {
      const themeData: ThemeData = {
        colors: { primary: { 500: '#3b82f6' } },
      };

      vi.mocked(generateVariablesCss).mockReturnValue(
        ':root { --colors-primary-500: #3b82f6; }'
      );

      const css = generator.generateCss('settings', themeData, undefined);

      expect(css).toBe(':root { --colors-primary-500: #3b82f6; }');
    });

    it('should generate CSS with both theme and Puck data', () => {
      const themeData: ThemeData = {
        colors: { primary: { 500: '#3b82f6' } },
      };
      const puckData: Data = {
        content: [
          {
            type: 'heading',
            props: { fontSize: 32, fontWeight: 700 },
          },
        ],
      };

      vi.mocked(extractCssFromPuckData).mockReturnValue(
        ':root { --colors-primary-500: #3b82f6; } .heading { font-size: 32px; font-weight: 700; }'
      );

      const css = generator.generateCss('template', themeData, puckData);

      expect(css).toBe(
        ':root { --colors-primary-500: #3b82f6; } .heading { font-size: 32px; font-weight: 700; }'
      );
    });
  });
});
