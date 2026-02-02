import { ComponentConfig } from '@puckeditor/core';
import { useTheme, usePuckEditMode } from '@/shared/hooks';
import {
  ColorValue,
  BorderValue,
  BorderRadiusValue,
  ShadowValue,
  ResponsiveSpacingValue,
  ResponsiveWidthValue,
  ResponsiveMaxWidthValue,
  ResponsiveMaxHeightValue,
  ResponsiveDisplayValue,
  ResponsiveVisibilityValue,
  // Field groups
  displayField,
  layoutFields,
  layoutAdvancedFields,
  textColorField,
  fontFamilyField,
  backgroundFields,
  spacingFields,
  effectsFields,
  advancedFields,
  // Utilities
  extractDefaults,
  buildTypographyCSS,
} from '../../fields';

export interface RichTextProps {
  id?: string;
  content: React.ReactNode; // richtext field returns ReactNode in editor, string when stored
  fontFamily?: string;
  color?: ColorValue;
  backgroundColor?: ColorValue;
  width?: ResponsiveWidthValue;
  maxWidth?: ResponsiveMaxWidthValue;
  maxHeight?: ResponsiveMaxHeightValue;
  display?: ResponsiveDisplayValue;
  margin?: ResponsiveSpacingValue;
  padding?: ResponsiveSpacingValue;
  border?: BorderValue;
  borderRadius?: BorderRadiusValue;
  shadow?: ShadowValue;
  visibility?: ResponsiveVisibilityValue;
  customCss?: string;
}

function RichTextComponent({
  id,
  content,
  fontFamily,
  color,
  backgroundColor,
  width,
  maxWidth,
  maxHeight,
  display,
  margin,
  padding,
  border,
  borderRadius,
  shadow,
  visibility,
  customCss,
  puck,
}: RichTextProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) {
  const { resolve } = useTheme();
  const isEditing = usePuckEditMode();
  const className = `richtext-${id}`;

  // Resolve color helper - uses CSS variables for theme values
  const resolveColor = (colorVal: ColorValue | undefined, cssVarFallback: string, defaultValue: string): string => {
    if (!colorVal) return cssVarFallback;
    if (colorVal.type === 'custom') return colorVal.value;

    const val = colorVal.value;
    if (val && (val.startsWith('#') || val.startsWith('rgb'))) return val;

    if (val) {
      if (val === 'components.richtext.colors.default') {
        return 'var(--component-richtext-color-default, ' + defaultValue + ')';
      }
      return resolve(val, defaultValue);
    }

    return defaultValue;
  };

  // Resolve colors
  const resolvedColor = resolveColor(
    color,
    'var(--component-richtext-color-default, inherit)',
    'inherit'
  );
  const resolvedBgColor = resolveColor(backgroundColor, 'transparent', 'transparent');

  // Build CSS using the shared CSS builder
  const css = buildTypographyCSS({
    className,
    display,
    width,
    maxWidth,
    maxHeight,
    padding,
    margin,
    border,
    borderRadius,
    shadow,
    color: resolvedColor,
    backgroundColor: resolvedBgColor,
    fontFamily,
    visibility,
  });

  // RichText typography CSS - explicit styles that work without Tailwind
  // These override Tailwind's base resets in editor and work standalone on storefront
  const richTextTypographyCSS = `
    .${className} h2 { font-size: 1.5rem; font-weight: 700; margin: 1.5rem 0 0.75rem; line-height: 1.3; }
    .${className} h3 { font-size: 1.25rem; font-weight: 600; margin: 1.25rem 0 0.5rem; line-height: 1.4; }
    .${className} h4 { font-size: 1.125rem; font-weight: 600; margin: 1rem 0 0.5rem; line-height: 1.4; }
    .${className} p { margin: 0 0 1rem; line-height: 1.7; }
    .${className} ul { list-style-type: disc; padding-left: 1.5rem; margin: 0 0 1rem; }
    .${className} ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0 0 1rem; }
    .${className} li { margin: 0.25rem 0; line-height: 1.7; }
    .${className} li > ul, .${className} li > ol { margin: 0.5rem 0; }
    .${className} strong { font-weight: 700; }
    .${className} em { font-style: italic; }
    .${className} u { text-decoration: underline; }
    .${className} s { text-decoration: line-through; }
    .${className} a { color: var(--color-primary-500, #3b82f6); text-decoration: underline; }
    .${className} a:hover { text-decoration: none; }
    .${className} blockquote { border-left: 4px solid var(--color-gray-300, #d1d5db); padding-left: 1rem; margin: 1rem 0; font-style: italic; }
    .${className} code { background: var(--color-gray-100, #f3f4f6); padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-family: var(--font-family-mono, monospace); font-size: 0.875em; }
    .${className} pre { background: var(--color-gray-100, #f3f4f6); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 1rem 0; }
    .${className} pre code { background: none; padding: 0; }
  `.trim();

  // Render content - richtext field returns React elements in editor
  // When stored/loaded, it may be a string (HTML)
  const renderContent = () => {
    if (typeof content === 'string') {
      // Stored HTML string - render with dangerouslySetInnerHTML
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }
    // React element from richtext field - render directly
    return content;
  };

  return (
    <>
      {/* Only inject runtime CSS in edit mode - storefront uses pre-generated CSS from file */}
      {isEditing && <style>{css}</style>}
      {isEditing && <style>{richTextTypographyCSS}</style>}
      <div
        ref={puck?.dragRef}
        className={className}
      >
        {renderContent()}
      </div>
      {customCss && <style>{customCss}</style>}
    </>
  );
}

// Component configuration using organized field groups
export const RichText: ComponentConfig<RichTextProps> = {
  label: 'Rich Text',

  fields: {
    // Content - Using Puck's native richtext field with inline editing
    content: {
      type: 'richtext',
      label: 'Content',
      contentEditable: true, // Enable inline editing
      options: {
        // Restrict headings to h2, h3, h4 (h1 reserved for Heading component)
        heading: { levels: [2, 3, 4] },
        // All other extensions enabled by default:
        // bold, italic, underline, strike, link, bulletList, orderedList
      },
    },
    // Layout
    ...displayField,
    ...layoutFields,
    ...layoutAdvancedFields,
    // Typography
    ...textColorField,
    ...fontFamilyField('sans'),
    // Spacing
    ...spacingFields,
    // Background
    ...backgroundFields,
    // Effects
    ...effectsFields,
    // Advanced
    ...advancedFields,
  },

  defaultProps: {
    content: '<h2>Rich Text Heading</h2><p>Start writing your content here. You can use <strong>bold</strong>, <em>italic</em>, and <u>underline</u> formatting.</p><ul><li>Create bullet lists</li><li>Add numbered lists</li><li>Insert links and more</li></ul><p>Click anywhere to edit this content inline!</p>',
    ...extractDefaults(
      displayField,
      layoutFields,
      textColorField,
      fontFamilyField('sans'),
      layoutAdvancedFields,
      spacingFields,
      backgroundFields,
      effectsFields,
      advancedFields
    ),
    // Override specific defaults for RichText
    color: { type: 'theme', value: 'components.richtext.colors.default' },
  },

  render: (props) => <RichTextComponent {...props} />,
};
