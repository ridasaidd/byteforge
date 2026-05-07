/**
 * Shared Puck Components
 *
 * All Puck page builder components organized by category.
 * These components are shared between the central and tenant apps.
 */

// Layout Components
export {
  Box,
  type BoxProps,
} from './layout';

// Content Components
export {
  Heading,
  type HeadingProps,
  Text,
  type TextProps,
  RichText,
  type RichTextProps,
  Button,
  type ButtonProps,
  Image,
  type ImageProps,
  Card,
  type CardProps,
  Link,
  type LinkProps,
  MechanicListing,
  type MechanicListingProps,
} from './content';

// Media Components
export {
  Icon,
  type IconProps,
} from './media';

// Navigation Components
export {
    NavigationMenu,
    type NavigationMenuProps,
} from './navigation_v2';

// Form Components
export {
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
  type FormState,
  type FormContextValue,
} from './forms';

// Booking add-on components (conditionally registered in puckConfig when addon is active)
export { BookingWidget, PaymentWidget, type BookingWidgetProps, type PaymentWidgetProps } from './booking';

