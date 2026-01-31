import { describe, it, expect } from 'vitest';
import { fontFamilyFieldConfig } from '../fontFamilyField';

describe('Font Family Field Configuration', () => {
  describe('getFontsForCategory', () => {
    it('should return fonts for sans category', () => {
      const fonts = fontFamilyFieldConfig.getFontsForCategory('sans');

      expect(fonts).toBeInstanceOf(Array);
      expect(fonts.length).toBeGreaterThan(0);
      expect(fonts[0]).toHaveProperty('name');
    });

    it('should return fonts for serif category', () => {
      const fonts = fontFamilyFieldConfig.getFontsForCategory('serif');

      expect(fonts).toBeInstanceOf(Array);
      expect(fonts.length).toBeGreaterThan(0);
    });

    it('should return fonts for mono category', () => {
      const fonts = fontFamilyFieldConfig.getFontsForCategory('mono');

      expect(fonts).toBeInstanceOf(Array);
      expect(fonts.length).toBeGreaterThan(0);
    });

    it('should include system fonts in results', () => {
      const fonts = fontFamilyFieldConfig.getFontsForCategory('sans');
      const systemFonts = fonts.filter(f => !f.file);

      expect(systemFonts.length).toBeGreaterThan(0);
    });
  });

  describe('createFontFamilyField', () => {
    it('should return field config with select type', () => {
      const field = fontFamilyFieldConfig.createFontFamilyField('sans');

      expect(field).toHaveProperty('type', 'select');
      expect(field).toHaveProperty('options');
    });

    it('should generate options with label and value', () => {
      const field = fontFamilyFieldConfig.createFontFamilyField('sans');

      expect(Array.isArray(field.options)).toBe(true);
      if (field.options) {
        field.options.forEach((option: any) => {
          expect(option).toHaveProperty('label');
          expect(option).toHaveProperty('value');
          expect(typeof option.label).toBe('string');
          expect(typeof option.value).toBe('string');
        });
      }
    });

    it('should include all fonts for the category', () => {
      const fonts = fontFamilyFieldConfig.getFontsForCategory('sans');
      const field = fontFamilyFieldConfig.createFontFamilyField('sans');

      expect(field.options?.length).toBe(fonts.length);
    });

    it('should work for all categories', () => {
      const categories = ['sans', 'serif', 'mono'] as const;

      categories.forEach(category => {
        const field = fontFamilyFieldConfig.createFontFamilyField(category);
        expect(field.type).toBe('select');
        expect(field.options).toBeDefined();
      });
    });
  });

  describe('getDefaultFont', () => {
    it('should return a string font name', () => {
      const defaultFont = fontFamilyFieldConfig.getDefaultFont('sans');

      expect(typeof defaultFont).toBe('string');
      expect(defaultFont.length).toBeGreaterThan(0);
    });

    it('should prefer system fonts as default', () => {
      const defaultFont = fontFamilyFieldConfig.getDefaultFont('sans');
      const fonts = fontFamilyFieldConfig.getFontsForCategory('sans');
      const systemFont = fonts.find(f => !f.file);

      expect(defaultFont).toBe(systemFont?.name || fonts[0].name);
    });

    it('should work for all categories', () => {
      const categories = ['sans', 'serif', 'mono'] as const;

      categories.forEach(category => {
        const defaultFont = fontFamilyFieldConfig.getDefaultFont(category);
        expect(typeof defaultFont).toBe('string');
        expect(defaultFont.length).toBeGreaterThan(0);
      });
    });
  });

  describe('bundledFonts property', () => {
    it('should contain bundled fonts object', () => {
      expect(fontFamilyFieldConfig.bundledFonts).toBeDefined();
      expect(fontFamilyFieldConfig.bundledFonts).toHaveProperty('sans');
      expect(fontFamilyFieldConfig.bundledFonts).toHaveProperty('serif');
      expect(fontFamilyFieldConfig.bundledFonts).toHaveProperty('mono');
    });

    it('should have fonts in each category', () => {
      const { bundledFonts } = fontFamilyFieldConfig;

      expect(bundledFonts.sans.length).toBeGreaterThan(0);
      expect(bundledFonts.serif.length).toBeGreaterThan(0);
      expect(bundledFonts.mono.length).toBeGreaterThan(0);
    });
  });

  describe('systemFonts property', () => {
    it('should contain system fonts object', () => {
      expect(fontFamilyFieldConfig.systemFonts).toBeDefined();
      expect(fontFamilyFieldConfig.systemFonts).toHaveProperty('sans');
      expect(fontFamilyFieldConfig.systemFonts).toHaveProperty('serif');
      expect(fontFamilyFieldConfig.systemFonts).toHaveProperty('mono');
    });

    it('should have system fonts without file property', () => {
      const { systemFonts } = fontFamilyFieldConfig;

      Object.values(systemFonts).forEach(font => {
        expect(font.file).toBe('');
        expect(font.fallback).toBeDefined();
      });
    });
  });
});
