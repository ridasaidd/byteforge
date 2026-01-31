import { describe, it, expect } from 'vitest';
import {
  BUNDLED_FONTS,
  SYSTEM_FONTS,
  getFontsForCategory,
  findFont,
  getFontCategory,
} from '../fonts';

describe('Font Constants', () => {
  describe('BUNDLED_FONTS', () => {
    it('should have fonts for all categories', () => {
      expect(BUNDLED_FONTS.sans.length).toBeGreaterThan(0);
      expect(BUNDLED_FONTS.serif.length).toBeGreaterThan(0);
      expect(BUNDLED_FONTS.mono.length).toBeGreaterThan(0);
    });

    it('should have Inter as first sans font', () => {
      expect(BUNDLED_FONTS.sans[0].name).toBe('Inter');
    });

    it('should all be variable fonts', () => {
      const allBundled = [
        ...BUNDLED_FONTS.sans,
        ...BUNDLED_FONTS.serif,
        ...BUNDLED_FONTS.mono,
      ];

      allBundled.forEach((font) => {
        expect(font.isVariable).toBe(true);
        expect(font.file).toBeTruthy();
        expect(font.weights.length).toBe(2);
        expect(font.weights[0]).toBeLessThan(font.weights[1]);
      });
    });

    it('should have fallback fonts for all', () => {
      const allBundled = [
        ...BUNDLED_FONTS.sans,
        ...BUNDLED_FONTS.serif,
        ...BUNDLED_FONTS.mono,
      ];

      allBundled.forEach((font) => {
        expect(font.fallback).toBeTruthy();
      });
    });
  });

  describe('SYSTEM_FONTS', () => {
    it('should have one system font per category', () => {
      expect(Object.keys(SYSTEM_FONTS)).toEqual(['sans', 'serif', 'mono']);
    });

    it('should not have files (no download)', () => {
      Object.values(SYSTEM_FONTS).forEach((font) => {
        expect(font.file).toBe('');
      });
    });

    it('should not be variable', () => {
      Object.values(SYSTEM_FONTS).forEach((font) => {
        expect(font.isVariable).toBe(false);
      });
    });

    it('should have fallback stacks', () => {
      Object.values(SYSTEM_FONTS).forEach((font) => {
        expect(font.fallback).toBeTruthy();
        expect(font.fallback.includes(',')).toBe(true); // Multiple fonts
      });
    });
  });

  describe('getFontsForCategory', () => {
    it('should return system font first, then bundled', () => {
      const sansFonts = getFontsForCategory('sans');
      
      expect(sansFonts[0].name).toBe('System Default');
      expect(sansFonts.length).toBe(BUNDLED_FONTS.sans.length + 1);
    });

    it('should return all categories correctly', () => {
      const sans = getFontsForCategory('sans');
      const serif = getFontsForCategory('serif');
      const mono = getFontsForCategory('mono');

      expect(sans[0].category).toBe('sans');
      expect(serif[0].category).toBe('serif');
      expect(mono[0].category).toBe('mono');
    });

    it('should not have duplicates', () => {
      const sansFonts = getFontsForCategory('sans');
      const names = sansFonts.map((f) => f.name);
      const uniqueNames = new Set(names);

      expect(names.length).toBe(uniqueNames.size);
    });
  });

  describe('findFont', () => {
    it('should find bundled fonts by name', () => {
      const inter = findFont('Inter');
      
      expect(inter).toBeDefined();
      expect(inter?.category).toBe('sans');
      expect(inter?.file).toBe('Inter-Variable.woff2');
    });

    it('should find serif fonts', () => {
      const playfair = findFont('Playfair Display');
      
      expect(playfair).toBeDefined();
      expect(playfair?.category).toBe('serif');
    });

    it('should find mono fonts', () => {
      const jetbrains = findFont('JetBrains Mono');
      
      expect(jetbrains).toBeDefined();
      expect(jetbrains?.category).toBe('mono');
    });

    it('should find system fonts', () => {
      const system = findFont('System Default');
      
      expect(system).toBeDefined();
      expect(system?.category).toBe('sans');
      expect(system?.file).toBe('');
    });

    it('should return undefined for non-existent font', () => {
      const notFound = findFont('Non Existent Font');
      
      expect(notFound).toBeUndefined();
    });

    it('should find all bundled fonts', () => {
      const allBundled = [
        ...BUNDLED_FONTS.sans,
        ...BUNDLED_FONTS.serif,
        ...BUNDLED_FONTS.mono,
      ];

      allBundled.forEach((font) => {
        const found = findFont(font.name);
        expect(found).toBeDefined();
        expect(found?.name).toBe(font.name);
      });
    });
  });

  describe('getFontCategory', () => {
    it('should return correct category for sans font', () => {
      expect(getFontCategory('Inter')).toBe('sans');
    });

    it('should return correct category for serif font', () => {
      expect(getFontCategory('Playfair Display')).toBe('serif');
    });

    it('should return correct category for mono font', () => {
      expect(getFontCategory('JetBrains Mono')).toBe('mono');
    });

    it('should return undefined for non-existent font', () => {
      expect(getFontCategory('Non Existent')).toBeUndefined();
    });
  });
});
