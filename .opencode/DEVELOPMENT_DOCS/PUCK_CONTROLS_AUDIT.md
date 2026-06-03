# Puck Controls Audit Report

**Last Updated:** June 1, 2025  
**Status:** Complete  
**Audited Controls:** 47 / 47  
**Issues Found:** 13 (1 critical, 3 high, 5 medium, 4 low)

---

## Audit Methodology

This audit identified issues by analyzing:
1. **CSS Specification Requirements** - W3C standards for each CSS property
2. **Control Dependencies** - When one control's behavior affects another
3. **Control Implementations** - Code review of actual control files
4. **Default Values** - Sensible defaults and edge cases
5. **Validation & Guidance** - Missing warnings or user guidance

**Verification Status:**
- ✅ = Code examined and verified against actual source
- ❌ = FALSE POSITIVE (verified code is correct)

---

## Summary

| Severity | Count | Fixed |
|----------|-------|-------|
| 🔴 CRITICAL | 1 | 0 |
| 🟠 HIGH | 3 | 0 |
| 🟡 MEDIUM | 5 | 0 |
| 🔵 LOW | 4 | 0 |
| ✅ ALREADY FIXED | 3 | 3 |
| ❌ FALSE POSITIVE | 3 | N/A |

---

## ✅ RESOLVED ISSUES

### R1. **Position Offsets Not Conditionally Shown** ✅ FIXED
- **Components:** All components using `layoutAdvancedFields`
- **Issue:** `positionOffset` field was always visible regardless of position type
- **Fix Applied:** Added `hasNonStaticPositionInAnyBreakpoint()` to `conditionalFields.ts` and `resolveFields` to Box, Card, Text, Heading, RichText, and NavigationMenuBlock. Offset fields now only appear when position is non-static.
- **Files Modified:** `conditionalFields.ts`, `index.ts`, `Box.tsx`, `Card.tsx`, `Text.tsx`, `Heading.tsx`, `RichText.tsx`, `NavigationMenuBlock.tsx`

### R2. **TransformControl - Default Values Generate CSS Bloat** ✅ ALREADY FIXED
- **Component:** `ResponsiveTransformControl.tsx`
- **Issue:** Default transform values could generate unnecessary CSS
- **Status:** Already optimized with `isIdentityTransform` check (lines 36-45)

### R3. **DisplayControl - No Dependency Validation** ✅ MITIGATED
- **Component:** `DisplayControl.tsx`
- **Issue:** Users could set incompatible flex/grid properties on non-flex/grid display
- **Status:** Mitigated at component level via `createConditionalResolver()` in Box.tsx (and other components). Flex fields hidden when display is not flex; grid fields hidden when display is not grid.

---

## ❌ FALSE POSITIVES (Removed)

### ~~SpacingControl - Negative Margins Not Prevented~~
- **Verdict:** FALSE POSITIVE. The `allowNegative` prop is intentionally parameterized — parent passes `allowNegative=false` for padding and `allowNegative=true` (default) for margin.

### ~~ShadowControl - Presets vs Custom Not Clear~~
- **Verdict:** FALSE POSITIVE. UX is clear — clicking "Custom" reveals textarea, standard preset → custom pattern.

### ~~ColorPickerControlColorful - Theme Token Not Resolved~~
- **Verdict:** FALSE POSITIVE. `handleThemeColorSelect(value)` receives the resolved hex value (e.g., `#3B82F6`), not a token path. Color swatches pass resolved strings.

---

## 🔴 CRITICAL ISSUES

### 1. **ResponsiveVisibilityControl - Misleading CSS Property** ✅ VERIFIED
- **Component:** `ResponsiveVisibilityControl.tsx` (lines 136-155)
- **Severity:** 🔴 CRITICAL
- **Issue:** Control is named "Visibility" but generates `display: none` instead of CSS `visibility: hidden`
- **CSS Spec:** `display: none` removes element from layout entirely; `visibility: hidden` keeps layout space
- **Current Behavior:**
  - When "hidden": generates `display: none` (line 136)
  - When reverting: generates `display: revert` (line 142)
