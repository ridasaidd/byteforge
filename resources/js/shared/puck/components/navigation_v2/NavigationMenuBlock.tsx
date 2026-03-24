import { ComponentConfig } from '@puckeditor/core';
import { navigations, type Navigation as NavigationType } from '@/shared/services/api/navigations';
import {
  advancedFields,
  createConditionalResolver,
  customClassesFields,
  displayField,
  effectsFields,
  flexLayoutFields,
  hasFlexInAnyBreakpoint,
  hasNonStaticPositionInAnyBreakpoint,
  interactionFields,
  layoutAdvancedFields,
  layoutFields,
  spacingFields,
  type ColorValue,
  ColorPickerControlColorful as ColorPickerControl,
  ResponsiveWrapper,
  type ResponsiveValue,
  PositionOffsetControl,
  type PositionOffsetValue,
  WidthControl,
  type WidthValue,
  fontFamilyField,
  fontSizeField,
  fontWeightField,
  typographyAdvancedFields,
} from '../../fields';
import { NavigationMenuRenderer } from './NavigationMenuRenderer';
import type { MobileVariant, NavigationMenuProps } from './shared/navTypes';

const responsiveColorField = (label: string) => ({
  type: 'custom' as const,
  label,
  render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsiveValue<ColorValue>; onChange: (value: ResponsiveValue<ColorValue>) => void }) => (
    <ResponsiveWrapper<ColorValue>
      label={field.label || label}
      value={value}
      onChange={onChange}
      defaultValue={{ type: 'custom', value: '' }}
      renderControl={(currentValue, onValueChange) => (
        <ColorPickerControl
          field={{ label: undefined }}
          value={currentValue || { type: 'custom', value: '' }}
          onChange={onValueChange}
        />
      )}
    />
  ),
});

const itemColorFields = {
  itemColor: responsiveColorField('Item Text Color'),
  itemHoverColor: responsiveColorField('Item Hover Color'),
  itemActiveColor: responsiveColorField('Item Active Color'),
  itemBackgroundColor: responsiveColorField('Item Background'),
  itemHoverBackgroundColor: responsiveColorField('Item Hover Background'),
  itemActiveBackgroundColor: responsiveColorField('Item Active Background'),
};

const itemTypographyFields = {
  fontFamily: {
    ...fontFamilyField('sans').fontFamily,
    label: 'Item Font Family',
  },
  fontSize: {
    ...fontSizeField.fontSize,
    label: 'Item Font Size',
  },
  fontWeight: {
    ...fontWeightField.fontWeight,
    label: 'Item Font Weight',
  },
  lineHeight: {
    ...typographyAdvancedFields.lineHeight,
    label: 'Item Line Height',
  },
  letterSpacing: {
    ...typographyAdvancedFields.letterSpacing,
    label: 'Item Letter Spacing',
  },
  textTransform: {
    ...typographyAdvancedFields.textTransform,
    label: 'Item Text Transform',
  },
  textDecoration: {
    ...typographyAdvancedFields.textDecoration,
    label: 'Item Text Decoration',
  },
};

const itemStyleFields = {
  itemPadding: {
    ...spacingFields.padding,
    label: 'Item Padding',
  },
  itemBorderRadius: {
    ...effectsFields.borderRadius,
    label: 'Item Border Radius',
  },
};

const subItemFields = {
  subItemColor: responsiveColorField('Sub Item Text Color'),
  subItemHoverColor: responsiveColorField('Sub Item Hover Color'),
  subItemBackgroundColor: responsiveColorField('Sub Item Background'),
  subItemHoverBackgroundColor: responsiveColorField('Sub Item Hover Background'),
  subItemPadding: {
    ...spacingFields.padding,
    label: 'Sub Item Padding',
  },
  subFontFamily: {
    ...fontFamilyField('sans').fontFamily,
    label: 'Sub Item Font Family',
  },
  subFontSize: {
    ...fontSizeField.fontSize,
    label: 'Sub Item Font Size',
  },
  subFontWeight: {
    ...fontWeightField.fontWeight,
    label: 'Sub Item Font Weight',
  },
  dropdownBackgroundColor: responsiveColorField('Dropdown Background'),
  dropdownBorderRadius: {
    ...effectsFields.borderRadius,
    label: 'Dropdown Border Radius',
  },
  dropdownShadow: {
    ...effectsFields.shadow,
    label: 'Dropdown Shadow',
  },
  dropdownMinWidth: {
    type: 'custom' as const,
    label: 'Dropdown Min Width',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: WidthValue; onChange: (value: WidthValue) => void }) => (
      <WidthControl field={field} value={value} onChange={onChange} />
    ),
  },
};

