# Phase 7: Font System Architecture

Last updated: January 31, 2026

---

## Executive Summary

**Goal:** Build a font management system using **self-hosted variable fonts** with support for sans, serif, and mono families. Includes live preview in Theme Builder, component-level font selection, and a new RichText component using Puck's native richtext field.

**Dependencies:** Phase 6 (Theme Customization) complete ✅

**Approach:** Self-hosted bundled fonts (no external API dependencies)

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Font source | **Self-hosted (bundled)** | No external dependencies, GDPR compliant, works offline |
| Font format | **Variable fonts (woff2)** | Smaller files, smooth weight transitions, modern browser support |
| System fonts | **Included as option** | Zero-cost performance option |
| API endpoints | **None needed** | Font list is static, stored in code |
| RichText | **New component** | Complements Heading/Text for long-form content |
| Future upload | **Phase 7.5** | Optional enhancement later |

---

## Architecture Overview

### Font Storage

```
public/
└── fonts/
    ├── sans/
    │   ├── Inter-Variable.woff2
    │   ├── Roboto-Variable.woff2
    │   └── ...
    ├── serif/
    │   ├── PlayfairDisplay-Variable.woff2
    │   ├── Merriweather-Variable.woff2
    │   └── ...
    └── mono/
        ├── JetBrainsMono-Variable.woff2
        ├── FiraCode-Variable.woff2
        └── ...
```

### Theme Data Structure

```json
{
  "typography": {
    "fontFamily": {
      "sans": {
        "name": "Inter",
        "source": "bundled",
        "file": "Inter-Variable.woff2",
        "weights": [100, 900],
        "isVariable": true
      },
      "serif": {
        "name": "Playfair Display",
        "source": "bundled",
        "file": "PlayfairDisplay-Variable.woff2",
        "weights": [400, 900],
        "isVariable": true
      },
      "mono": {
        "name": "JetBrains Mono",
        "source": "bundled",
        "file": "JetBrainsMono-Variable.woff2",
        "weights": [100, 800],
        "isVariable": true
      }
    }
  }
}
```

### Generated CSS Output

```css
/* @font-face declarations for variable fonts */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/sans/Inter-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}

@font-face {
  font-family: 'Playfair Display';
  src: url('/fonts/serif/PlayfairDisplay-Variable.woff2') format('woff2');
  font-weight: 400 900;
  font-display: swap;
}

@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/mono/JetBrainsMono-Variable.woff2') format('woff2');
  font-weight: 100 800;
  font-display: swap;
}

/* CSS Variables */
:root {
  --font-family-sans: "Inter", system-ui, -apple-system, sans-serif;
  --font-family-serif: "Playfair Display", Georgia, serif;
  --font-family-mono: "JetBrains Mono", "Fira Code", monospace;
}

/* Base styles */
body {
  font-family: var(--font-family-sans);
}
```

---

## Understanding Key Concepts

### What Are Variable Fonts?

Traditional fonts need separate files for each weight:
- `Inter-Regular.woff2` (400)
- `Inter-Medium.woff2` (500)
- `Inter-SemiBold.woff2` (600)
- `Inter-Bold.woff2` (700)

**Variable fonts** contain ALL weights in ONE file:
- `Inter-Variable.woff2` (100-900)

**Benefits:**
- Smaller total download size
- Can use ANY weight (e.g., 450, 550)
- Smooth weight animations possible
- 95%+ browser support

### What Are System Fonts?

System fonts are fonts pre-installed on the user's operating system:

| OS | Sans | Serif | Mono |
|----|------|-------|------|
| macOS/iOS | San Francisco | New York | SF Mono |
| Windows | Segoe UI | Georgia | Consolas |
| Android | Roboto | Noto Serif | Roboto Mono |
| Linux | Varies | Varies | Varies |

**System font stack** (CSS fallback chain):
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

**Benefits:** Zero download, instant render, native look
**Drawback:** Inconsistent across devices

### Heading vs Text vs RichText