- **Impact:** Users wanting CSS `visibility: hidden` (invisible but preserving layout) cannot achieve it. Naming may confuse CSS-savvy users.
- **Note:** Using `display: none` for responsive show/hide is a common page builder pattern, so the behavior itself is useful — the naming is the issue.
- **Fix Options:**
  - [ ] Rename to "Show/Hide" or "Responsive Display" to match actual behavior
  - [ ] Or implement actual CSS `visibility` property and add a separate show/hide control
- **Estimated Effort:** Low (rename) or Medium (implement properly)
- **Files to Modify:** `ResponsiveVisibilityControl.tsx`, `fieldGroups.tsx`

---

## 🟠 HIGH PRIORITY ISSUES

### 2. **WidthControl - 'fr' Unit Only Valid in Grid** ✅ VERIFIED
- **Component:** `WidthControl.tsx` (line 95)
- **Severity:** 🟠 HIGH
- **Issue:** `fr` unit is available for element width, but `fr` only works inside `grid-template-columns`/`grid-template-rows`
- **CSS Spec:** `width: 10fr` is syntactically valid but ignored by browsers
- **Fix Needed:**
  - [ ] Remove 'fr' from WidthControl unit options (keep in grid-specific controls only)
  - [ ] Or add tooltip: "'fr' only works inside CSS Grid"
- **Estimated Effort:** Low
- **Files to Modify:** `WidthControl.tsx`

---

### 3. **FontWeightControl - No Range Validation** ✅ VERIFIED
- **Component:** `FontWeightControl.tsx` (lines 23, 45-48)
- **Severity:** 🟠 HIGH
- **Issue:** Accepts any numeric value without checking CSS spec 100-900 range
- **CSS Spec:** `font-weight` accepts 100–900 (100-increment) or named keywords (normal, bold)
- **Current Behavior:** `toSafeFontWeight()` falls back to `'400'` but doesn't validate range; accepts `5` or `9999`
- **Fix Needed:**
  - [ ] Clamp custom weight to 100-900 range
  - [ ] Round to nearest 100
- **Estimated Effort:** Low
- **Files to Modify:** `FontWeightControl.tsx`

---

### 4. **TransformControl - No Input Validation** ✅ VERIFIED
- **Component:** `TransformControl.tsx` (lines 76-107)
- **Severity:** 🟠 HIGH
- **Issue:** No validation on scale (negative flips element), rotate (no bounds), translate (no bounds)
- **CSS Spec:** `scale(-2)` mirrors element at 2x — almost always unintended
- **Fix Needed:**
  - [ ] Clamp scale to positive values (0.01 minimum)
  - [ ] Consider using `type="number"` inputs with min/max
- **Estimated Effort:** Low
- **Files to Modify:** `TransformControl.tsx`

---

## 🟡 MEDIUM PRIORITY ISSUES

### 5. **ResponsiveFlexDirectionControl - Empty Value Fallback** ✅ VERIFIED
- **Component:** `ResponsiveFlexDirectionControl.tsx` (line 41)
- **Severity:** 🟡 MEDIUM
- **Issue:** `<option value="" disabled>Select Direction</option>` allows empty state
- **Mitigation:** `fieldGroups.tsx` sets `defaultValue: { mobile: 'row' }`, so empty state shouldn't normally occur
- **Residual Risk:** Components not using `extractDefaults()` could hit empty state
- **Fix Needed:**
  - [ ] Replace empty placeholder with `<option value="row">Row (Default)</option>`
- **Estimated Effort:** Low
- **Files to Modify:** `ResponsiveFlexDirectionControl.tsx`

---

### 6. **ObjectPositionControl Without ObjectFitControl Guidance** ✅ VERIFIED
- **Components:** `ObjectPositionControl.tsx`, `ObjectFitControl.tsx`
- **Severity:** 🟡 MEDIUM
- **Issue:** No documented relationship. `object-position` has no effect when `object-fit: fill`.
- **Mitigation:** Defaults are good (`object-fit: cover`, `object-position: center`)
- **Fix Needed:**
  - [ ] Add guidance: "Works best with object-fit: cover, contain, or scale-down"
