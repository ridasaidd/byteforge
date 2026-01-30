import { http } from '../http';
import type { Data } from '@puckeditor/core';

interface ThemePlaceholder {
  id: number;
  theme_id: number;
  type: string;
  content: Data;
  created_at: string;
  updated_at: string;
}

export const themePlaceholders = {
  /**
   * Get all placeholders for a theme
   */
  list: (themeId: number | string) =>
    http.get<{ data: ThemePlaceholder[] }>(`/superadmin/themes/${themeId}/placeholders`),

  /**
   * Get specific placeholder section
   */
  get: (themeId: number | string, section: string) =>
    http.get<{ data: ThemePlaceholder }>(`/superadmin/themes/${themeId}/placeholders/${section}`),

  /**
   * Save placeholder section
   */
  save: (themeId: number | string, section: string, content: Data) =>
    http.post<{ data: ThemePlaceholder; message: string }>(
      `/superadmin/themes/${themeId}/placeholders/${section}`,
      { content }
    ),

  /**
   * Delete placeholder section
   */
  delete: (themeId: number | string, section: string) =>
    http.remove<{ message: string }>(`/superadmin/themes/${themeId}/placeholders/${section}`),
};