| Component | Purpose | Output | Use Case |
|-----------|---------|--------|----------|
| **Heading** | Single title | `<h1>`-`<h6>` | Page titles, section headers |
| **Text** | Single paragraph | `<p>` | Taglines, captions, short text |
| **RichText** | Multi-paragraph formatted | `<div>` with nested HTML | Blog posts, articles, long-form |

**They coexist** - RichText doesn't replace Heading/Text:
- Heading/Text = **Precision** (designer-controlled)
- RichText = **Flexibility** (content editor-friendly)

---

## Bundled Font List

### Sans-Serif Fonts

| Font | File | Weights | Notes |
|------|------|---------|-------|
| Inter | `Inter-Variable.woff2` | 100-900 | Modern, highly readable |
| Roboto | `Roboto-Variable.woff2` | 100-900 | Google's system font |
| Open Sans | `OpenSans-Variable.woff2` | 300-800 | Friendly, professional |
| Nunito | `Nunito-Variable.woff2` | 200-900 | Rounded, approachable |
| DM Sans | `DMSans-Variable.woff2` | 100-900 | Clean, geometric |

### Serif Fonts

| Font | File | Weights | Notes |
|------|------|---------|-------|
| Playfair Display | `PlayfairDisplay-Variable.woff2` | 400-900 | Elegant headlines |
| Merriweather | `Merriweather-Variable.woff2` | 300-900 | Readable body serif |
| Crimson Pro | `CrimsonPro-Variable.woff2` | 200-900 | Classic book style |
| Lora | `Lora-Variable.woff2` | 400-700 | Contemporary serif |

### Monospace Fonts

| Font | File | Weights | Notes |
|------|------|---------|-------|
| JetBrains Mono | `JetBrainsMono-Variable.woff2` | 100-800 | Developer favorite |
| Fira Code | `FiraCode-Variable.woff2` | 300-700 | Ligatures support |
| Source Code Pro | `SourceCodePro-Variable.woff2` | 200-900 | Adobe's mono font |

### System Fonts (No Download)

| Name | Stack | Weights |
|------|-------|---------|
| System Default | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | 400, 700 |
| System Serif | `Georgia, "Times New Roman", serif` | 400, 700 |
| System Mono | `"SF Mono", Consolas, "Liberation Mono", monospace` | 400, 700 |

---

## Implementation Steps

### Phase 7.1: Foundation (2 hours)

#### Step 1: Download & Organize Font Files

**Tasks:**
1. Download variable font files from Google Fonts
2. Create `/public/fonts/` directory structure
3. Add fonts to `.gitignore` or commit (decision needed)

**Commands:**
```bash
# Create directories
mkdir -p public/fonts/{sans,serif,mono}

# Download fonts (example using google-webfonts-helper or direct download)
# Inter: https://fonts.google.com/specimen/Inter
# Place Inter-Variable.woff2 in public/fonts/sans/
```

**Files to create:**
- `public/fonts/sans/Inter-Variable.woff2`
- `public/fonts/sans/Roboto-Variable.woff2`
- `public/fonts/sans/OpenSans-Variable.woff2`
- `public/fonts/serif/PlayfairDisplay-Variable.woff2`
- `public/fonts/serif/Merriweather-Variable.woff2`
- `public/fonts/mono/JetBrainsMono-Variable.woff2`
- `public/fonts/mono/FiraCode-Variable.woff2`

---

#### Step 2: Create Font Presets Constant

**File:** `resources/js/shared/constants/fonts.ts`

```typescript
export interface BundledFont {
  name: string;
  file: string;
  weights: [number, number]; // [min, max] for variable fonts
  category: 'sans' | 'serif' | 'mono';
  isVariable: boolean;
  fallback: string;
}

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
 * Get all fonts for a category (bundled + system)
 */
export function getFontsForCategory(category: 'sans' | 'serif' | 'mono'): BundledFont[] {
  return [SYSTEM_FONTS[category], ...BUNDLED_FONTS[category]];
}

/**
 * Find a font by name across all categories
 */
export function findFont(name: string): BundledFont | undefined {
  for (const category of Object.values(BUNDLED_FONTS)) {
    const found = category.find((f) => f.name === name);
    if (found) return found;
  }
  return Object.values(SYSTEM_FONTS).find((f) => f.name === name);
}
```

