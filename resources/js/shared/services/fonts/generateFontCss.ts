/**
 * Font CSS Generator
 *
 * Generates @font-face declarations and CSS variables for font system
 */

import { findFont } from '@/shared/constants/fonts';

export interface FontSelection {
  sans: string;   // Font name
  serif?: string;
  mono?: string;
}

/**
 * Generate @font-face declarations for selected fonts
 * Only generates @font-face for bundled fonts (skips system fonts)
 */
export function generateFontFaceCSS(selection: FontSelection): string {
  const declarations: string[] = [];

  for (const fontName of Object.values(selection)) {
    if (!fontName) continue;

    const font = findFont(fontName);
    if (!font || !font.file) continue; // Skip system fonts

    const [minWeight, maxWeight] = font.weights as [number, number];

    declarations.push(`@font-face {
  font-family: '${font.name}';
  src: url('/fonts/${font.category}/${font.file}') format('woff2');
  font-weight: ${minWeight} ${maxWeight};
  font-style: normal;
  font-display: swap;
}`);
  }

  return declarations.join('\n\n');
}

/**
 * Generate CSS variables for font families
 * Variables use theme fallback stacks
 */
export function generateFontVariablesCSS(selection: FontSelection): string {
  const variables: string[] = [':root {'];

  for (const [category, fontName] of Object.entries(selection)) {
    if (!fontName) continue;

    const font = findFont(fontName);
    if (!font) continue;

    // Build font-family with fallback
    let familyValue: string;
    if (font.file) {
      // Bundled font with fallback stack
      familyValue = `"${font.name}", ${font.fallback}`;
    } else {
      // System font - just use the fallback stack
      familyValue = font.fallback;
    }

    variables.push(`  --font-family-${category}: ${familyValue};`);
  }

  variables.push('}');
  return variables.join('\n');
}

/**
 * Generate complete fonts CSS
 * Includes @font-face declarations and CSS variables
 * Ready to insert into theme CSS
 */
export function generateCompleteFontCSS(selection: FontSelection): string {
  const fontFace = generateFontFaceCSS(selection);
  const variables = generateFontVariablesCSS(selection);

  const parts = [
    '/* ============================================ */',
    '/* Font System - Auto-generated */',
    '/* ============================================ */',
  ];

  if (fontFace) {
    parts.push('');
    parts.push('/* @font-face declarations */');
    parts.push(fontFace);
  }

  parts.push('');
  parts.push('/* CSS Variables */');
  parts.push(variables);

  parts.push('');
  parts.push('/* Base font application */');
  parts.push(`body {
  font-family: var(--font-family-sans);
}

code, pre, kbd, samp {
  font-family: var(--font-family-mono, monospace);
}`);

  return parts.join('\n');
}

/**
 * Generate font CSS from theme data structure
 * Handles both FontConfig objects and legacy string format
 */
export function generateFontCSSFromThemeData(
  themeData: Record<string, unknown>
): string {
  // Extract fontFamily from themeData.typography.fontFamily
  const typography = themeData.typography as Record<string, unknown> | undefined;
  const fontFamily = typography?.fontFamily as Record<string, unknown> | undefined;
  
  if (!fontFamily) {
    return '';
  }

  const selection: FontSelection = {
    sans: '',
    serif: '',
    mono: '',
  };

  for (const [category, value] of Object.entries(fontFamily)) {
    if (category === 'sans' || category === 'serif' || category === 'mono') {
      if (typeof value === 'string') {
        // Legacy format: just a string
        selection[category] = value;
      } else if (typeof value === 'object' && value !== null) {
        // FontConfig object format
        const config = value as Record<string, unknown>;
        const name = config.name as string | undefined;
        if (name) {
          selection[category] = name;
        }
      }
    }
  }

  return generateCompleteFontCSS(selection);
}
