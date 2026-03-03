import { useState, useEffect, useCallback, ReactNode } from 'react';
import { authService } from '../services/auth.service';
import type { User } from '../types';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children, initialUser = null }: { children: ReactNode; initialUser?: User | null }) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoading, setIsLoading] = useState(!initialUser);

  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const userData = await authService.getUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await authService.login({ email, password });
    // Fetch full user data with roles and permissions
    await fetchUser();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  useEffect(() => {
    // Only fetch user if a token exists in storage. With Passport bearer tokens
    // there is no valid server session without a token, so calling fetchUser()
    // unconditionally would trigger a 401 on every public page (e.g. /login),
    // causing an infinite redirect loop via the 401 interceptor.
    // The Safari storage bug that motivated the unconditional call is now handled
    // by the resilient tokenStorage.ts layer.
    if (!initialUser && authService.isAuthenticated()) {
      fetchUser();
    }
  }, [initialUser, fetchUser]);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refetchUser: fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