const mobileFields = {
  mobileBreakpoint: {
    type: 'select' as const,
    label: 'Mobile Breakpoint',
    options: [
      { label: 'sm — 640px', value: 'sm' },
      { label: 'md — 768px', value: 'md' },
      { label: 'lg — 1024px', value: 'lg' },
      { label: 'xl — 1280px', value: 'xl' },
    ],
  },
  mobileVariant: {
    type: 'select' as const,
    label: 'Mobile Variant',
    options: [
      { label: 'Drawer', value: 'drawer' },
      { label: 'Fullscreen', value: 'fullscreen' },
      { label: 'Dropdown', value: 'dropdown' },
    ],
  },
  drawerWidth: {
    type: 'custom' as const,
    label: 'Drawer Width',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: WidthValue; onChange: (value: WidthValue) => void }) => (
      <WidthControl field={field} value={value} onChange={onChange} />
    ),
  },
  drawerBackgroundColor: responsiveColorField('Mobile Menu Background'),
  drawerOverlayColor: responsiveColorField('Overlay Color'),
  drawerOverlayOpacity: {
    type: 'number' as const,
    label: 'Overlay Opacity',
    min: 0,
    max: 1,
    step: 0.05,
  },
  closeButtonColor: responsiveColorField('Close Button Color'),
  closeButtonBackgroundColor: responsiveColorField('Close Button Background'),
  closeButtonSize: {
    type: 'custom' as const,
    label: 'Close Button Size',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: WidthValue; onChange: (value: WidthValue) => void }) => (
      <WidthControl field={field} value={value} onChange={onChange} />
    ),
  },
  closeButtonIconSize: {
    type: 'number' as const,
    label: 'Close Icon Size',
    min: 12,
    max: 64,
  },
  closeButtonOffset: {
    type: 'custom' as const,
    label: 'Close Button Offset',
    render: ({ field, value, onChange }: { field: { label?: string }; value?: PositionOffsetValue; onChange: (value: PositionOffsetValue) => void }) => (
      <PositionOffsetControl
        field={field}
        value={value || { top: '12', right: '12', bottom: '', left: '', unit: 'px', linked: false }}
        onChange={onChange}
      />
    ),
  },
  navItemsPadding: {
    ...spacingFields.padding,
    label: 'Nav Items Padding',
  },
  navItemsMargin: {
    ...spacingFields.margin,
    label: 'Nav Items Margin',
  },
  toggleColor: responsiveColorField('Toggle Color'),
  toggleIconSize: {
    type: 'number' as const,
    label: 'Toggle Icon Size',
    min: 12,
    max: 72,
  },
};

