import { http } from './http';
import type { User } from '../types';
import { clearAuthToken, getAuthToken, setAuthToken } from './tokenStorage';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  token: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await http.post<LoginResponse>('/auth/login', credentials);

    setAuthToken(response.token);

    return response;
  },

  async logout(): Promise<void> {
    try {
      await http.post('/auth/logout');
    } finally {
      // Always clear auth token even if API call fails
      clearAuthToken();
      window.location.href = '/login';
    }
  },

  async getUser(): Promise<User> {
    return http.get<User>('/auth/user');
  },

  async uploadAvatar(file: File): Promise<{ user: User; avatar_url: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    return http.post<{ user: User; avatar_url: string }>('/auth/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async deleteAvatar(): Promise<{ user: User }> {
    return http.delete<{ user: User }>('/auth/avatar');
  },

  getToken(): string | null {
    return getAuthToken();
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
