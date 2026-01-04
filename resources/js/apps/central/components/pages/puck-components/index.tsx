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
  Navigation,
  type NavigationProps,
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

// Import config from shared and re-export
import { puckConfig } from '@/shared/puck/config';
export { puckConfig as config };
export default puckConfig;