const baseConditionalResolver = createConditionalResolver(
  [
    'navigationId',
    'placeholderItems',
    'customClassName',
    'customId',
    'display',
    'width',
    'maxWidth',
    'padding',
    'margin',
    'backgroundColor',
    'border',
    'borderRadius',
    'shadow',
    'position',
    'transform',
    'zIndex',
    'opacity',
    'overflow',
    'visibility',
    'itemColor',
    'itemHoverColor',
    'itemActiveColor',
    'itemBackgroundColor',
    'itemHoverBackgroundColor',
    'itemActiveBackgroundColor',
    'itemPadding',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'letterSpacing',
    'textTransform',
    'textDecoration',
    'itemBorderRadius',
    'cursor',
    'transition',
    'subItemColor',
    'subItemHoverColor',
    'subItemBackgroundColor',
    'subItemHoverBackgroundColor',
    'subItemPadding',
    'subFontFamily',
    'subFontSize',
    'subFontWeight',
    'dropdownBackgroundColor',
    'dropdownBorderRadius',
    'dropdownShadow',
    'dropdownMinWidth',
    'mobileBreakpoint',
    'mobileVariant',
    'closeButtonColor',
    'closeButtonBackgroundColor',
    'closeButtonSize',
    'closeButtonIconSize',
    'closeButtonOffset',
    'navItemsPadding',
    'navItemsMargin',
    'customCss',
  ],
  [
    {
      condition: (props: NavigationMenuProps) => hasFlexInAnyBreakpoint(props.display),
      fieldKeys: ['direction', 'justify', 'align', 'wrap', 'flexGap'],
    },
    {
      condition: (props: NavigationMenuProps) => hasNonStaticPositionInAnyBreakpoint(props.position),
      fieldKeys: ['positionOffset'],
    },
    {
      condition: (props: NavigationMenuProps) => props.mobileVariant === 'drawer',
      fieldKeys: ['drawerWidth'],
    },
    {
      condition: (props: NavigationMenuProps) => !!props.mobileVariant,
      fieldKeys: [
        'drawerBackgroundColor',
      ],
    },
    {
      condition: (props: NavigationMenuProps) => (props.mobileVariant as MobileVariant | undefined) === 'drawer' || (props.mobileVariant as MobileVariant | undefined) === 'fullscreen',
      fieldKeys: [
        'drawerOverlayColor',
        'drawerOverlayOpacity',
        'closeButtonColor',
        'closeButtonBackgroundColor',
        'closeButtonSize',
        'closeButtonIconSize',
        'closeButtonOffset',
      ],
    },
    {
      condition: (props: NavigationMenuProps) => !!props.mobileVariant,
      fieldKeys: ['navItemsPadding', 'navItemsMargin'],
    },
    {
      condition: (props: NavigationMenuProps) => !!props.mobileVariant,
      fieldKeys: ['toggleColor', 'toggleIconSize'],
    },
  ]
);

