import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { clearAuthToken, getAuthToken } from './tokenStorage';
import i18n from '@/i18n';

class HttpService {
  private client: AxiosInstance;

  constructor() {
    // Use full URL for tests (set via global), relative path for production
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseURL = (globalThis as any).__API_BASE_URL__ || '/api';

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      // withCredentials intentionally omitted: auth is Bearer token only.
      // Enabling it alongside Bearer headers creates mixed trust boundaries.
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        const locale = i18n.resolvedLanguage || i18n.language;
        if (locale) {
          config.headers['Accept-Language'] = locale;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login.
          // Resolve the login URL from VITE_CENTRAL_URL so tenant apps (which run
          // on a different subdomain/domain) redirect to the central login page
          // rather than a non-existent /login on the tenant domain.
          clearAuthToken();

          if (typeof window !== 'undefined') {
            const centralUrl = (import.meta as unknown as { env?: { VITE_CENTRAL_URL?: string } }).env?.VITE_CENTRAL_URL;
            const loginUrl = centralUrl ? `${centralUrl}/login` : '/login';

            // Use pathname comparison for relative loginUrl (/login) and
            // full href comparison for absolute central URLs, so we never
            // redirect when already on the login page.
            const alreadyOnLogin = centralUrl
              ? window.location.href.startsWith(loginUrl)
              : window.location.pathname === '/login';

            if (!alreadyOnLogin) {
              window.location.href = loginUrl;
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }

  // CRUD helper methods
  async getAll<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
    return this.get<T>(endpoint, { params });
  }

  async getOne<T>(endpoint: string, id: string | number): Promise<T> {
    return this.get<T>(`${endpoint}/${id}`);
  }

  async create<T>(endpoint: string, data: unknown): Promise<T> {
    return this.post<T>(endpoint, data);
  }

  async update<T>(endpoint: string, id: string | number, data: unknown): Promise<T> {
    return this.put<T>(`${endpoint}/${id}`, data);
  }

  async remove<T>(endpoint: string, id: string | number): Promise<T> {
    return this.delete<T>(`${endpoint}/${id}`);
  }
}

export const http = new HttpService();
