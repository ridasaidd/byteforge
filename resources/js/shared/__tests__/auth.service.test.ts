import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authService } from '../services/auth.service';

// NOTE: Login/logout tests are skipped because they require mocking axios,
// which is complex and brittle. These are better tested via E2E tests.
// We test the simple localStorage-based methods here.

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getToken', () => {
    it('should return token from localStorage', () => {
      localStorage.setItem('auth_token', 'test-token');
      expect(authService.getToken()).toBe('test-token');
    });

    it('should return null if no token exists', () => {
      expect(authService.getToken()).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true if token exists', () => {
      localStorage.setItem('auth_token', 'test-token');
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false if no token exists', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });
  });
});
