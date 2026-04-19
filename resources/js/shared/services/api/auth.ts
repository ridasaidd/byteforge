import { http } from '../http';
import type { User, LoginCredentials, LoginResponse, CreateUserData, UpdateProfileData, UpdatePasswordData } from './types';
import { clearAuthToken, setAuthToken } from '../tokenStorage';

type RefreshResponse = {
  token: string;
  user: User;
};

export const auth = {
  login: async (credentials: LoginCredentials) => {
    const response = await http.post<LoginResponse>('/auth/login', credentials);
    setAuthToken(response.token);
    return response;
  },
  logout: async () => {
    try {
      return await http.post<{ message: string }>('/auth/logout', undefined, {
        skipAuthRedirect: true,
      });
    } finally {
      clearAuthToken();
    }
  },
  user: () => http.get<User>('/auth/user'),
  refresh: async () => {
    const response = await http.post<RefreshResponse>('/auth/refresh', undefined, {
      skipAuthRefresh: true,
      skipAuthRedirect: true,
      skipAuthToken: true,
    });
    setAuthToken(response.token);
    return response;
  },
  register: async (data: CreateUserData) => {
    const response = await http.post<LoginResponse>('/auth/register', data);
    setAuthToken(response.token);
    return response;
  },
  updateProfile: (data: UpdateProfileData) => http.put<{ message: string; user: User }>('/auth/user', data),
  updatePassword: (data: UpdatePasswordData) => http.put<{ message: string }>('/auth/password', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return http.post<{ user: User; avatar_url: string }>('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteAvatar: () => http.delete<{ user: User }>('/auth/avatar'),
};
