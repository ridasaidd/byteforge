import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

class HttpService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: true, // For Laravel Sanctum/Passport
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
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
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
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
