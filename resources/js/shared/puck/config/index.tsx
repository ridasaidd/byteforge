/**
 * Shared Puck Configuration
 *
 * Puck editor configuration shared between central and tenant apps.
 * Both apps can import this config and optionally extend it.
 */

import { Config } from '@puckeditor/core';
import {
  // Layout
  Box,
  // Content
  Heading,
  Text as TextComponent,
  RichText,
  Button,
  Image,
  Card,
  Link,
  MechanicListing,
  // Media
  Icon,
  // Navigation
  NavigationMenu,
  // Forms
  Form,
  TextInput,
  Textarea,
  Select,
  Checkbox,
  RadioGroup,
  SubmitButton,
} from '../components';
import {
  backgroundFields,
  backgroundImageFields,
  fontFamilyField,
  textColorField,
  spacingFields,
} from '../fields';
import { RootRenderer } from './RootRenderer';

/**
 * Base Puck configuration with all shared components
 */
export const puckConfig: Config = {
  components: {
    // Layout Components
    Box: Box as Config['components'][string],

    // Cards
    Card: Card as Config['components'][string],

    // Mechanic Marketplace
    MechanicListing: MechanicListing as Config['components'][string],

    // Navigation
    NavigationMenu: NavigationMenu as Config['components'][string],

    // Content Components
    Heading: Heading as Config['components'][string],
    Text: TextComponent as Config['components'][string],
    RichText: RichText as Config['components'][string],
    Button: Button as Config['components'][string],
    Link: Link as Config['components'][string],
    Image: Image as Config['components'][string],

    // Media Components
    Icon: Icon as Config['components'][string],

    // Form Components
    Form: Form as Config['components'][string],
    TextInput: TextInput as Config['components'][string],
    Textarea: Textarea as Config['components'][string],
    Select: Select as Config['components'][string],
    Checkbox: Checkbox as Config['components'][string],
    RadioGroup: RadioGroup as Config['components'][string],
    SubmitButton: SubmitButton as Config['components'][string],
  },

  categories: {
    layout: {
      components: ['Box'],
      title: 'Layout',
      defaultExpanded: true,
    },
    cards: {
      components: ['Card'],
      title: 'Cards & Features',
      defaultExpanded: true,
    },
    marketplace: {
      components: ['MechanicListing'],
      title: 'Mechanic Marketplace',
      defaultExpanded: false,
    },
    navigation: {
      components: ['NavigationMenu'],
      title: 'Navigation',
      defaultExpanded: false,
    },
    content: {
      components: ['Heading', 'Text', 'RichText', 'Button', 'Link', 'Image'],
      title: 'Content',
      defaultExpanded: true,
    },
    media: {
      components: ['Icon'],
      title: 'Media',
      defaultExpanded: true,
    },
    forms: {
      components: ['Form', 'TextInput', 'Textarea', 'Select', 'Checkbox', 'RadioGroup', 'SubmitButton'],
      title: 'Forms',
      defaultExpanded: false,
    },
  },

  root: {
    fields: {
      // Background
      ...backgroundFields,
      ...backgroundImageFields,

      // Typography
      ...textColorField,
      ...fontFamilyField('sans'),

      // Layout
      maxWidth: {
        type: 'select' as const,
        label: 'Max Width',
        options: [
          { label: 'Full', value: '100%' },
          { label: '1440px', value: '1440px' },
          { label: '1280px', value: '1280px' },
          { label: '1024px', value: '1024px' },
          { label: '768px', value: '768px' },
        ],
      },
      minHeight: {
        type: 'select' as const,
        label: 'Min Height',
        options: [
          { label: 'Auto', value: 'auto' },
          { label: '100vh (Full Screen)', value: '100vh' },
          { label: '75vh', value: '75vh' },
          { label: '50vh', value: '50vh' },
        ],
      },

      // Spacing
      ...spacingFields,
    },
    defaultProps: {
      backgroundColor: { type: 'custom' as const, value: '#ffffff' },
      backgroundImage: '',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      color: { type: 'theme' as const, value: 'colors.foreground' },
      fontFamily: undefined,
      maxWidth: '100%',
      minHeight: 'auto',
      padding: {
        mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px' as const, linked: true },
      },
      margin: {
        mobile: { top: '0', right: '0', bottom: '0', left: '0', unit: 'px' as const, linked: true },
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: RootRenderer as any,
  },
};

export default puckConfig;