- **Estimated Effort:** Low
- **Files to Modify:** `ObjectPositionControl.tsx`

---

### 7. **MinWidth/MaxWidth - 'auto' Unit Confusion** ✅ VERIFIED
- **Components:** `MinWidthControl.tsx` (lines 38-42), `MaxWidthControl.tsx` (lines 42-48)
- **Severity:** 🟡 MEDIUM
- **Issue:** 'auto' and 'none' presented as unit options alongside px/rem/em — they're values, not units
- **Fix Needed:**
  - [ ] Separate "Special Values" (auto/none) from "Units" (px/rem/%) in UI
- **Estimated Effort:** Medium
- **Files to Modify:** `MinWidthControl.tsx`, `MaxWidthControl.tsx`, all sizing controls

---

### 8. **PositionOffsetControl - Missing Relative Position Guidance** ✅ VERIFIED
- **Component:** `PositionOffsetControl.tsx` (lines 118-122)
- **Severity:** 🟡 MEDIUM
- **Issue:** Guidance text covers sticky/absolute/fixed but not relative positioning
- **Fix Needed:**
  - [ ] Add: "For relative positioning, offsets shift the element from its normal position without affecting layout flow"
- **Estimated Effort:** Low
- **Files to Modify:** `PositionOffsetControl.tsx`

---

### 9. **FontSizeControl - No Input Validation** ✅ VERIFIED
- **Component:** `FontSizeControl.tsx` (lines 22, 160-165)
- **Severity:** 🟡 MEDIUM
- **Issue:** `parseCustomFontSize()` silently returns 'px' for malformed input; no bounds checking
- **Fix Needed:**
  - [ ] Add min/max bounds (e.g., 8px-200px)
  - [ ] Validate numeric input before parsing
- **Estimated Effort:** Low
- **Files to Modify:** `FontSizeControl.tsx`

---

## 🔵 LOW PRIORITY ISSUES

### 10. **LetterSpacingControl - Preset/Unit Mismatch** ✅ VERIFIED
- **Component:** `ResponsiveLetterSpacingControl.tsx` (lines 62-67, 82, 89)
- **Severity:** 🔵 LOW
- **Issue:** Presets hardcoded in `em` but UI allows unit switching; presets become nonsensical when unit changes to px
- **Fix Needed:**
  - [ ] Update presets when unit changes, or disable presets when unit is not 'em'
- **Estimated Effort:** Medium
- **Files to Modify:** `ResponsiveLetterSpacingControl.tsx`

---

### 11. **OpacityControl - Text Input vs Number Input** ✅ VERIFIED
- **Component:** `OpacityControl.tsx` (line 58)
- **Severity:** 🔵 LOW
- **Issue:** Uses `type="text" inputMode="numeric"` instead of `type="number"`
- **Fix Needed:**
  - [ ] Switch to `<input type="number" min="0" max="100">`
- **Estimated Effort:** Low
- **Files to Modify:** `OpacityControl.tsx`

---

### 12. **Dimension Controls - Regex Doesn't Handle Negative Numbers**
- **Components:** `HeightControl.tsx`, `MaxHeightControl.tsx`, `MinHeightControl.tsx`, `WidthControl.tsx`, `MaxWidthControl.tsx`, `MinWidthControl.tsx`
- **Severity:** 🔵 LOW
- **Issue:** Parsing regex doesn't match negative numbers
- **Impact:** Minimal — negative widths/heights are rarely needed and mostly invalid per CSS spec

---

### 13. **ZIndexControl - Weak Input Pattern** ✅ VERIFIED
- **Component:** `ZIndexControl.tsx` (line 108)
- **Severity:** 🔵 LOW
- **Issue:** `pattern="-?[0-9]*"` allows `-` without numbers, `--123`, etc.
- **Fix Needed:**
  - [ ] Tighten pattern to `-?\d+` or use `type="number"`
- **Estimated Effort:** Low
- **Files to Modify:** `ZIndexControl.tsx`

---

## 📋 FULL CONTROLS AUDIT STATUS

