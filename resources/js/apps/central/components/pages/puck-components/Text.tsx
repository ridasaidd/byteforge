import { ComponentConfig } from '@measured/puck';
import { useTheme } from '@/shared/hooks';

export interface TextProps {
  content: string;
  size: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  align: 'left' | 'center' | 'right' | 'justify';
  color: 'default' | 'muted' | 'primary' | 'secondary';
}

function TextComponent({ content, size, align, color }: TextProps) {
  const { resolve } = useTheme();

  // Get theme values
  const themeColor = resolve(`components.text.colors.${color}`);
  const fontSize = resolve(`typography.fontSize.${size}`);
  const lineHeight = resolve('typography.lineHeight.relaxed');

  const styles: React.CSSProperties = {
    color: themeColor,
    fontSize,
    lineHeight,
    textAlign: align,
    margin: 0,
  };

  return <p style={styles}>{content}</p>;
}

export const Text: ComponentConfig<TextProps> = {
  label: 'Text',
  fields: {
    content: {
      type: 'textarea',
      label: 'Text Content',
    },
    size: {
      type: 'select',
      label: 'Text Size',
      options: [
        { label: 'Extra Small', value: 'xs' },
        { label: 'Small', value: 'sm' },
        { label: 'Base', value: 'base' },
        { label: 'Large', value: 'lg' },
        { label: 'Extra Large', value: 'xl' },
      ],
    },
    align: {
      type: 'radio',
      label: 'Alignment',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
        { label: 'Justify', value: 'justify' },
      ],
    },
    color: {
      type: 'select',
      label: 'Color',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Muted', value: 'muted' },
        { label: 'Primary', value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
      ],
    },
  },
  defaultProps: {
    content: 'Enter your text here...',
    size: 'base',
    align: 'left',
    color: 'default',
  },
  render: (props) => <TextComponent {...props} />,
};
