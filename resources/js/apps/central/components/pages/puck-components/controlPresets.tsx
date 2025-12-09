import {
  SpacingControl, BorderControl, ShadowControl, WidthControl, DisplayControl,
  ColorPickerControl, FontSizeControl, FontWeightControl, AlignmentControl,
  DisplayValue
} from './fields';

/**
 * Control Presets for Puck Components
 *
 * These presets organize controls by semantic HTML element types:
 * - Layout Containers: Section, Container, Columns, Flex (NO typography controls)
 * - Typography: Heading, Text (NO background images)
 * - Media: Image (margin ONLY, NO padding or typography)
 * - Interactive: Button, Navigation (typography + layout + states)
 * - Composite: Card, Hero (combination of above)
 */

// ============================================================================
// SPACING CONTROLS (used by all component types)
// ============================================================================

export const marginControl = {
  type: 'custom' as const,
  label: 'Margin',
  render: (props: any) => {
    const { value = { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true }, onChange } = props;
    return <SpacingControl field={{ label: 'Margin' }} value={value} onChange={onChange} />;
  },
};

export const paddingControl = {
  type: 'custom' as const,
  label: 'Padding',
  render: (props: any) => {
    const { value = { top: '0', right: '0', bottom: '0', left: '0', unit: 'px', linked: true }, onChange } = props;
    return <SpacingControl field={{ label: 'Padding' }} value={value} onChange={onChange} allowNegative={false} />;
  },
};

// ============================================================================
// VISUAL CONTROLS (borders, shadows, width, display)
// ============================================================================

export const borderControl = {
  type: 'custom' as const,
  label: 'Border',
  render: (props: any) => {
    const { value = { width: '0', style: 'none', color: '#000000', radius: '0', unit: 'px' }, onChange } = props;
    return <BorderControl field={{ label: 'Border' }} value={value} onChange={onChange} />;
  },
};

export const shadowControl = {
  type: 'custom' as const,
  label: 'Shadow',
  render: (props: any) => {
    const { value = { preset: 'none' }, onChange } = props;
    return <ShadowControl field={{ label: 'Shadow' }} value={value} onChange={onChange} />;
  },
};

export const widthControl = {
  type: 'custom' as const,
  label: 'Width',
  render: (props: any) => {
    const { value = { value: '100', unit: '%' }, onChange } = props;
    return <WidthControl field={{ label: 'Width' }} value={value} onChange={onChange} />;
  },
};

export const displayControl = {
  type: 'custom' as const,
  label: 'Display',
  render: (props: any) => {
    const { value = 'block', onChange } = props;
    return <DisplayControl field={{ label: 'Display' }} value={value as DisplayValue} onChange={onChange} />;
  },
};

// ============================================================================
// COLOR CONTROLS
// ============================================================================

export const backgroundColorControl = {
  type: 'custom' as const,
  label: 'Background Color',
  render: (props: any) => {
    const { value, onChange } = props;
    return <ColorPickerControl field={{ label: 'Background Color' }} value={value || { type: 'theme', value: '' }} onChange={onChange} />;
  },
};

export const textColorControl = {
  type: 'custom' as const,
  label: 'Text Color',
  render: (props: any) => {
    const { value, onChange } = props;
    return <ColorPickerControl field={{ label: 'Text Color' }} value={value || { type: 'theme', value: '' }} onChange={onChange} />;
  },
};

// ============================================================================
// TYPOGRAPHY CONTROLS
// ============================================================================

export const fontSizeControl = {
  type: 'custom' as const,
  label: 'Font Size',
  render: (props: any) => {
    const { value, onChange } = props;
    return <FontSizeControl field={{ label: 'Font Size' }} value={value} onChange={onChange} />;
  },
};

export const fontWeightControl = {
  type: 'custom' as const,
  label: 'Font Weight',
  render: (props: any) => {
    const { value, onChange } = props;
    return <FontWeightControl field={{ label: 'Font Weight' }} value={value} onChange={onChange} />;
  },
};

// ============================================================================
// ALIGNMENT CONTROLS
// ============================================================================

export const alignmentControl = {
  type: 'custom' as const,
  label: 'Alignment',
  render: (props: any) => {
    const { value = { horizontal: 'left' }, onChange } = props;
    return <AlignmentControl field={{ label: 'Alignment' }} value={value} onChange={onChange} showVertical={true} />;
  },
};

// ============================================================================
// PRESET COLLECTIONS BY SEMANTIC TYPE
// ============================================================================

/**
 * Layout Container Controls
 * For: Section, Container, Columns, Flex
 *
 * These components structure the page layout. They should have:
 * - Background styling (color, image)
 * - Spacing (margin, padding)
 * - Visual effects (border, shadow)
 * - Layout properties (width, display, alignment)
 *
 * They should NOT have:
 * - Typography controls (fontSize, fontWeight) - they don't render text directly
 */
export const layoutContainerControls = {
  backgroundColor: backgroundColorControl,
  margin: marginControl,
  padding: paddingControl,
  border: borderControl,
  shadow: shadowControl,
  width: widthControl,
  display: displayControl,
  alignment: alignmentControl,
};

/**
 * Typography Controls
 * For: Heading, Text
 *
 * These components render text content. They should have:
 * - Text styling (color, fontSize, fontWeight)
 * - Background color (for highlighting)
 * - Spacing (margin, padding)
 * - Visual effects (border, shadow)
 * - Layout properties (width, display)
 *
 * They should NOT have:
 * - Background images (semantically incorrect for text elements)
 */
export const typographyControls = {
  color: textColorControl,
  backgroundColor: backgroundColorControl,
  fontSize: fontSizeControl,
  fontWeight: fontWeightControl,
  margin: marginControl,
  padding: paddingControl,
  border: borderControl,
  shadow: shadowControl,
  width: widthControl,
  display: displayControl,
};

/**
 * Media Controls
 * For: Image
 *
 * Media elements have specific layout requirements:
 * - Margin for spacing (NOT padding - images don't have internal space)
 * - Border and shadow for visual effects
 * - Width/height for sizing
 * - Display for layout behavior
 *
 * They should NOT have:
 * - Padding (images are replaced elements, padding doesn't make sense)
 * - Typography controls (images don't render text)
 * - Background color/image (the image IS the content)
 */
export const mediaControls = {
  margin: marginControl,
  border: borderControl,
  shadow: shadowControl,
  width: widthControl,
  display: displayControl,
  alignment: alignmentControl,
};

/**
 * Interactive Controls
 * For: Button, Navigation
 *
 * Interactive elements need both typography and layout controls:
 * - All typography controls for text styling
 * - All layout controls for button/nav styling
 * - Additional state-specific controls (hover, active, etc.) added per component
 */
export const interactiveControls = {
  ...typographyControls,
  backgroundColor: backgroundColorControl,
  alignment: alignmentControl,
};

/**
 * Composite Controls
 * For: Card
 *
 * Composite components combine multiple element types.
 * They typically need a flexible set of controls.
 */
export const compositeControls = {
  backgroundColor: backgroundColorControl,
  margin: marginControl,
  padding: paddingControl,
  border: borderControl,
  shadow: shadowControl,
  width: widthControl,
  display: displayControl,
};