---

#### Step 3: Update TypeScript Types

**File:** `resources/js/shared/services/api/types.ts`

Add/update the font-related types:

```typescript
// Add to existing ThemeData interface
export interface FontConfig {
  name: string;
  source: 'bundled' | 'system' | 'custom';
  file?: string;
  weights: [number, number] | number[];
  isVariable: boolean;
}

export interface ThemeTypography {
  fontFamily: {
    sans: FontConfig | string;  // string for backwards compat
    serif?: FontConfig;
    mono?: FontConfig;
  };
  fontSize?: Record<string, string>;
  fontWeight?: Record<string, string>;
  lineHeight?: Record<string, string>;
  letterSpacing?: Record<string, string>;
}

// Update ThemeData interface
export interface ThemeData {
  // ... existing fields
  typography?: ThemeTypography;
  // ...
}
```

---

### Phase 7.2: CSS Generation (1.5 hours)

#### Step 4: Create Font CSS Generator

**File:** `resources/js/shared/services/fonts/generateFontCss.ts`

```typescript
import { BundledFont, findFont, SYSTEM_FONTS } from '@/shared/constants/fonts';

export interface FontSelection {
  sans: string;   // Font name
  serif?: string;
  mono?: string;
}

/**
 * Generate @font-face declarations for selected fonts
 */
export function generateFontFaceCSS(selection: FontSelection): string {
  const declarations: string[] = [];

  for (const [category, fontName] of Object.entries(selection)) {
    if (!fontName) continue;

    const font = findFont(fontName);
    if (!font || !font.file) continue;

    const [minWeight, maxWeight] = font.weights as [number, number];

    declarations.push(`
@font-face {
  font-family: '${font.name}';
  src: url('/fonts/${font.category}/${font.file}') format('woff2');
  font-weight: ${minWeight} ${maxWeight};
  font-style: normal;
  font-display: swap;
}`);
  }

  return declarations.join('\n');
}

/**
 * Generate CSS variables for font families
 */
export function generateFontVariablesCSS(selection: FontSelection): string {
  const variables: string[] = [':root {'];

  for (const [category, fontName] of Object.entries(selection)) {
    if (!fontName) continue;

    const font = findFont(fontName);
    if (!font) continue;

    const familyValue = font.file
      ? `"${font.name}", ${font.fallback}`
      : font.fallback;

    variables.push(`  --font-family-${category}: ${familyValue};`);
  }

  variables.push('}');
  return variables.join('\n');
}

/**
 * Generate complete fonts CSS (font-face + variables)
 */
export function generateCompleteFontCSS(selection: FontSelection): string {
  const fontFace = generateFontFaceCSS(selection);
  const variables = generateFontVariablesCSS(selection);

  return `/* Font System - Auto-generated */
${fontFace}

${variables}

/* Base font application */
body {
  font-family: var(--font-family-sans);
}

code, pre, kbd, samp {
  font-family: var(--font-family-mono, monospace);
}
`;
}
```

---

#### Step 5: Update Backend CSS Generator

**File:** `app/Services/ThemeCssGeneratorService.php`

Add font CSS generation to the existing service:

