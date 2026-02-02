/**
 * Shared Puck Configuration
 *
 * Puck editor configuration shared between central and tenant apps.
 * Both apps can import this config and optionally extend it.
 */

import React from 'react';
import { Config } from '@puckeditor/core';
import {
  // Layout
  Box,
  // Content
  Heading,
  Text,
  RichText,
  Button,
  Image,
  Card,
  Link,
  // Navigation
  Navigation,
  // Forms
  Form,
  TextInput,
  Textarea,
  Select,
  Checkbox,
  RadioGroup,
  SubmitButton,
} from '../components';

/**
 * Base Puck configuration with all shared components
 */
export const puckConfig: Config = {
  components: {
    // Layout Components
    Box: Box as Config['components'][string],

    // Cards
    Card: Card as Config['components'][string],

    // Navigation
    Navigation: Navigation as Config['components'][string],

    // Content Components
    Heading: Heading as Config['components'][string],
    Text: Text as Config['components'][string],
    RichText: RichText as Config['components'][string],
    Button: Button as Config['components'][string],
    Link: Link as Config['components'][string],
    Image: Image as Config['components'][string],

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
    navigation: {
      components: ['Navigation'],
      title: 'Navigation',
      defaultExpanded: false,
    },
    content: {
      components: ['Heading', 'Text', 'RichText', 'Button', 'Link', 'Image'],
      title: 'Content',
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
      backgroundColor: {
        type: 'text',
        label: 'Background Color',
      },
      backgroundImage: {
        type: 'text',
        label: 'Background Image URL',
      },
      maxWidth: {
        type: 'select',
        label: 'Max Width',
        options: [
          { label: 'Full', value: '100%' },
          { label: '1280px', value: '1280px' },
          { label: '1024px', value: '1024px' },
          { label: '768px', value: '768px' },
        ],
      },
      paddingY: {
        type: 'select',
        label: 'Vertical Padding',
        options: [
          { label: 'None', value: '0' },
          { label: 'Small', value: '24px' },
          { label: 'Medium', value: '48px' },
          { label: 'Large', value: '80px' },
        ],
      },
    },
    defaultProps: {
      backgroundColor: '#ffffff',
      maxWidth: '100%',
      paddingY: '0',
    },
    render: ({ children, backgroundColor, backgroundImage, maxWidth, paddingY }: {
      children: React.ReactNode;
      backgroundColor?: string;
      backgroundImage?: string;
      maxWidth?: string;
      paddingY?: string;
    }) => {
      return (
        <div
          style={{
            backgroundColor,
            backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '100vh',
          }}
        >
          <div
            style={{
              maxWidth,
              margin: '0 auto',
              paddingTop: paddingY,
              paddingBottom: paddingY,
            }}
          >
            {children}
          </div>
        </div>
      );
    },
  },
};

export default puckConfig;
