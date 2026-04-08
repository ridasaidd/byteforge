/**
 * Puck Components - Central App
 *
 * This file re-exports from the shared puck module.
 * All components are now in @/shared/puck for reuse across apps.
 */

// Re-export everything from shared puck components
export {
  // Layout
  Box,
  type BoxProps,
  // Content
  Heading,
  type HeadingProps,
  Text,
  type TextProps,
  Button,
  type ButtonProps,
  Image,
  type ImageProps,
  Card,
  type CardProps,
  // Navigation
  NavigationMenu,
  type NavigationMenuProps,
  // Forms
  Form,
  type FormProps,
  TextInput,
  type TextInputProps,
  Textarea,
  type TextareaProps,
  Select,
  type SelectProps,
  Checkbox,
  type CheckboxProps,
  RadioGroup,
  type RadioGroupProps,
  SubmitButton,
  type SubmitButtonProps,
  FormProvider,
  useFormContext,
  useFormField,
} from '@/shared/puck/components';

// Re-export fields
export * from '@/shared/puck/fields';

// Re-export control presets
export * from '@/shared/puck/controlPresets';

// Import config from shared and build renderer config
// BookingWidget is always registered in the renderer so pages containing it
// can render correctly on the storefront — the addon gate only belongs in
// the editor sidebar (PageEditorPage.tsx), not in the renderer.
import { puckConfig } from '@/shared/puck/config';
import { BookingWidget } from '@/shared/puck/components/booking';
import type { Config } from '@puckeditor/core';

const rendererConfig: Config = {
  ...puckConfig,
  components: {
    ...puckConfig.components,
    BookingWidget: BookingWidget as Config['components'][string],
  },
};

export { rendererConfig as config };
export default rendererConfig;
