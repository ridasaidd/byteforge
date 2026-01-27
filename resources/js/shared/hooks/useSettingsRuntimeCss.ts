import { useEffect, useMemo } from 'react';
import { generateThemeStepCss } from '@/shared/puck/services/ThemeStepCssGenerator';
import type { ThemeData } from '@/shared/services/api/types';

interface UseSettingsRuntimeCssOptions {
  themeData: Partial<ThemeData>;
  enabled?: boolean;
}

/**
 * Injects runtime CSS variables into the editor <body> for live preview
 * Overrides the base CSS variables from disk (in <head>)
 *
 * Pattern: Same as usePuckRuntimeCss but for settings
 * - Base CSS from disk loads in <head> (useEditorCssLoader)
 * - Runtime CSS injects in <body> (this hook)
 * - Body CSS wins cascade → instant preview without saving
 */
export function useSettingsRuntimeCss({ themeData, enabled = true }: UseSettingsRuntimeCssOptions) {
  // Stabilize themeData by serializing - only update when actual values change
  const themeDataJson = useMemo(() => JSON.stringify(themeData), [themeData]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const styleId = 'runtime-settings-css';
    let styleTag = document.getElementById(styleId) as HTMLStyleElement;

    try {
      const parsedThemeData = JSON.parse(themeDataJson);

      // Generate CSS variables from current settings
      const css = generateThemeStepCss('settings', { themeData: parsedThemeData as ThemeData });

      // Create or update style tag in <body>
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        styleTag.setAttribute('data-source', 'runtime-settings');
        document.body.appendChild(styleTag);
        console.log('[useSettingsRuntimeCss] Created style tag in body');
      }

      styleTag.textContent = css;
      console.log(`[useSettingsRuntimeCss] Updated ${css.length} bytes of CSS variables`);
    } catch (err) {
      console.error('[useSettingsRuntimeCss] Error generating CSS:', err);
    }

    // Cleanup only on unmount (not on every update)
    return () => {
      if (!enabled) {
        const tag = document.getElementById(styleId);
        if (tag) {
          tag.remove();
          console.log('[useSettingsRuntimeCss] Cleaned up runtime CSS');
        }
      }
    };
  }, [themeDataJson, enabled]);
}

