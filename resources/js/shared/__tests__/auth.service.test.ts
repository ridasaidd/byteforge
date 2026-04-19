import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authService } from '../services/auth.service';
import { authTokenStorageKey, clearAuthToken, setAuthToken } from '../services/tokenStorage';

// NOTE: Login/logout tests are skipped because they require mocking axios,
// which is complex and brittle. These are better tested via E2E tests.
// We test the in-memory auth helpers here.

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
    it('should return token from memory after setAuthToken', () => {
      setAuthToken('test-token');
      expect(authService.getToken()).toBe('test-token');
    });

    it('should not read stale token values from browser storage', () => {
      localStorage.setItem(authTokenStorageKey(), 'stale-local-token');
      sessionStorage.setItem(authTokenStorageKey(), 'stale-session-token');
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
      expect(sessionStorage.getItem(authTokenStorageKey())).toBeNull();
      expect(localStorage.getItem(authTokenStorageKey())).toBeNull();
    });

    it('should return false if no token exists', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });
  });
});
