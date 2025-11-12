import { http } from '../http';

export interface MenuItem {
  id: string;
  label: string;
  url?: string;
  page_id?: number;
  target?: '_blank' | '_self';
  parent_id?: string | null;
  order: number;
  children?: MenuItem[];
}

export interface Navigation {
  id: number;
  tenant_id: string | null;
  name: string;
  slug: string;
  structure: MenuItem[];
  status: 'draft' | 'published';
  sort_order: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface CreateNavigationData {
  name: string;
  slug: string;
  structure?: MenuItem[];
  status?: 'draft' | 'published';
  sort_order?: number;
}

export interface UpdateNavigationData {
  name?: string;
  slug?: string;
  structure?: MenuItem[];
  status?: 'draft' | 'published';
  sort_order?: number;
}

export const navigations = {
  list: async (filters?: { status?: string }) => {
    const response = await http.get<{ data: Navigation[] }>('/superadmin/navigations', filters as Record<string, string>);
    return response;
  },

  get: async (id: number) => {
    const response = await http.get<{ data: Navigation }>(`/superadmin/navigations/${id}`);
    return response;
  },

  create: async (data: CreateNavigationData) => {
    const response = await http.post<{ message: string; data: Navigation }>('/superadmin/navigations', data);
    return response;
  },

  update: async (id: number, data: UpdateNavigationData) => {
    const response = await http.put<{ message: string; data: Navigation }>(`/superadmin/navigations/${id}`, data);
    return response;
  },

  delete: async (id: number) => {
    const response = await http.delete<{ message: string }>(`/superadmin/navigations/${id}`);
    return response;
  },
};