```php
/**
 * Generate @font-face declarations for bundled fonts
 */
protected function generateFontFaceCss(array $fontFamily): string
{
    $css = '';
    $fontPaths = [
        'sans' => '/fonts/sans/',
        'serif' => '/fonts/serif/',
        'mono' => '/fonts/mono/',
    ];

    foreach (['sans', 'serif', 'mono'] as $category) {
        if (!isset($fontFamily[$category])) continue;

        $font = $fontFamily[$category];
        
        // Skip system fonts (no file)
        if (!is_array($font) || empty($font['file'])) continue;

        $name = $font['name'] ?? '';
        $file = $font['file'] ?? '';
        $weights = $font['weights'] ?? [400, 700];
        $isVariable = $font['isVariable'] ?? false;

        if ($isVariable && count($weights) === 2) {
            $weightRange = "{$weights[0]} {$weights[1]}";
        } else {
            $weightRange = implode(', ', $weights);
        }

        $css .= "
@font-face {
  font-family: '{$name}';
  src: url('{$fontPaths[$category]}{$file}') format('woff2');
  font-weight: {$weightRange};
  font-style: normal;
  font-display: swap;
}
";
    }

    return $css;
}

/**
 * Generate font family CSS variables
 */
protected function generateFontVariablesCss(array $fontFamily): array
{
    $fallbacks = [
        'sans' => 'system-ui, -apple-system, sans-serif',
        'serif' => 'Georgia, serif',
        'mono' => 'Consolas, monospace',
    ];

    $variables = [];

    foreach (['sans', 'serif', 'mono'] as $category) {
        if (!isset($fontFamily[$category])) continue;

        $font = $fontFamily[$category];
        
        if (is_array($font)) {
            $name = $font['name'] ?? '';
            $fallback = $fallbacks[$category];
            $value = $name ? "\"{$name}\", {$fallback}" : $fallback;
        } else {
            // Legacy string format
            $value = $font;
        }

        $variables["--font-family-{$category}"] = $value;
    }

    return $variables;
}
```

---

### Phase 7.3: Font Picker UI (2 hours)

#### Step 6: Create FontFamilyPicker Component

**File:** `resources/js/shared/components/atoms/FontFamilyPicker.tsx`

