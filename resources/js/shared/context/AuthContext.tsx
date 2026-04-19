import { useState, useEffect, useCallback, ReactNode } from 'react';
import { authService } from '../services/auth.service';
import type { User } from '../types';
import { AuthContext } from './AuthContext';
import i18n, { type SupportedLocale, SUPPORTED_LOCALES } from '@/i18n';

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

function shouldBootstrapAuthSession(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const path = window.location.pathname;

  return !['/login', '/register', '/forgot-password'].includes(path)
    && !path.startsWith('/reset-password');
}

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

  const bootstrapAuth = useCallback(async () => {
    if (initialUser) {
      setIsLoading(false);
      return;
    }

    if (!shouldBootstrapAuthSession()) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const restoredUser = await authService.restoreSession();
      setUser(restoredUser);
    } finally {
      setIsLoading(false);
    }
  }, [initialUser]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  useEffect(() => {
    void bootstrapAuth();
  }, [bootstrapAuth]);

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
