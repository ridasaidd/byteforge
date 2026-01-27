import { useMemo } from 'react';
import { createUsePuck } from '@puckeditor/core';

/**
 * Custom hook to detect if we're currently in Puck edit mode.
 *
 * Detection strategy:
 * 1. Primary: Check Puck context via usePuck() appState
 * 2. Fallback: Check URL pathname for '/edit' segment
 *
 * This enables components to conditionally render CSS or features
 * only in edit mode, keeping storefront clean.
 *
 * @returns {boolean} True if in edit mode, false otherwise
 *
 * @example
 * ```tsx
 * const isEditing = usePuckEditMode();
 *
 * return (
 *   <div className={`component-${id}`}>
 *     {isEditing && <style>{runtimeCss}</style>}
 *     {children}
 *   </div>
 * );
 * ```
 */
export function usePuckEditMode(): boolean {
  // Create a memoized usePuck hook instance
  const usePuck = useMemo(() => createUsePuck(), []);

  // Try to get Puck appState (returns null if not in Puck context)
  let isEditingFromPuck = false;
  try {
    // Use selector to extract whole state object
    const state = usePuck((s) => s);
    // Check if we have appState - if yes, we're in Puck (edit mode)
    isEditingFromPuck = !!(state && state.appState);
  } catch {
    // Not in Puck context, will use fallback
    isEditingFromPuck = false;
  }

  if (isEditingFromPuck) {
    return true;
  }

  // Fallback detection: Check URL pathname
  // This handles cases where Puck context isn't available (e.g., SSR, initial render)
  if (typeof window !== 'undefined' && window.location) {
    return window.location.pathname.includes('/edit');
  }

  // Default: not in edit mode
  return false;
}
