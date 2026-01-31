/**
 * Font System Constants
 * 
 * Bundled variable fonts and system font stacks
 * All fonts stored in /public/fonts/{category}/
 */

export interface BundledFont {
  name: string;
  file: string;
  weights: [number, number]; // [min, max] for variable fonts
  category: 'sans' | 'serif' | 'mono';
  isVariable: boolean;
  fallback: string;
}

/**
 * Bundled variable fonts (woff2 format)
 * These are self-hosted fonts stored in public/fonts/
 */
export const BUNDLED_FONTS: Record<string, BundledFont[]> = {
  sans: [
    {
      name: 'Inter',
      file: 'Inter-Variable.woff2',
      weights: [100, 900],
      category: 'sans',
      isVariable: true,
      fallback: 'system-ui, -apple-system, sans-serif',
    },
    {
      name: 'Roboto',
      file: 'Roboto-Variable.woff2',
      weights: [100, 900],
      category: 'sans',
      isVariable: true,
      fallback: 'system-ui, sans-serif',
    },
    {
      name: 'Open Sans',
      file: 'OpenSans-Variable.woff2',
      weights: [300, 800],
      category: 'sans',
      isVariable: true,
      fallback: 'system-ui, sans-serif',
    },
    {
      name: 'Nunito',
      file: 'Nunito-Variable.woff2',
      weights: [200, 900],
      category: 'sans',
      isVariable: true,
      fallback: 'system-ui, sans-serif',
    },
    {
      name: 'DM Sans',
      file: 'DMSans-Variable.woff2',
      weights: [100, 900],
      category: 'sans',
      isVariable: true,
      fallback: 'system-ui, sans-serif',
    },
  ],
  serif: [
    {
      name: 'Playfair Display',
      file: 'PlayfairDisplay-Variable.woff2',
      weights: [400, 900],
      category: 'serif',
      isVariable: true,
      fallback: 'Georgia, serif',
    },
    {
      name: 'Merriweather',
      file: 'Merriweather-Variable.woff2',
      weights: [300, 900],
      category: 'serif',
      isVariable: true,
      fallback: 'Georgia, serif',
    },
    {
      name: 'Crimson Pro',
      file: 'CrimsonPro-Variable.woff2',
      weights: [200, 900],
      category: 'serif',
      isVariable: true,
      fallback: 'Georgia, serif',
    },
    {
      name: 'Lora',
      file: 'Lora-Variable.woff2',
      weights: [400, 700],
      category: 'serif',
      isVariable: true,
      fallback: 'Georgia, serif',
    },
  ],
  mono: [
    {
      name: 'JetBrains Mono',
      file: 'JetBrainsMono-Variable.woff2',
      weights: [100, 800],
      category: 'mono',
      isVariable: true,
      fallback: 'Consolas, monospace',
    },
    {
      name: 'Fira Code',
      file: 'FiraCode-Variable.woff2',
      weights: [300, 700],
      category: 'mono',
      isVariable: true,
      fallback: 'Consolas, monospace',
    },
    {
      name: 'Source Code Pro',
      file: 'SourceCodePro-Variable.woff2',
      weights: [200, 900],
      category: 'mono',
      isVariable: true,
      fallback: 'Consolas, monospace',
    },
  ],
};

/**
 * System fonts (no download, zero cost)
 * Uses native font stacks for each OS
 */
export const SYSTEM_FONTS: Record<string, BundledFont> = {
  sans: {
    name: 'System Default',
    file: '',
    weights: [400, 700],
    category: 'sans',
    isVariable: false,
    fallback: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  },
  serif: {
    name: 'System Serif',
    file: '',
    weights: [400, 700],
    category: 'serif',
    isVariable: false,
    fallback: 'Georgia, "Times New Roman", Times, serif',
  },
  mono: {
    name: 'System Mono',
    file: '',
    weights: [400, 700],
    category: 'mono',
    isVariable: false,
    fallback: '"SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  },
};

/**
 * Get all fonts for a category (system first, then bundled)
 */
export function getFontsForCategory(category: 'sans' | 'serif' | 'mono'): BundledFont[] {
  return [SYSTEM_FONTS[category], ...BUNDLED_FONTS[category]];
}

/**
 * Find a font by name across all categories
 */
export function findFont(name: string): BundledFont | undefined {
  // Check bundled fonts first
  for (const category of Object.values(BUNDLED_FONTS)) {
    const found = category.find((f) => f.name === name);
    if (found) return found;
  }
  
  // Check system fonts
  return Object.values(SYSTEM_FONTS).find((f) => f.name === name);
}

/**
 * Get font category from font name
 */
export function getFontCategory(fontName: string): 'sans' | 'serif' | 'mono' | undefined {
  const font = findFont(fontName);
  return font?.category;
}
