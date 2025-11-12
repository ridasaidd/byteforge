import { http } from '../http';
import type { User, LoginCredentials, LoginResponse, CreateUserData, UpdateProfileData, UpdatePasswordData } from './types';

export const auth = {
  login: (credentials: LoginCredentials) => http.post<LoginResponse>('/auth/login', credentials),
  logout: () => http.post<{ message: string }>('/auth/logout'),
  user: () => http.get<User>('/auth/user'),
  refresh: () => http.post<{ token: string }>('/auth/refresh'),
  register: (data: CreateUserData) => http.post<LoginResponse>('/auth/register', data),
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
