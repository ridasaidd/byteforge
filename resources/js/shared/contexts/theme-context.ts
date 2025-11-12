import { createContext } from 'react';
import type { Theme } from '@/shared/services/api/types';

export interface ThemeContextValue {
  theme: Theme | null;
  isLoading: boolean;
  error: Error | null;
  resolve: (path: string, defaultValue?: string) => string;
  refresh: () => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
