import React, { useEffect, useState } from 'react';
import { ThemeContext } from './theme-context';
import { themes } from '@/shared/services/api/themes';
import type { Theme } from '@/shared/services/api/types';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadActiveTheme = async () => {
    try {
      setIsLoading(true);
      setError(null);
  const response = await themes.active();
      setTheme(response.data);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load active theme:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActiveTheme();
  }, []);

  /**
   * Resolve a theme value using dot notation.
   * Handles recursive references (e.g., "colors.primary.600" references).
   */
  const resolve = (path: string, defaultValue: string = ''): string => {
    if (!theme?.theme_data) return defaultValue;

    const keys = path.split('.');
    let value: unknown = theme.theme_data;

    for (const key of keys) {
      if (typeof value !== 'object' || value === null || !(key in value)) {
        return defaultValue;
      }
      value = (value as Record<string, unknown>)[key];
    }

    // If value is a string that looks like a reference, resolve it recursively
    if (typeof value === 'string' && value.includes('.') && !isActualValue(value)) {
      return resolve(value, defaultValue);
    }

    return typeof value === 'string' ? value : defaultValue;
  };

  /**
   * Check if a string is an actual value (not a reference).
   */
  const isActualValue = (value: string): boolean => {
    // Check if it's a color (hex), size (with units), or other actual value
    return (
      /^#[0-9a-fA-F]{3,8}$/.test(value) || // Hex color
      /^\d+(\.\d+)?(px|rem|em|%|vh|vw)$/.test(value) || // Size with unit
      ['transparent', 'none', 'inherit', 'auto', 'initial', 'unset'].includes(value)
    );
  };

  const refresh = async () => {
    await loadActiveTheme();
  };

  return (
    <ThemeContext.Provider value={{ theme, isLoading, error, resolve, refresh }}>
      {children}
    </ThemeContext.Provider>
  );
}

