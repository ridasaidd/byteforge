import { useState, useCallback } from 'react';
import { themeCssApi, type PublishValidationResult, type PublishResult } from '@/shared/services/api/themeCss';

/**
 * Hook for managing theme CSS section saves and publishing
 * Handles loading state, errors, and API interactions
 */
export function useThemeCssSectionSave() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Save CSS for a theme section
   * @param themeId - Theme ID
   * @param section - Section name (variables, header, footer, template-*)
   * @param css - CSS content to save
   */
  const saveSection = useCallback(
    async (themeId: number, section: string, css: string): Promise<void> => {
      try {
        setIsSaving(true);
        setError(null);
        await themeCssApi.saveSection(themeId, section, css);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  /**
   * Validate that all required sections exist before publishing
   * @param themeId - Theme ID
   * @returns Validation result with valid flag and missing sections
   */
  const validatePublish = useCallback(
    async (themeId: number): Promise<PublishValidationResult> => {
      try {
        setIsSaving(true);
        setError(null);
        return await themeCssApi.validatePublish(themeId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  /**
   * Publish theme: merge all sections and generate master CSS file
   * @param themeId - Theme ID
   * @returns Published CSS URL with cache-bust query parameter
   */
  const publish = useCallback(
    async (themeId: number): Promise<PublishResult> => {
      try {
        setIsSaving(true);
        setError(null);
        return await themeCssApi.publish(themeId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  return {
    isSaving,
    error,
    saveSection,
    validatePublish,
    publish,
  };
}
