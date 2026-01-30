/**
 * Phase 6: Theme Customization API Client
 *
 * Provides methods for saving and retrieving customized theme sections:
 * - Settings: CSS variables and theme configuration
 * - Header: CSS and Puck editor data
 * - Footer: CSS and Puck editor data
 */

import { http } from '../http';
import type { Data } from '@puckeditor/core';

interface CustomizationData {
  theme_data: Record<string, unknown> | null;
  settings_css: string | null;
  header_css: string | null;
  footer_css: string | null;
  header_data: Data | null;
  footer_data: Data | null;
}

interface SaveSectionData {
  css?: string | null;
  puck_data?: Data;
  theme_data?: Record<string, unknown>;
}

export const themeCustomization = {
  /**
   * Get all customization data for a theme (theme_data, CSS, header/footer content)
   */
  getCustomization: (themeId: number) =>
    http.get<{ data: CustomizationData }>(`/themes/${themeId}/customization`),

  /**
   * Save customization for a specific section
   *
   * @param themeId - The theme ID
   * @param section - The section to save ('settings', 'header', or 'footer')
   * @param data - The customization data (css, puck_data, theme_data)
   */
  saveSection: (themeId: number, section: 'settings' | 'header' | 'footer', data: SaveSectionData) =>
    http.post<{ data: Record<string, unknown>; message: string }>(
      `/themes/${themeId}/customization/${section}`,
      data,
    ),
};
