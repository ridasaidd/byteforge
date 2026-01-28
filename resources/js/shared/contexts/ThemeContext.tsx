import React, { useEffect, useState } from 'react';
import { ThemeContext } from './theme-context';
import { themes } from '@/shared/services/api/themes';
import type { Theme } from '@/shared/services/api/types';

interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: Theme | null; // Accept pre-loaded theme from metadata
  injectCss?: boolean; // Whether to inject CSS dynamically (for editor/builder only)
}

export function ThemeProvider({ children, initialTheme, injectCss = false }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme | null>(initialTheme || null);
  const [isLoading, setIsLoading] = useState(!initialTheme); // Skip loading if theme provided
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
    // Only fetch theme if not provided via initialTheme (metadata)
    if (!initialTheme) {
      loadActiveTheme();
    }
  }, [initialTheme]);

  /**
   * Inject theme CSS file into the document head.
   * This is called whenever the active theme changes.
   * Uses cache-busting version parameter to ensure latest CSS is loaded.
   * Only runs when injectCss=true (for editor/builder pages where theme can change dynamically).
   * Public storefront should have CSS hardcoded in blade template.
   */
  useEffect(() => {
    // Skip CSS injection on public pages (blade template already has <link> tag)
    if (!injectCss || !theme?.id) return;

    // Prefer backend-provided URL if present; fallback to nested path
    const baseUrl = (theme as any).css_url || `/storage/themes/${theme.id}/${theme.id}.css`;
    const version = (theme as any).css_version || new Date().getTime();
    // Remove existing query params to avoid double version parameter
    const cleanUrl = baseUrl.split('?')[0];
    const cssUrl = `${cleanUrl}?v=${version}`;

    // Find or create a link element for theme CSS
    let themeLink = document.getElementById('theme-css-link') as HTMLLinkElement | null;

    if (!themeLink) {
      // Create new link element
      themeLink = document.createElement('link');
      themeLink.id = 'theme-css-link';
      themeLink.rel = 'stylesheet';
      document.head.appendChild(themeLink);
    }

    // Update the href to the theme CSS file
    themeLink.href = cssUrl;
  }, [injectCss, theme?.id]);

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

