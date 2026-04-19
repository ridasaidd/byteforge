import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authService } from '../services/auth.service';
import { clearAuthToken, setAuthToken } from '../services/tokenStorage';

// NOTE: Login/logout tests are skipped because they require mocking axios,
// which is complex and brittle. These are better tested via E2E tests.
// We test the storage-backed auth helpers here.

describe('authService', () => {
  beforeEach(() => {
    clearAuthToken();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    clearAuthToken();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('getToken', () => {
    it('should return token from sessionStorage', () => {
      sessionStorage.setItem('auth_token', 'test-token');
      expect(authService.getToken()).toBe('test-token');
    });

    it('should not read stale token values from localStorage', () => {
      localStorage.setItem('auth_token', 'stale-token');
      expect(authService.getToken()).toBeNull();
    });

    it('should return null if no token exists', () => {
      expect(authService.getToken()).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true if token exists', () => {
      setAuthToken('test-token');
      expect(authService.isAuthenticated()).toBe(true);
      expect(sessionStorage.getItem('auth_token')).toBe('test-token');
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('should return false if no token exists', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });
  });
});
