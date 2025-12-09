import React from 'react';
import { Config, ComponentConfig } from '@measured/puck';
import { Button, ButtonProps } from './Button';
import { Container, ContainerProps } from './Container';
import { Section, SectionProps } from './Section';
import { Columns, ColumnsProps } from './Columns';
import { Heading, HeadingProps } from './Heading';
import { Text, TextProps } from './Text';
import { Image, ImageProps } from './Image';
import { Flex, FlexProps } from './Flex';
import { Hero, HeroProps } from './Hero';
import { Card, CardProps } from './Card';
import { Navigation, NavigationProps } from './Navigation';

// Export all component props types
export type { ButtonProps, ContainerProps, SectionProps, ColumnsProps, HeadingProps, TextProps, ImageProps, FlexProps, HeroProps, CardProps, NavigationProps };

// Root props interface
interface RootProps {
  children: React.ReactNode;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  paddingY?: string;
  maxWidth?: string;
  customCss?: string;
}

// Puck configuration
export const config: Config = {
  components: {
    // Layout Components
    Section,
    Container,
    Columns,
    Flex,

    // Hero & Cards
    Hero,
    Card,

    // Navigation
    Navigation,

    // Content Components
    Heading,
    Text,
    Button,
    Image,
  },
  categories: {
    layout: {
      components: ['Section', 'Container', 'Columns', 'Flex'],
      title: 'Layout',
      defaultExpanded: true,
    },
    hero: {
      components: ['Hero'],
      title: 'Hero',
      defaultExpanded: true,
    },
    cards: {
      components: ['Card'],
      title: 'Cards & Features',
      defaultExpanded: true,
    },
    navigation: {
      components: ['Navigation'],
      title: 'Navigation',
      defaultExpanded: true,
    },
    content: {
      components: ['Heading', 'Text', 'Button', 'Image'],
      title: 'Content',
      defaultExpanded: true,
    },
  },
  root: {
    fields: {
      backgroundColor: {
        type: 'select',
        label: 'Background Color',
        options: [
          { label: 'White', value: 'white' },
          { label: 'Light Gray', value: 'gray-50' },
          { label: 'Gray', value: 'gray-100' },
          { label: 'Primary Light', value: 'primary-50' },
          { label: 'Primary', value: 'primary-100' },
          { label: 'Secondary Light', value: 'secondary-50' },
          { label: 'Secondary', value: 'secondary-100' },
        ],
      },
      backgroundImage: {
        type: 'text',
        label: 'Background Image URL',
      },
      backgroundSize: {
        type: 'radio',
        label: 'Background Size',
        options: [
          { label: 'Cover', value: 'cover' },
          { label: 'Contain', value: 'contain' },
          { label: 'Auto', value: 'auto' },
        ],
      },
      backgroundPosition: {
        type: 'select',
        label: 'Background Position',
        options: [
          { label: 'Center', value: 'center' },
          { label: 'Top', value: 'top' },
          { label: 'Bottom', value: 'bottom' },
          { label: 'Left', value: 'left' },
          { label: 'Right', value: 'right' },
        ],
      },
      backgroundRepeat: {
        type: 'radio',
        label: 'Background Repeat',
        options: [
          { label: 'No Repeat', value: 'no-repeat' },
          { label: 'Repeat', value: 'repeat' },
          { label: 'Repeat X', value: 'repeat-x' },
          { label: 'Repeat Y', value: 'repeat-y' },
        ],
      },
      paddingY: {
        type: 'select',
        label: 'Vertical Padding',
        options: [
          { label: 'None', value: 'none' },
          { label: 'Small', value: 'sm' },
          { label: 'Medium', value: 'md' },
          { label: 'Large', value: 'lg' },
          { label: 'Extra Large', value: 'xl' },
        ],
      },
      maxWidth: {
        type: 'select',
        label: 'Max Width',
        options: [
          { label: 'Full Width', value: 'full' },
          { label: 'Small (640px)', value: 'sm' },
          { label: 'Medium (768px)', value: 'md' },
          { label: 'Large (1024px)', value: 'lg' },
          { label: 'Extra Large (1280px)', value: 'xl' },
          { label: '2XL (1536px)', value: '2xl' },
        ],
      },
      customCss: {
        type: 'textarea',
        label: 'Custom CSS',
      },
    },
    defaultProps: {
      backgroundColor: 'white',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      paddingY: 'none',
      maxWidth: 'full',
    },
    render: ({ children, backgroundColor, backgroundImage, backgroundSize, backgroundPosition, backgroundRepeat, paddingY, maxWidth, customCss }: RootProps) => {
      // Map values to actual CSS
      const paddingMap = {
        none: '0',
        sm: '2rem',
        md: '4rem',
        lg: '6rem',
        xl: '8rem',
      };

      const maxWidthMap = {
        full: '100%',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      };

      // Resolve background color from theme (if using theme colors)
      const bgColorMap: Record<string, string> = {
        'white': '#ffffff',
        'gray-50': '#f9fafb',
        'gray-100': '#f3f4f6',
        'primary-50': '#eff6ff',
        'primary-100': '#dbeafe',
        'secondary-50': '#f9fafb',
        'secondary-100': '#f3f4f6',
      };

      const styles: React.CSSProperties = {
        backgroundColor: bgColorMap[backgroundColor as string] || backgroundColor,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize,
        backgroundPosition,
        backgroundRepeat,
        paddingTop: paddingMap[paddingY as keyof typeof paddingMap],
        paddingBottom: paddingMap[paddingY as keyof typeof paddingMap],
        minHeight: '100vh',
      };

      const containerStyles: React.CSSProperties = {
        maxWidth: maxWidthMap[maxWidth as keyof typeof maxWidthMap],
        margin: '0 auto',
        width: '100%',
      };

      return (
        <div style={styles}>
          <div style={containerStyles}>
            {children}
          </div>
          {customCss && <style>{customCss}</style>}
        </div>
      );
    },
  },
};