```tsx
import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Label } from '@/shared/components/ui/label';
import { getFontsForCategory, BundledFont } from '@/shared/constants/fonts';

interface FontFamilyPickerProps {
  category: 'sans' | 'serif' | 'mono';
  value: string;
  onChange: (fontName: string) => void;
  label?: string;
}

export function FontFamilyPicker({
  category,
  value,
  onChange,
  label,
}: FontFamilyPickerProps) {
  const [fonts, setFonts] = useState<BundledFont[]>([]);
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());

  useEffect(() => {
    setFonts(getFontsForCategory(category));
  }, [category]);

  // Dynamically load font for preview
  const loadFontForPreview = (font: BundledFont) => {
    if (loadedFonts.has(font.name) || !font.file) return;

    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: '${font.name}';
        src: url('/fonts/${font.category}/${font.file}') format('woff2');
        font-weight: ${font.weights[0]} ${font.weights[1]};
        font-display: swap;
      }
    `;
    document.head.appendChild(style);
    setLoadedFonts((prev) => new Set(prev).add(font.name));
  };

  const categoryLabels = {
    sans: 'Sans-Serif',
    serif: 'Serif',
    mono: 'Monospace',
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label || categoryLabels[category]}</Label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={`Select ${categoryLabels[category]} font`} />
        </SelectTrigger>
        <SelectContent>
          {fonts.map((font) => {
            loadFontForPreview(font);
            const fontFamily = font.file
              ? `"${font.name}", ${font.fallback}`
              : font.fallback;

            return (
              <SelectItem key={font.name} value={font.name}>
                <div className="flex items-center gap-3">
                  <span
                    className="text-base"
                    style={{ fontFamily }}
                  >
                    {font.name}
                  </span>
                  {!font.file && (
                    <span className="text-xs text-muted-foreground">(System)</span>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
```

---

#### Step 7: Create FontPreview Component

**File:** `resources/js/shared/components/atoms/FontPreview.tsx`

```tsx
import { useEffect, useState } from 'react';
import { findFont } from '@/shared/constants/fonts';

interface FontPreviewProps {
  fontName: string;
  category: 'sans' | 'serif' | 'mono';
  previewText?: string;
}

export function FontPreview({
  fontName,
  category,
  previewText = 'The quick brown fox jumps over the lazy dog',
}: FontPreviewProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const font = findFont(fontName);

  useEffect(() => {
    if (!font?.file) {
      setIsLoaded(true);
      return;
    }

    // Load font dynamically
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: '${font.name}';
        src: url('/fonts/${font.category}/${font.file}') format('woff2');
        font-weight: ${font.weights[0]} ${font.weights[1]};
        font-display: swap;
      }
    `;
    document.head.appendChild(style);

    // Wait for font to load
    document.fonts.ready.then(() => setIsLoaded(true));
  }, [font]);

  if (!font) return null;

  const fontFamily = font.file
    ? `"${font.name}", ${font.fallback}`
    : font.fallback;

  const sizes = [
    { label: 'Small', size: '14px', weight: 400 },
    { label: 'Body', size: '16px', weight: 400 },
    { label: 'Large', size: '20px', weight: 500 },
    { label: 'Heading', size: '28px', weight: 600 },
  ];

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{font.name}</h4>
        <span className="text-xs text-muted-foreground">
          {font.isVariable ? `${font.weights[0]}-${font.weights[1]}` : font.weights.join(', ')}
        </span>
      </div>

      <div className="space-y-3" style={{ opacity: isLoaded ? 1 : 0.5 }}>
        {sizes.map(({ label, size, weight }) => (
          <div key={label} className="flex items-baseline gap-4">
            <span className="text-xs text-muted-foreground w-16">{label}</span>
            <p
              style={{
                fontFamily,
                fontSize: size,
                fontWeight: weight,
                lineHeight: 1.4,
              }}
            >
              {previewText}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

#### Step 8: Update ThemeBuilderPage Settings Tab

Update the Settings tab in `ThemeBuilderPage.tsx` to use the new font pickers:

**Location:** Typography section in Settings tab

```tsx
{/* Typography Section - Replace existing font input */}
<div className="space-y-6">
  <h2 className="text-lg font-semibold">Typography</h2>

  {/* Font Family Pickers */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <FontFamilyPicker
      category="sans"
      label="Sans-Serif Font"
      value={themeData.typography?.fontFamily?.sans?.name || 'Inter'}
      onChange={(fontName) => updateFont('sans', fontName)}
    />
    <FontFamilyPicker
      category="serif"
      label="Serif Font"
      value={themeData.typography?.fontFamily?.serif?.name || 'Playfair Display'}
      onChange={(fontName) => updateFont('serif', fontName)}
    />
    <FontFamilyPicker
      category="mono"
      label="Monospace Font"
      value={themeData.typography?.fontFamily?.mono?.name || 'JetBrains Mono'}
      onChange={(fontName) => updateFont('mono', fontName)}
    />
  </div>

  {/* Font Previews */}
  <div className="grid grid-cols-1 gap-4">
    <FontPreview
      fontName={themeData.typography?.fontFamily?.sans?.name || 'Inter'}
      category="sans"
    />
    <FontPreview
      fontName={themeData.typography?.fontFamily?.serif?.name || 'Playfair Display'}
      category="serif"
    />
    <FontPreview
      fontName={themeData.typography?.fontFamily?.mono?.name || 'JetBrains Mono'}
      category="mono"
    />
  </div>

  {/* Existing font size, line-height, etc. controls */}
  {/* ... */}
</div>
```

Helper function for updating fonts:

```tsx
const updateFont = (category: 'sans' | 'serif' | 'mono', fontName: string) => {
  const font = findFont(fontName);
  if (!font) return;

  setThemeData((prev) => ({
    ...prev,
    typography: {
      ...prev.typography,
      fontFamily: {
        ...prev.typography?.fontFamily,
        [category]: {
          name: font.name,
          source: font.file ? 'bundled' : 'system',
          file: font.file || undefined,
          weights: font.weights,
          isVariable: font.isVariable,
        },
      },
    },
  }));
};
```

---

### Phase 7.4: Component Font Selection (1.5 hours)

#### Step 9: Add Font Family Field to Components

**File:** `resources/js/shared/puck/fields/fontFamilyField.ts`

```typescript
import { Fields } from '@puckeditor/core';

export const fontFamilyField: Fields = {
  fontFamily: {
    type: 'select',
    label: 'Font Family',
    options: [
      { label: 'Sans (theme default)', value: 'sans' },
      { label: 'Serif', value: 'serif' },
      { label: 'Monospace', value: 'mono' },
      { label: 'Inherit', value: 'inherit' },
    ],
  },
};

/**
 * Resolve font family value to CSS
 */
export function resolveFontFamily(value: string | undefined): string {
  switch (value) {
    case 'sans':
      return 'var(--font-family-sans)';
    case 'serif':
      return 'var(--font-family-serif)';
    case 'mono':
      return 'var(--font-family-mono)';
    case 'inherit':
    default:
      return 'inherit';
  }
}
```

---

#### Step 10: Update Heading Component

Add font family selection to the Heading component:

```tsx
// In Heading.tsx fields configuration
fields: {
  // ... existing fields
  fontFamily: {
    type: 'select',
    label: 'Font Family',
    options: [
      { label: 'Sans (default)', value: 'sans' },
      { label: 'Serif', value: 'serif' },
      { label: 'Monospace', value: 'mono' },
    ],
  },
}

// In render function
const fontFamilyCSS = resolveFontFamily(fontFamily);

// In CSS generation
fontFamily: fontFamilyCSS,
```

---

#### Step 11: Update Text Component

Add font family selection to the Text component (same pattern as Heading).

---

### Phase 7.5: RichText Component (1.5 hours)

#### Step 12: Create RichText Puck Component

**File:** `resources/js/shared/puck/components/content/RichText.tsx`

```tsx
import { ComponentConfig } from '@puckeditor/core';
import { resolveFontFamily } from '../../fields/fontFamilyField';

export interface RichTextProps {
  id?: string;
  content: React.ReactNode;
  fontFamily?: 'sans' | 'serif' | 'mono' | 'inherit';
  textColor?: string;
  className?: string;
}

function RichTextComponent({
  id,
  content,
  fontFamily = 'sans',
  textColor,
  puck,
}: RichTextProps & { puck?: { dragRef: unknown } }) {
  const fontFamilyCSS = resolveFontFamily(fontFamily);

  return (
    <div
      ref={puck?.dragRef as React.Ref<HTMLDivElement>}
      className={`richtext-${id} prose prose-lg max-w-none`}
      style={{
        fontFamily: fontFamilyCSS,
        color: textColor || 'inherit',
      }}
    >
      {content}
    </div>
  );
}

export const RichText: ComponentConfig<RichTextProps> = {
  label: 'Rich Text',
  
  fields: {
    content: {
      type: 'richtext',
      contentEditable: true, // Enable inline editing
      options: {
        heading: { levels: [2, 3, 4] },
        // Available by default: bold, italic, underline, strike, link, bulletList, orderedList
      },
    },
    fontFamily: {
      type: 'select',
      label: 'Font Family',
      options: [
        { label: 'Sans (default)', value: 'sans' },
        { label: 'Serif', value: 'serif' },
        { label: 'Monospace', value: 'mono' },
        { label: 'Inherit', value: 'inherit' },
      ],
    },
    textColor: {
      type: 'text',
      label: 'Text Color',
    },
  },

  defaultProps: {
    content: '<p>Start writing your content here...</p>',
    fontFamily: 'sans',
  },

  render: RichTextComponent,
};
```

---

#### Step 13: Register RichText in Puck Config

**File:** `resources/js/shared/puck/config/index.ts`

```typescript
import { RichText } from '../components/content/RichText';

// Add to components
export const puckConfig = {
  components: {
    // ... existing components
    RichText,
  },
  categories: {
    content: {
      components: ['Heading', 'Text', 'RichText', /* ... */],
    },
  },
};
```

---

### Phase 7.6: Testing (1 hour)

#### Step 14: Write Tests

**Frontend Tests:**

```typescript
// resources/js/shared/constants/__tests__/fonts.test.ts
describe('Font Constants', () => {
  it('should have fonts for all categories', () => {
    expect(BUNDLED_FONTS.sans.length).toBeGreaterThan(0);
    expect(BUNDLED_FONTS.serif.length).toBeGreaterThan(0);
    expect(BUNDLED_FONTS.mono.length).toBeGreaterThan(0);
  });

  it('should find font by name', () => {
    const inter = findFont('Inter');
    expect(inter).toBeDefined();
    expect(inter?.category).toBe('sans');
  });
});

// resources/js/shared/services/fonts/__tests__/generateFontCss.test.ts
describe('generateFontCss', () => {
  it('should generate @font-face for bundled fonts', () => {
    const css = generateFontFaceCSS({ sans: 'Inter' });
    expect(css).toContain("font-family: 'Inter'");
    expect(css).toContain('font-weight: 100 900');
  });

  it('should skip system fonts', () => {
    const css = generateFontFaceCSS({ sans: 'System Default' });
    expect(css).not.toContain('@font-face');
  });
});
```

**Backend Tests:**

```php
// tests/Unit/Services/ThemeCssGeneratorServiceFontsTest.php
public function test_generates_font_face_css_for_variable_fonts(): void
{
    $fontFamily = [
        'sans' => [
            'name' => 'Inter',
            'file' => 'Inter-Variable.woff2',
            'weights' => [100, 900],
            'isVariable' => true,
        ],
    ];

    $css = $this->service->generateFontFaceCss($fontFamily);

    $this->assertStringContainsString("font-family: 'Inter'", $css);
    $this->assertStringContainsString('font-weight: 100 900', $css);
}
```

---

### Phase 7.7: Blade Integration (30 min)

#### Step 15: Update Blade Templates

**File:** `resources/views/public-central.blade.php`

```blade
<head>
    <!-- Preload critical font -->
    <link rel="preload" href="/fonts/sans/Inter-Variable.woff2" as="font" type="font/woff2" crossorigin>

    <!-- Theme CSS (includes @font-face and variables) -->
    @if($activeTheme)
        <link href="{{ asset('storage/themes/' . $activeTheme->id . '.css') }}" rel="stylesheet">
    @endif
</head>
```

---

## Summary: Implementation Checklist

### Phase 7.1: Foundation (2 hours)
- [ ] Download variable font files to `/public/fonts/`
- [ ] Create `fonts.ts` constants with bundled font list
- [ ] Update TypeScript types for font configuration

### Phase 7.2: CSS Generation (1.5 hours)
- [ ] Create `generateFontCss.ts` utility
- [ ] Update `ThemeCssGeneratorService.php` for font CSS
- [ ] Test font CSS output

### Phase 7.3: Font Picker UI (2 hours)
- [ ] Create `FontFamilyPicker.tsx` component
- [ ] Create `FontPreview.tsx` component
- [ ] Update ThemeBuilderPage Settings tab
- [ ] Test font selection and preview

### Phase 7.4: Component Integration (1.5 hours)
- [ ] Create `fontFamilyField.ts` shared field
- [ ] Update Heading component with font selection
- [ ] Update Text component with font selection
- [ ] Test component font rendering

### Phase 7.5: RichText Component (1.5 hours)
- [ ] Create `RichText.tsx` Puck component
- [ ] Register in Puck config
- [ ] Test inline editing functionality
- [ ] Verify font inheritance

### Phase 7.6: Testing (1 hour)
- [ ] Frontend unit tests for fonts
- [ ] Backend unit tests for CSS generation
- [ ] Integration tests for font loading

### Phase 7.7: Blade Integration (30 min)
- [ ] Update Blade templates with font preload
- [ ] Verify no FOUT in production

---

## Estimated Total: ~10 hours

---

## Future: Phase 7.5 - Custom Font Upload (Optional)

If custom font upload is needed later:

1. **Extend Media Library** - Add font mimetypes (`font/woff2`, `font/woff`, `font/ttf`)
2. **Create `fonts` table** - Store uploaded font metadata
3. **Font Upload UI** - Drag-and-drop in Theme Builder
4. **License Warning** - Remind users about font licensing
5. **Font Preview** - Preview before confirming upload

---

## Success Criteria

**Phase 7 Complete When:**
- ✅ Can select sans/serif/mono fonts in Settings tab
- ✅ Font preview shows selected fonts in real-time
- ✅ Fonts load from local `/fonts/` directory
- ✅ Variable fonts work with weight range
- ✅ System fonts option available
- ✅ CSS variables generated correctly
- ✅ Components can select font family
- ✅ RichText component works with inline editing
- ✅ No FOUT on page load (font-display: swap)
- ✅ All tests passing