### Display & Layout (5 controls) ✅
| Control | Status | Issues |
|---------|--------|--------|
| DisplayControl | ✅ Audited | Mitigated by component resolvers |
| ResponsiveDisplayControl | ✅ Audited | None |
| ResponsiveFlexDirectionControl | ✅ Audited | #5 Empty value fallback |
| ResponsiveGridColumnsControl | ✅ Audited | None |
| ResponsiveGridGapControl | ✅ Audited | None |

### Spacing (2 controls) ✅
| Control | Status | Issues |
|---------|--------|--------|
| SpacingControl | ✅ Audited | None (false positive removed) |
| ResponsiveSpacingControl | ✅ Audited | None |

### Object Fit/Position (2 controls) ✅
| Control | Status | Issues |
|---------|--------|--------|
| ObjectFitControl | ✅ Audited | None |
| ObjectPositionControl | ✅ Audited | #6 Missing guidance |

### Position (4 controls) ✅
| Control | Status | Issues |
|---------|--------|--------|
| ResponsivePositionControl | ✅ Audited | None |
| PositionOffsetControl | ✅ Audited | #8 Missing relative guidance |
| ResponsivePositionOffsetControl | ✅ Audited | None |
| PositionWithOffsetsControl | ✅ Audited | Created, wired via resolveFields |

### Typography (7 controls) ✅
| Control | Status | Issues |
|---------|--------|--------|
| FontSizeControl | ✅ Audited | #9 No input validation |
| ResponsiveFontSizeControl | ✅ Audited | None |
| FontWeightControl | ✅ Audited | #3 No range validation |
| ResponsiveLineHeightControl | ✅ Audited | None |
| ResponsiveLetterSpacingControl | ✅ Audited | #10 Preset/unit mismatch |
| AlignmentControl | ✅ Audited | None |
| (TextTransform) | ✅ Audited | Native select in fieldGroups |

### Colors (2 controls) ✅
| Control | Status | Issues |
|---------|--------|--------|
| ColorPickerControl | ✅ Audited | None |
| ColorPickerControlColorful | ✅ Audited | None (false positive removed) |

### Sizing (12 controls) ✅
| Control | Status | Issues |
|---------|--------|--------|
| WidthControl | ✅ Audited | #2 'fr' unit issue |
| ResponsiveWidthControl | ✅ Audited | Inherits from Width |
| HeightControl | ✅ Audited | #12 Regex issue |
| ResponsiveHeightControl | ✅ Audited | None |
| MaxWidthControl | ✅ Audited | #7 'auto' unit confusion |
| ResponsiveMaxWidthControl | ✅ Audited | None |
| MinWidthControl | ✅ Audited | #7 'auto' unit confusion |
| ResponsiveMinWidthControl | ✅ Audited | None |
| MaxHeightControl | ✅ Audited | #12 Regex issue |
| ResponsiveMaxHeightControl | ✅ Audited | None |
| MinHeightControl | ✅ Audited | #12 Regex issue |
| ResponsiveMinHeightControl | ✅ Audited | None |

### Effects (5 controls) ✅
| Control | Status | Issues |
|---------|--------|--------|
| BorderControl | ✅ Audited | None (default color cosmetic only) |
| BorderRadiusControl | ✅ Audited | None |
| ShadowControl | ✅ Audited | None (false positive removed) |
| OpacityControl | ✅ Audited | #11 Text vs number input |
| ResponsiveOpacityControl | ✅ Audited | None |

### Transform (2 controls) ✅
| Control | Status | Issues |
|---------|--------|--------|
| TransformControl | ✅ Audited | #4 No input validation |
| ResponsiveTransformControl | ✅ Audited | Already optimized |

### Z-Index (2 controls) ✅
| Control | Status | Issues |
|---------|--------|--------|
| ZIndexControl | ✅ Audited | #13 Weak input pattern |
| ResponsiveZIndexControl | ✅ Audited | None |

### Overflow/Visibility (2 controls) ✅
| Control | Status | Issues |
|---------|--------|--------|
| ResponsiveOverflowControl | ✅ Audited | None |
| ResponsiveVisibilityControl | ✅ Audited | #1 Wrong CSS property name |
