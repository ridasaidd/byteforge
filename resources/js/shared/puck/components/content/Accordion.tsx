/* eslint-disable react-refresh/only-export-components */
import { ComponentConfig } from '@puckeditor/core';
import { useEffect, useState } from 'react';
import { usePuckEditMode } from '@/shared/hooks';
import {
  type BorderRadiusValue,
  type BorderValue,
  type ColorValue,
  type ShadowValue,
  type ResponsiveDisplayValue,
  type ResponsiveHeightValue,
  type ResponsiveMaxHeightValue,
  type ResponsiveMaxWidthValue,
  type ResponsiveOverflowValue,
  type ResponsivePositionValue,
  type ResponsiveSpacingValue,
  type ResponsiveVisibilityValue,
  type ResponsiveWidthValue,
  displayField,
  layoutFields,
  layoutAdvancedFields,
  spacingFields,
  backgroundFields,
  effectsFields,
  advancedFields,
  extractDefaults,
  createConditionalResolver,
  buildLayoutCSS,
} from '../../fields';

interface AccordionItem {
  title: string;
  content: string;
  expanded?: boolean;
}

function normalizeAccordionItem(item: Partial<AccordionItem> | undefined): AccordionItem {
  return {
    title: item?.title ?? '',
    content: item?.content ?? '',
    expanded: item?.expanded ?? false,
  };
}

function getDefaultExpandedIndexes(items: AccordionItem[], allowMultiple: boolean): number[] {
  const expandedIndexes = items
    .map((item, index) => (item.expanded ? index : -1))
    .filter((index) => index >= 0);

  return allowMultiple ? expandedIndexes : expandedIndexes.slice(0, 1);
}

export interface AccordionProps {
  id?: string;
  items: AccordionItem[];
  allowMultiple?: boolean;
  titleBackgroundColor?: ColorValue;
  titleTextColor?: ColorValue;
  contentBackgroundColor?: ColorValue;
  contentTextColor?: ColorValue;
  borderColor?: ColorValue;
  hoverBackgroundColor?: ColorValue;
  display?: ResponsiveDisplayValue;
  width?: ResponsiveWidthValue;
  height?: ResponsiveHeightValue;
  maxWidth?: ResponsiveMaxWidthValue;
  maxHeight?: ResponsiveMaxHeightValue;
  padding?: ResponsiveSpacingValue;
  margin?: ResponsiveSpacingValue;
  backgroundColor?: ColorValue;
  border?: BorderValue;
  borderRadius?: BorderRadiusValue;
  shadow?: ShadowValue;
  position?: ResponsivePositionValue;
  overflow?: ResponsiveOverflowValue;
  visibility?: ResponsiveVisibilityValue;
  customCss?: string;
}

const AccordionComponent = ({
  id,
  items = [],
  allowMultiple = false,
  titleBackgroundColor,
  titleTextColor,
  contentBackgroundColor,
  contentTextColor,
  borderColor,
  hoverBackgroundColor,
  display,
  width,
  height,
  maxWidth,
  maxHeight,
  padding,
  margin,
  backgroundColor,
  border,
  borderRadius,
  shadow,
  position,
  overflow,
  visibility,
  customCss,
  puck,
}: AccordionProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) => {
  const isEditing = usePuckEditMode();
  const className = `accordion-${id}`;
  const resolvedBackgroundColor = backgroundColor?.type === 'custom' ? backgroundColor.value : undefined;

  const layoutCss = buildLayoutCSS({
    className,
    display,
    width,
    height,
    maxWidth,
    maxHeight,
    padding,
    margin,
    backgroundColor: resolvedBackgroundColor,
    border,
    borderRadius,
    shadow,
    position,
    overflow,
    visibility,
  });

  const titleBgColor = titleBackgroundColor?.type === 'custom' ? titleBackgroundColor.value : '#f3f4f6';
  const titleTxtColor = titleTextColor?.type === 'custom' ? titleTextColor.value : '#000000';
  const contentBgColor = contentBackgroundColor?.type === 'custom' ? contentBackgroundColor.value : '#ffffff';
  const contentTxtColor = contentTextColor?.type === 'custom' ? contentTextColor.value : '#000000';
  const borderColorValue = borderColor?.type === 'custom' ? borderColor.value : '#e5e7eb';
  const hoverBgColor = hoverBackgroundColor?.type === 'custom' ? hoverBackgroundColor.value : '#e5e7eb';

  const accordionCss = [
    `.${className} { border: 1px solid ${borderColorValue}; border-radius: 6px; overflow: hidden; }`,
    `.${className}-item { border-bottom: 1px solid ${borderColorValue}; }`,
    `.${className}-item:last-child { border-bottom: none; }`,
    `.${className}-title { background-color: ${titleBgColor}; color: ${titleTxtColor}; padding: 12px 16px; cursor: pointer; user-select: none; font-weight: 600; display: flex; justify-content: space-between; align-items: center; transition: background-color 0.2s ease; }`,
    `.${className}-title:hover { background-color: ${hoverBgColor}; }`,
    `.${className}-content { background-color: ${contentBgColor}; color: ${contentTxtColor}; padding: 16px; display: none; }`,
    `.${className}-item.expanded .${className}-content { display: block; }`,
    `.${className}-icon { display: inline-block; transition: transform 0.2s ease; width: 20px; height: 20px; }`,
    `.${className}-item.expanded .${className}-icon { transform: rotate(180deg); }`,
  ].join('\n');

  const dataItems = items && items.length > 0
    ? items.map((item) => normalizeAccordionItem(item))
    : [
      { title: 'Item 1', content: 'Content for item 1' },
      { title: 'Item 2', content: 'Content for item 2' },
    ];

  const [expandedIndexes, setExpandedIndexes] = useState<number[]>(() => getDefaultExpandedIndexes(dataItems, allowMultiple));

  useEffect(() => {
    setExpandedIndexes(getDefaultExpandedIndexes(dataItems, allowMultiple));
  }, [allowMultiple, items]);

  const toggleItem = (index: number) => {
    setExpandedIndexes((current) => {
      const isExpanded = current.includes(index);

      if (isExpanded) {
        return current.filter((value) => value !== index);
      }

      return allowMultiple ? [...current, index] : [index];
    });
  };

  return (
    <>
      {isEditing && <style>{layoutCss}\n{accordionCss}</style>}
      <div ref={puck?.dragRef} className={className}>
        {dataItems.map((item, idx) => (
          <div key={`item-${idx}`} className={`${className}-item ${expandedIndexes.includes(idx) ? 'expanded' : ''}`}>
            <button
              className={`${className}-title`}
              type="button"
              aria-expanded={expandedIndexes.includes(idx)}
              onClick={() => toggleItem(idx)}
            >
              <span>{item.title}</span>
              <span className={`${className}-icon`}>
                ▼
              </span>
            </button>
            <div className={`${className}-content`}>
              {item.content}
            </div>
          </div>
        ))}
      </div>
      {customCss && <style>{customCss}</style>}
    </>
  );
};

