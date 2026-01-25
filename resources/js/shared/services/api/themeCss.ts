import { http } from '../http';

export interface PublishValidationResult {
  valid: boolean;
  missing: string[];
}

export interface PublishResult {
  cssUrl: string;
}

/**
 * Theme CSS API client
 * Provides methods for interacting with theme CSS endpoints
 */
export const themeCssApi = {
  /**
   * Save CSS for a theme section
   * @param themeId - Theme ID
   * @param section - Section name (e.g., 'variables', 'header', 'footer')
   * @param css - CSS content to save
   */
  async saveSection(themeId: number, section: string, css: string): Promise<void> {
    await http.post(`/superadmin/themes/${themeId}/sections/${section}`, { css });
  },

  /**
   * Get CSS for a theme section
   * @param themeId - Theme ID
   * @param section - Section name
   * @returns CSS content or null if section doesn't exist
   */
  async getSection(themeId: number, section: string): Promise<string | null> {
    const response = await http.get<{ css: string }>(`/superadmin/themes/${themeId}/sections/${section}`);
    return response.css || null;
  },

  /**
   * Validate that all required sections exist before publishing
   * @param themeId - Theme ID
   * @returns Validation result with valid flag and list of missing sections
   */
  async validatePublish(themeId: number): Promise<PublishValidationResult> {
    return await http.get<PublishValidationResult>(`/superadmin/themes/${themeId}/publish/validate`);
  },

  /**
   * Publish theme: merge all sections into master CSS file
   * @param themeId - Theme ID
   * @returns Published CSS URL with cache-bust query parameter
   */
  async publish(themeId: number): Promise<PublishResult> {
    return await http.post<PublishResult>(`/superadmin/themes/${themeId}/publish`);
  },
};
