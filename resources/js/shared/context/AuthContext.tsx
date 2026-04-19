import { useState, useEffect, useCallback, ReactNode } from 'react';
import { authService } from '../services/auth.service';
import type { User } from '../types';
import { AuthContext } from './AuthContext';
import i18n, { type SupportedLocale, SUPPORTED_LOCALES } from '@/i18n';

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

export function AuthProvider({ children, initialUser = null }: { children: ReactNode; initialUser?: User | null }) {
  const hasSessionToken = authService.isAuthenticated();
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoading, setIsLoading] = useState(!initialUser && hasSessionToken);

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
    // Until the HttpOnly refresh-cookie migration lands, auth bootstrap still
    // depends on a session-scoped bearer token surviving reloads within the tab.
    // Fetching unconditionally would 401 on public pages and trigger redirects.
    if (!initialUser && authService.isAuthenticated()) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, [initialUser, fetchUser]);

  useEffect(() => {
    const preferred = user?.preferred_locale;

    if (!preferred || !isSupportedLocale(preferred)) {
      return;
    }

    if (i18n.resolvedLanguage === preferred || i18n.language === preferred) {
      return;
    }

    void i18n.changeLanguage(preferred);
  }, [user?.preferred_locale]);

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
