/**
 * Font Family Picker Component
 *
 * Displays available fonts (system + bundled) for selection
 * Renders preview with actual font loaded via @font-face
 * Used in theme builder and other font selection contexts
 */

import { useMemo, useEffect, useState } from 'react';
import { fontFamilyFieldConfig } from '@/shared/fields/fontFamilyField';
import { findFont } from '@/shared/constants/fonts';
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

  // Generate CSS for the selected font to inject into DOM
  const [fontCss, setFontCss] = useState<string>('');

  useEffect(() => {
    if (selectedFont) {
      const font = findFont(selectedFont);
      if (font && font.file) {
        // Generate @font-face CSS for bundled fonts
        const [minWeight, maxWeight] = font.weights as [number, number];
        const css = `@font-face {
  font-family: '${font.name}';
  src: url('/fonts/${font.category}/${font.file}') format('woff2');
  font-weight: ${minWeight} ${maxWeight};
  font-style: normal;
  font-display: swap;
}`;
        setFontCss(css);
      } else {
        // System fonts don't need CSS
        setFontCss('');
      }
    }
  }, [selectedFont, category]);

  const selectedFontObj = selectedFont ? findFont(selectedFont) : null;

  // Get weights to display for preview
  const previewWeights = selectedFontObj?.isVariable
    ? [selectedFontObj.weights[0], (selectedFontObj.weights[0] + selectedFontObj.weights[1]) / 2, selectedFontObj.weights[1]]
    : [400];

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Inject font CSS */}
      {fontCss && <style>{fontCss}</style>}

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
      {selectedFont && selectedFontObj && (
        <div className="mt-3 border-t pt-2">
          {/* Font metadata - compact single line */}
          <div className="text-xs text-gray-600 mb-2">
            <strong>Family:</strong> {selectedFontObj.name}
            {' • '}
            <strong>Source:</strong> {selectedFontObj.file ? 'Bundled' : 'System'}
            {selectedFontObj.isVariable && (
              <>
                {' • '}
                <strong>Weights:</strong> {selectedFontObj.weights[0]}-{selectedFontObj.weights[1]}
              </>
            )}
          </div>

          {/* Weight samples - horizontal layout */}
          <div className="grid grid-cols-3 gap-2">
            {previewWeights.map((weight) => (
              <div key={`weight-${weight}`}>
                <div className="text-xs text-gray-500 mb-1">Weight {weight}</div>
                <div
                  className="p-2 bg-white border border-gray-100 rounded text-sm leading-relaxed"
                  style={{
                    fontFamily: selectedFontObj.file
                      ? `"${selectedFontObj.name}", ${selectedFontObj.fallback}`
                      : selectedFontObj.fallback,
                    fontWeight: weight,
                  }}
                >
                  The quick brown fox
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
