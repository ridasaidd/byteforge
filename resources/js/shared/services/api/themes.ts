import { http } from '../http';
import type { Theme, AvailableTheme, ThemeData, ActivateThemeData, CreateThemeData, UpdateThemeData, DuplicateThemeData, PageTemplate } from './types';

export const themes = {
  /** Get active theme */
  active: () => http.get<{ data: Theme }>('/superadmin/themes/active'),

  /** List installed themes */
  list: () => http.get<{ data: Theme[] }>('/superadmin/themes'),

  /** Get specific theme */
  get: (id: number) => http.get<{ data: Theme }>(`/superadmin/themes/${id}`),

  /** Create a new theme */
  create: (data: CreateThemeData) => http.post<{ data: Theme; message: string }>('/superadmin/themes', data),

  /** Activate a theme */
  activate: (data: ActivateThemeData) => http.post<{ data: Theme; message: string }>('/superadmin/themes/activate', data),

  /** Update theme customizations */
  update: (id: number, data: UpdateThemeData) => http.put<{ data: Theme; message: string }>(`/superadmin/themes/${id}`, data),

  /** Reset theme to base */
  reset: (id: number) => http.post<{ data: Theme; message: string }>(`/superadmin/themes/${id}/reset`),

  /** Duplicate theme */
  duplicate: (id: number, data: DuplicateThemeData) => http.post<{ data: Theme; message: string }>(`/superadmin/themes/${id}/duplicate`, data),

  /** Delete theme */
  delete: (id: number) => http.delete<{ message: string }>(`/superadmin/themes/${id}`),

  /** Export theme */
  export: (id: number) => http.get<ThemeData>(`/superadmin/themes/${id}/export`),

  /** Import theme */
  import: (file: File) => {
    const formData = new FormData();
    formData.append('theme', file);
    return http.post<{ data: Theme; message: string }>('/superadmin/themes/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** Get templates from active theme */
  getActiveTemplates: () => http.get<{ data: PageTemplate[] }>('/superadmin/themes/active/templates'),

  /** Get templates from specific theme */
  getTemplates: (slug: string) => http.get<{ data: PageTemplate[] }>(`/superadmin/themes/${slug}/templates`),
};
