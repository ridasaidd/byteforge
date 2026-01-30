import { ThemeBuilderPage } from './ThemeBuilderPage';

/**
 * Theme Customization Page Wrapper
 * 
 * This is a wrapper component that loads ThemeBuilderPage in "customize" mode,
 * which shows only the Settings, Header, and Footer tabs for customizing an
 * existing theme.
 */
export function ThemeCustomizePage() {
  return <ThemeBuilderPage mode="customize" />;
}

export default ThemeCustomizePage;
