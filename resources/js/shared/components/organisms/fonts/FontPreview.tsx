/**
 * Font Preview Component
 *
 * Displays preview of selected fonts with various weights and styles
 * Shows how fonts will appear in the theme
 */

import { useMemo } from 'react';
import { findFont } from '@/shared/constants/fonts';

export interface FontPreviewProps {
  fontName: string;
  category?: 'sans' | 'serif' | 'mono';
  className?: string;
}

export function FontPreview({ fontName, className = '' }: FontPreviewProps) {
  const font = useMemo(() => {
    return findFont(fontName);
  }, [fontName]);

  if (!font) {
    return (
      <div className={`text-sm text-red-600 ${className}`}>
        Font not found: {fontName}
      </div>
    );
  }

  const weights = font.isVariable && font.weights
    ? [font.weights[0], (font.weights[0] + font.weights[1]) / 2, font.weights[1]]
    : [400];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Font information */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h3 className="font-semibold text-sm mb-2">{font.name}</h3>
        <div className="space-y-1 text-xs text-gray-600">
          <p>Category: <span className="font-mono">{font.category}</span></p>
          <p>Source: <span className="font-mono">{font.file ? 'Bundled' : 'System'}</span></p>
          {font.isVariable && (
            <p>
              Variable Range: <span className="font-mono">{font.weights[0]}-{font.weights[1]}</span>
            </p>
          )}
          <p>Fallback: <span className="font-mono text-xs break-words">{font.fallback}</span></p>
        </div>
      </div>

      {/* Preview text at different weights */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-white p-4 space-y-3">
          {weights.map((weight) => (
            <div key={`weight-${weight}`}>
              <div className="text-xs text-gray-500 mb-1">
                Weight: {weight}
              </div>
              <div
                className="text-lg leading-relaxed"
                style={{
                  fontFamily: font.fallback,
                  fontWeight: weight,
                }}
              >
                The quick brown fox jumps over the lazy dog
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Text sizes preview */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-white p-4 space-y-2">
          {[12, 14, 16, 18, 20, 24].map((size) => (
            <div
              key={`size-${size}`}
              style={{
                fontFamily: font.fallback,
                fontSize: `${size}px`,
              }}
              className="text-gray-700"
            >
              {size}px - Sample text
            </div>
          ))}
        </div>
      </div>

      {/* Character set preview */}
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <div className="text-xs text-gray-500 mb-2">Full Character Set</div>
        <div
          style={{ fontFamily: font.fallback }}
          className="text-sm leading-relaxed break-words"
        >
          ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />
          abcdefghijklmnopqrstuvwxyz<br />
          0123456789<br />
          !@#$%^&*()_+-=[]&#123;&#125;;:&apos;&quot;,.&lt;&gt;/?
        </div>
      </div>
    </div>
  );
}