export const NavigationMenuBlock: ComponentConfig<NavigationMenuProps> = {
  label: 'Navigation Menu',
  inline: true,

  // When a real navigationId is chosen in customize mode, strip any stale
  // placeholder items from the persisted page data so fake theme content
  // is never saved or rendered on the public storefront.
  resolveData: ({ props }) => {
    if (props.navigationId && props.placeholderItems) {
      return { props: { ...props, placeholderItems: undefined } };
    }
    return { props };
  },

  resolveFields: (data, params) => {
    const resolved = baseConditionalResolver(data, params);

    // Theme builder (/themes/new/builder or /themes/:id/builder):
    //   → show placeholderItems for fake preview data, hide navigationId (no real menu needed)
    // Customize mode (/themes/:id/customize) and page editor:
    //   → show navigationId to pick a real menu, hide placeholderItems
    const isThemeBuilder =
      typeof window !== 'undefined' &&
      window.location.pathname.includes('/builder');

    if (isThemeBuilder) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { navigationId: _navigationId, ...rest } = resolved;
      return rest;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { placeholderItems: _placeholderItems, ...rest } = resolved;
    return rest;
  },

  fields: {
    navigationId: {
      type: 'external',
      label: 'Select Menu',
      fetchList: async () => {
        try {
          const response = await navigations.list({ status: 'published' });
          return response.data.map((navigation: NavigationType) => ({
            title: navigation.name,
            value: navigation.id,
          }));
        } catch {
          return [];
        }
      },
    },
    placeholderItems: {
      type: 'array',
      label: 'Placeholder Items',
      getItemSummary: (item) => item.label || 'Menu Item',
      arrayFields: {
        label: { type: 'text', label: 'Label' },
        url: { type: 'text', label: 'URL' },
        target: {
          type: 'select',
          label: 'Target',
          options: [
            { label: 'Same Tab', value: '_self' },
            { label: 'New Tab', value: '_blank' },
          ],
        },
        id: { type: 'text', label: 'ID (Optional)' },
        order: { type: 'number', label: 'Order' },
        children: {
          type: 'array',
          label: 'Submenu Items',
          getItemSummary: (item) => item.label || 'Submenu Item',
          arrayFields: {
            label: { type: 'text', label: 'Label' },
            url: { type: 'text', label: 'URL' },
            target: {
              type: 'select',
              label: 'Target',
              options: [
                { label: 'Same Tab', value: '_self' },
                { label: 'New Tab', value: '_blank' },
              ],
            },
            id: { type: 'text', label: 'ID (Optional)' },
            order: { type: 'number', label: 'Order' },
          },
        },
      },
    },

    ...customClassesFields,
    ...displayField,
    ...flexLayoutFields,
    width: layoutFields.width,
    maxWidth: layoutFields.maxWidth,
    ...spacingFields,
    backgroundColor: {
      type: 'custom' as const,
      label: 'Background Color',
      render: ({ field, value, onChange }: { field: { label?: string }; value?: ResponsiveValue<ColorValue>; onChange: (value: ResponsiveValue<ColorValue>) => void }) => (
        <ResponsiveWrapper<ColorValue>
          label={field.label || 'Background Color'}
          value={value}
          onChange={onChange}
          defaultValue={{ type: 'custom', value: '' }}
          renderControl={(currentValue, onValueChange) => (
            <ColorPickerControl
              field={{ label: undefined }}
              value={currentValue || { type: 'custom', value: '' }}
              onChange={onValueChange}
            />
          )}
        />
      ),
    },
    ...effectsFields,
    position: layoutAdvancedFields.position,
    positionOffset: layoutAdvancedFields.positionOffset,
    transform: layoutAdvancedFields.transform,
    zIndex: layoutAdvancedFields.zIndex,
    opacity: layoutAdvancedFields.opacity,
    overflow: layoutAdvancedFields.overflow,
    visibility: layoutAdvancedFields.visibility,

    ...itemColorFields,
    ...itemTypographyFields,
    ...itemStyleFields,
    ...interactionFields,

    ...subItemFields,

    ...mobileFields,

    ...advancedFields,
  },

  defaultProps: {
    display: { mobile: 'flex' },
    direction: { mobile: 'row' },
    flexGap: { mobile: { value: '16', unit: 'px' } },
    align: 'center',

    mobileBreakpoint: 'md',
    mobileVariant: 'dropdown',
    toggleIconSize: 24,

    itemColor: undefined,
    itemHoverColor: undefined,
    itemActiveColor: undefined,
    itemBackgroundColor: undefined,
    itemHoverBackgroundColor: undefined,
    itemActiveBackgroundColor: undefined,
    itemPadding: undefined,
    fontFamily: undefined,
    fontSize: undefined,
    fontWeight: undefined,
    lineHeight: undefined,
    letterSpacing: undefined,
    textTransform: undefined,
    textDecoration: undefined,
    itemBorderRadius: undefined,
    cursor: undefined,
    transition: undefined,

    subItemColor: undefined,
    subItemHoverColor: undefined,
    subItemBackgroundColor: undefined,
    subItemHoverBackgroundColor: undefined,
    subItemPadding: undefined,
    subFontFamily: undefined,
    subFontSize: undefined,
    subFontWeight: undefined,
    dropdownBackgroundColor: undefined,
    dropdownBorderRadius: undefined,
    dropdownShadow: undefined,
    dropdownMinWidth: undefined,

    drawerWidth: undefined,
    drawerBackgroundColor: undefined,
    drawerOverlayColor: undefined,
    drawerOverlayOpacity: undefined,
    closeButtonColor: undefined,
    closeButtonBackgroundColor: undefined,
    closeButtonSize: undefined,
    closeButtonIconSize: 20,
    closeButtonOffset: undefined,
    navItemsPadding: undefined,
    navItemsMargin: undefined,
    toggleColor: undefined,
  },

  render: (props) => <NavigationMenuRenderer {...props} />,
};
