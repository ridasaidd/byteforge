import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { clearAuthToken, getAuthToken, setAuthToken } from './tokenStorage';
import i18n from '@/i18n';

export type AuthRequestConfig = AxiosRequestConfig & {
  skipAuthRedirect?: boolean;
  skipAuthRefresh?: boolean;
  skipAuthToken?: boolean;
  _authRetried?: boolean;
};

class HttpService {
  private client: AxiosInstance;
  private refreshPromise: Promise<string | null> | null = null;

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
        const authConfig = config as AuthRequestConfig;
        const token = getAuthToken();

        if (token && !authConfig.skipAuthToken) {
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
      async (error) => {
        const status = error.response?.status;
        const authConfig = (error.config ?? {}) as AuthRequestConfig;

        if (status === 401 && this.shouldAttemptSilentRefresh(authConfig)) {
          const refreshedToken = await this.refreshAccessToken();

          if (refreshedToken) {
            authConfig._authRetried = true;
            authConfig.headers = authConfig.headers ?? {};
            authConfig.headers.Authorization = `Bearer ${refreshedToken}`;

            return this.client(authConfig);
          }
        }

        if (status === 401) {
          clearAuthToken();

          if (!authConfig.skipAuthRedirect && typeof window !== 'undefined') {
            const loginUrl = '/login';
            const alreadyOnLogin = window.location.pathname === loginUrl;

            if (!alreadyOnLogin) {
              window.location.href = loginUrl;
            }
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private shouldAttemptSilentRefresh(config: AuthRequestConfig): boolean {
    return !config.skipAuthRefresh
      && !config._authRetried
      && !this.isRefreshRequest(config.url);
  }

  private isRefreshRequest(url?: string): boolean {
    return typeof url === 'string' && url.includes('/auth/refresh');
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.client.post<{ token: string }>('/auth/refresh', undefined, {
      skipAuthRefresh: true,
      skipAuthRedirect: true,
      skipAuthToken: true,
    } as AuthRequestConfig)
      .then((response) => {
        setAuthToken(response.data.token);
        return response.data.token;
      })
      .catch(() => {
        clearAuthToken();
        return null;
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  async get<T>(url: string, config?: AuthRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AuthRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AuthRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AuthRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AuthRequestConfig): Promise<T> {
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
