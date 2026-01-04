import { render } from '@testing-library/react';
import { ReactElement } from 'react';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';

/**
 * Test wrapper that provides ThemeProvider for components that depend on theme
 */
export function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}
