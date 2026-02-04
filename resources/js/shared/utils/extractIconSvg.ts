import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Extract SVG markup from a Lucide icon component.
 *
 * This utility renders a Lucide React component to static SVG markup,
 * which can then be stored in the database and rendered inline on the
 * storefront without requiring the icon library bundle.
 *
 * @param iconName - The name of the Lucide icon (e.g., 'Star', 'Heart')
 * @param size - The width/height of the icon in pixels (default: 24)
 * @param strokeWidth - The stroke width for the icon (default: 2)
 * @returns SVG markup as a string
 * @throws Error if the icon name is not found in the Lucide library
 *
 * @example
 * ```typescript
 * const svg = extractIconSvg('Star', 32, 2);
 * // Returns: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"...'
 * ```
 */
export function extractIconSvg(
  iconName: string,
  size: number = 24,
  strokeWidth: number = 2
): string {
  // Get the icon component from Lucide
  const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[iconName];

  // Lucide icons are React components (forwardRef objects), not plain functions
  if (!IconComponent) {
    throw new Error(`Icon "${iconName}" not found in Lucide`);
  }

  // Render the icon to static SVG markup
  const svgMarkup = renderToStaticMarkup(
    createElement(IconComponent, { size, strokeWidth })
  );

  return svgMarkup;
}

/**
 * Get all available icon names from the Lucide library.
 *
 * This function filters out non-icon exports (like 'createLucideIcon', 'default', etc.)
 * and returns a sorted list of valid icon names that can be used with extractIconSvg().
 *
 * @returns Array of icon names, sorted alphabetically
 *
 * @example
 * ```typescript
 * const iconNames = getAllIconNames();
 * // Returns: ['Activity', 'Airplay', 'AlertCircle', ..., 'Zap', 'ZoomIn', 'ZoomOut']
 * ```
 */
export function getAllIconNames(): string[] {
  // List of known non-icon exports from lucide-react
  // Icons come in pairs: IconName and IconNameIcon
  const excludedExports = new Set([
    'createLucideIcon',
    'default',
    'Icon',
  ]);

  // Get all exports from Lucide
  const allExports = Object.keys(LucideIcons);

  // Filter to only include icon components (exclude 'Icon' suffix duplicates)
  const iconNames = allExports.filter(key => {
    if (excludedExports.has(key)) return false;
    if (key.endsWith('Icon')) return false; // Skip duplicate 'IconName' → 'IconNameIcon' exports

    const value = (LucideIcons as Record<string, unknown>)[key];

    // Icons are React components (objects with $$typeof symbol)
    return value !== null && typeof value === 'object';
  });

  // Return sorted list
  return iconNames.sort();
}

/**
 * Check if a given string is a valid Lucide icon name.
 *
 * @param iconName - The name to check
 * @returns true if the icon exists in the Lucide library
 *
 * @example
 * ```typescript
 * isValidIconName('Star') // true
 * isValidIconName('InvalidName') // false
 * ```
 */
export function isValidIconName(iconName: string): boolean {
  const IconComponent = (LucideIcons as Record<string, unknown>)[iconName];
  return IconComponent !== undefined && IconComponent !== null;
}