const accordionContentFields = {
  items: {
    type: 'array' as const,
    label: 'Accordion Items',
    getItemSummary: (item: AccordionItem | undefined) => item?.title || 'Item',
    defaultValue: [
      { title: 'Item 1', content: 'Content for item 1', expanded: false },
      { title: 'Item 2', content: 'Content for item 2', expanded: false },
    ],
    arrayFields: {
      title: { type: 'text' as const, label: 'Title' },
      content: { type: 'textarea' as const, label: 'Content' },
      expanded: {
        type: 'radio' as const,
        label: 'Expanded by Default',
        options: [
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ],
      },
    },
  },
  allowMultiple: {
    type: 'radio' as const,
    label: 'Allow Multiple Open',
    options: [
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ],
    defaultValue: false,
  },
  titleBackgroundColor: backgroundFields.backgroundColor,
  titleTextColor: backgroundFields.backgroundColor,
  contentBackgroundColor: backgroundFields.backgroundColor,
  contentTextColor: backgroundFields.backgroundColor,
  borderColor: backgroundFields.backgroundColor,
  hoverBackgroundColor: backgroundFields.backgroundColor,
};

export const Accordion: ComponentConfig<AccordionProps> = {
  label: 'Accordion',
  inline: true,

  resolveFields: createConditionalResolver(
    [
      'items',
      'allowMultiple',
      'titleBackgroundColor',
      'titleTextColor',
      'contentBackgroundColor',
      'contentTextColor',
      'borderColor',
      'hoverBackgroundColor',
      'display',
      'width',
      'height',
      'maxWidth',
      'maxHeight',
      'padding',
      'margin',
      'backgroundColor',
      'border',
      'borderRadius',
      'shadow',
      'position',
      'overflow',
      'visibility',
      'customCss',
    ],
    []
  ),

  fields: {
    ...accordionContentFields,
    ...displayField,
    width: layoutFields.width,
    height: layoutFields.height,
    maxWidth: layoutFields.maxWidth,
    maxHeight: layoutFields.maxHeight,
    ...spacingFields,
    ...backgroundFields,
    ...effectsFields,
    ...layoutAdvancedFields,
    ...advancedFields,
  },

  defaultProps: {
    ...extractDefaults(
      accordionContentFields,
      displayField,
      { width: layoutFields.width },
      { height: layoutFields.height },
      { maxWidth: layoutFields.maxWidth },
      { maxHeight: layoutFields.maxHeight },
      spacingFields,
      backgroundFields,
      effectsFields,
      layoutAdvancedFields,
      advancedFields
    ),
    items: [
      { title: 'Item 1', content: 'Content for item 1', expanded: false },
      { title: 'Item 2', content: 'Content for item 2', expanded: false },
    ],
    allowMultiple: false,
    display: { mobile: 'block' as const },
    width: { mobile: { value: '100', unit: '%' as const } },
  },

  render: (props) => <AccordionComponent {...props} />,
};
