import { ComponentConfig } from '@measured/puck';
import React from 'react';
import { useTheme } from '@/shared/hooks';
import {
  BorderValue,
  BorderRadiusValue,
  ShadowValue,
  ColorValue,
  ResponsiveWidthValue,
  ResponsiveSpacingValue,
  ResponsiveDisplayValue,
  ResponsivePositionValue,
  ResponsiveZIndexValue,
  ResponsiveOpacityValue,
  ResponsiveOverflowValue,
  ResponsiveGridColumnsValue,
  ResponsiveGridGapValue,
  // Field groups (organized by usage frequency)
  displayField,
  layoutFields,
  flexLayoutFields,
  gridLayoutFields,
  spacingFields,
  backgroundFields,
  backgroundImageFields,
  layoutAdvancedFields,
  effectsFields,
  advancedFields,
  customClassesFields,
  slotField,
  // Utilities
  hasFlexInAnyBreakpoint,
  hasGridInAnyBreakpoint,
  createConditionalResolver,
  extractDefaults,
  buildLayoutCSS,
} from '../../fields';

export interface BoxProps {
  id?: string;
  items?: () => React.ReactElement;

  // Custom styling
  customClassName?: string;
  customId?: string;

  // Semantic HTML
  tag?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'main' | 'nav';

  // Display type
  display?: ResponsiveDisplayValue;

  // Flex-specific
  direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'end' | 'center' | 'stretch' | 'baseline';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  flexGap?: number;

  // Grid-specific
  numColumns?: ResponsiveGridColumnsValue;
  gridGap?: ResponsiveGridGapValue;
  alignItems?: 'start' | 'center' | 'end' | 'stretch';

  // Layout
  width?: ResponsiveWidthValue;

  // Spacing
  padding?: ResponsiveSpacingValue;
  margin?: ResponsiveSpacingValue;

  // Background
  backgroundColor?: ColorValue;
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  backgroundRepeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';

  // Effects
  border?: BorderValue;
  borderRadius?: BorderRadiusValue;
  shadow?: ShadowValue;

  // Layout Advanced
  position?: ResponsivePositionValue;
  zIndex?: ResponsiveZIndexValue;
  opacity?: ResponsiveOpacityValue;
  overflow?: ResponsiveOverflowValue;

  // Advanced
  customCss?: string;
}

export function BoxComponent({
  id,
  items: Items,
  customClassName = '',
  customId = '',
  // tag = 'div', // TODO: Implement dynamic tag rendering
  display,
  direction = 'row',
  justify = 'start',
  align = 'stretch',
  wrap = 'nowrap',
  flexGap = 16,
  numColumns = { mobile: 2 },
  gridGap = { mobile: 16 },
  alignItems = 'stretch',
  width,
  padding,
  margin,
  backgroundColor,
  backgroundImage,
  backgroundSize = 'cover',
  backgroundPosition = 'center',
  backgroundRepeat = 'no-repeat',
  border,
  borderRadius,
  shadow,
  position,
  zIndex,
  opacity,
  overflow,
  customCss,
}: BoxProps) {
  const { resolve } = useTheme();
  const className = customClassName ? `box-${id} ${customClassName}` : `box-${id}`;
  const elementId = customId || undefined;

  // Resolve background color
  const resolvedBackgroundColor = (() => {
    if (!backgroundColor) return undefined;
    if (typeof backgroundColor === 'string') return backgroundColor;
    if (backgroundColor.type === 'theme') {
      return resolve(backgroundColor.value);
    }
    return backgroundColor.value;
  })();

  // Generate all CSS using centralized builder
  const layoutCss = buildLayoutCSS({
    className,
    display,
    direction,
    justify,
    align,
    wrap,
    flexGap,
    numColumns,
    gridGap,
    alignItems,
    position,
    zIndex,
    opacity,
    overflow,
    width,
    padding,
    margin,
    border,
    borderRadius,
    shadow,
    backgroundColor: resolvedBackgroundColor,
    backgroundImage,
    backgroundSize,
    backgroundPosition,
    backgroundRepeat,
  });

  return (
    <>
      <style>{layoutCss}</style>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {Items && <Items {...({ className, ...(elementId && { id: elementId }) } as any)} />}
      {customCss && <style>{customCss}</style>}
    </>
  );
}

// Component configuration using organized field groups
export const Box: ComponentConfig<BoxProps> = {
  label: 'Box',
  // Slot-based component - NOT inline (see roadmap: slot-based components don't use inline: true)

  // Fields organized by usage frequency (most used → least used)
  fields: {
    // Slot
    ...slotField,
    // Custom styling
    ...customClassesFields,
    // Semantic HTML
    tag: {
      type: 'select' as const,
      label: 'HTML Element',
      options: [
        { label: 'Div (Generic)', value: 'div' },
        { label: 'Section', value: 'section' },
        { label: 'Article', value: 'article' },
        { label: 'Aside (Sidebar)', value: 'aside' },
        { label: 'Header', value: 'header' },
        { label: 'Footer', value: 'footer' },
        { label: 'Main', value: 'main' },
        { label: 'Nav (Navigation)', value: 'nav' },
      ],
    },
    // 1. Layout (most used)
    ...displayField,
    ...layoutFields,
    // 2. Flex Options (conditional)
    ...flexLayoutFields,
    // 3. Grid Options (conditional)
    ...gridLayoutFields,
    // 4. Spacing
    ...spacingFields,
    // 5. Background
    ...backgroundFields,
    ...backgroundImageFields,
    // 6. Layout Advanced
    ...layoutAdvancedFields,
    // 7. Effects
    ...effectsFields,
    // 8. Advanced (least used)
    ...advancedFields,
  },

  // Use factory function for conditional fields - no manual logic
  resolveFields: createConditionalResolver(
    // Base fields that are always visible (in order of appearance)
    [
      'items',
      'customClassName',
      'customId',
      'tag',
      // Layout
      'display',
      'width',
      // Spacing
      'padding',
      'margin',
      // Background
      'backgroundColor',
      'backgroundImage',
      'backgroundSize',
      'backgroundPosition',
      'backgroundRepeat',
      // Layout Advanced
      'position',
      'zIndex',
      'opacity',
      'overflow',
      // Effects
      'border',
      'borderRadius',
      'shadow',
      // Advanced
      'customCss',
    ],
    // Conditional fields based on display mode
    [
      {
        condition: (props) => hasFlexInAnyBreakpoint(props.display),
        fieldKeys: ['direction', 'justify', 'align', 'wrap', 'flexGap'],
      },
      {
        condition: (props) => hasGridInAnyBreakpoint(props.display),
        fieldKeys: ['numColumns', 'gridGap', 'alignItems'],
      },
    ]
  ),

  // Use extractDefaults to get defaults from field groups - DRY!
  defaultProps: {
    tag: 'div',
    ...extractDefaults(
      customClassesFields,
      displayField,
      layoutFields,
      flexLayoutFields,
      gridLayoutFields,
      spacingFields,
      backgroundFields,
      backgroundImageFields,
      layoutAdvancedFields,
      effectsFields,
      advancedFields
    ),
  },

  render: (props) => <BoxComponent {...props} />,
};
