/**
 * Font Family Field Configuration
 *
 * Shared Puck field definition for font family selection
 * Used in theme builder and other components that need font selection
 */

import { BUNDLED_FONTS, SYSTEM_FONTS, getFontsForCategory } from '@/shared/constants/fonts';

export type FontCategory = 'sans' | 'serif' | 'mono';

/**
 * FontFamilyField Configuration
 *
 * Provides a standardized font selection field for Puck editor
 * with support for bundled and system fonts
 */
export const fontFamilyFieldConfig = {
  /**
   * Get available fonts for a category
   */
  getFontsForCategory: (category: FontCategory) => {
    return getFontsForCategory(category);
  },

  /**
   * Create Puck field config for font selection
   *
   * @example
   * const field = createFontFamilyField('sans');
   *
   * Used in Puck config like:
   * fontFamily: {
   *   type: 'select',
   *   options: createFontFamilyField('sans').options,
   * }
   */
  createFontFamilyField: (category: FontCategory) => ({
    type: 'select',
    options: getFontsForCategory(category).map(font => ({
      label: font.name,
      value: font.name,
    })),
  }),

  /**
   * Get default font for a category
   */
  getDefaultFont: (category: FontCategory): string => {
    const fonts = getFontsForCategory(category);
    // Return system font as default (zero-download option)
    const defaultFont = fonts.find(f => !f.file);
    return defaultFont?.name || fonts[0]?.name || 'System Default';
  },

  /**
   * All bundled fonts
   */
  bundledFonts: BUNDLED_FONTS,

  /**
   * All system fonts
   */
  systemFonts: SYSTEM_FONTS,
};

export type FontFamilyFieldConfig = typeof fontFamilyFieldConfig;
