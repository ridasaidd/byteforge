/**
 * Font Family Picker Component
 *
 * Displays available fonts (system + bundled) for selection
 * Used in theme builder and other font selection contexts
 */

import { useMemo } from 'react';
import { fontFamilyFieldConfig } from '@/shared/fields/fontFamilyField';
import type { FontCategory } from '@/shared/fields/fontFamilyField';

export interface FontFamilyPickerProps {
  category: FontCategory;
  selectedFont: string | undefined;
  onSelect: (fontName: string) => void;
  className?: string;
}

export function FontFamilyPicker({
  category,
  selectedFont,
  onSelect,
  className = '',
}: FontFamilyPickerProps) {
  // Get fonts for category (system first, then bundled)
  const fonts = useMemo(() => {
    return fontFamilyFieldConfig.getFontsForCategory(category);
  }, [category]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative">
        <select
          value={selectedFont || ''}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">Select a font...</option>
          {fonts.map((font) => (
            <option key={`${category}-${font.name}`} value={font.name}>
              {font.name}
              {!font.file ? ' (System)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Font preview grid */}
      {selectedFont && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {fonts
            .filter((f) => f.name === selectedFont)
            .map((font) => (
              <div
                key={`preview-${category}-${font.name}`}
                className="p-3 border border-gray-200 rounded-md bg-gray-50"
              >
                <div
                  className="text-sm font-medium line-clamp-1"
                  style={{ fontFamily: font.fallback }}
                >
                  {font.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {font.file ? 'Bundled' : 'System'}
                </div>
                {font.isVariable && (
                  <div className="text-xs text-blue-600 mt-1">
                    Variable: {font.weights[0]}-{font.weights[1]}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
