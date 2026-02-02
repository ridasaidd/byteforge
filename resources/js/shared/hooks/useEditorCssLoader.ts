import { useEffect, useState, useCallback } from 'react';

interface UseEditorCssLoaderOptions {
  themeId: number | string | undefined | null;
  section: 'header' | 'footer' | 'settings' | 'theme';
  enabled?: boolean;
  refreshTrigger?: number; // Increment this to force reload
}

/**
 * Custom hook to load pre-generated CSS files into the editor's <head> tag
 * for providing base styles that component edits can cascade over.
 *
 * Follows CSS cascade pattern:
 * - Base CSS from file (in <head>) loads first
 * - Component runtime CSS (in <body>) loads after
 * - Runtime CSS wins due to cascade, enabling live preview
 * - On save, entire CSS file is regenerated from Puck JSON (no bloat)
 */
export function useEditorCssLoader({ themeId, section, enabled = true, refreshTrigger }: UseEditorCssLoaderOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cssContent, setCssContent] = useState<string>('');

  const loadCss = useCallback(async () => {
    if (!enabled || !themeId) {
      return;
    }

    const styleId = `editor-${section}-css`;
    let styleTag = document.getElementById(styleId) as HTMLStyleElement;

    try {
      setIsLoading(true);
      setError(null);

      // Construct CSS file URL based on section
      // 'theme' section means loading the main compiled css which includes everything
      const cssFileName = section === 'settings'
        ? `${themeId}_variables.css`
        : section === 'theme'
          ? `${themeId}.css`
          : `${themeId}_${section}.css`;

      // Add cache-busting timestamp to force reload
      const timestamp = Date.now();
      const cssUrl = `/storage/themes/${themeId}/${cssFileName}?v=${timestamp}`;

      const response = await fetch(cssUrl, { cache: 'no-store' });

      if (!response.ok) {
        if (response.status === 404) {
          // CSS file doesn't exist yet - this is OK for new themes
          console.log(`[useEditorCssLoader] CSS file not found: ${cssUrl}`);
          setCssContent('');
          if (styleTag) {
            styleTag.textContent = '';
          }
          return;
        }
        throw new Error(`Failed to load CSS: ${response.status} ${response.statusText}`);
      }

      const css = await response.text();
      setCssContent(css);

      // Create or update style tag in <head>
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        styleTag.setAttribute('data-source', 'editor-css-loader');
        document.head.appendChild(styleTag);
      }

      styleTag.textContent = css;
      console.log(`[useEditorCssLoader] Loaded ${css.length} bytes of CSS for ${section} (timestamp: ${timestamp})`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[useEditorCssLoader] Error loading CSS for ${section}:`, err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [themeId, section, enabled]);

  useEffect(() => {
    loadCss();

    // Cleanup: remove style tag when component unmounts
    return () => {
      const styleId = `editor-${section}-css`;
      const tag = document.getElementById(styleId);
      if (tag) {
        tag.remove();
        console.log(`[useEditorCssLoader] Cleaned up CSS for ${section}`);
      }
    };
  }, [loadCss, section, refreshTrigger]); // Add refreshTrigger to dependencies

  return {
    isLoading,
    error,
    cssContent,
    reload: loadCss, // Expose reload function for manual refresh
  };
}
