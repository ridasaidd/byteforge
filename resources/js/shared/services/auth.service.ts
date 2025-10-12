import { http } from './http';
import type { User } from '../types';

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

    // Store token in localStorage
    localStorage.setItem('auth_token', response.token);

    return response;
  },

  async logout(): Promise<void> {
    try {
      await http.post('/auth/logout');
    } finally {
      // Always clear local storage even if API call fails
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
  },

  async getUser(): Promise<User> {
    return http.get<User>('/auth/user');
  },

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
