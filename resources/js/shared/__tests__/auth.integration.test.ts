import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api } from '../services/api';
import { authService } from '../services/auth.service';

/**
 * Integration Tests for Central App Authentication
 *
 * These tests verify the complete authentication flow for the central (superadmin) app:
 * - Login with valid/invalid credentials
 * - Token storage and retrieval
 * - Authenticated API requests
 * - Logout and token revocation
 * - Unauthorized access handling
 *
 * Requirements:
 * - Live backend at http://byteforge.se
 * - Test superadmin user: testadmin@byteforge.se / password (already seeded)
 *
 * NOTE: These tests currently fail in JSDOM due to CORS restrictions when making
 * real HTTP requests to the live server. JSDOM blocks cross-origin requests.
 *
 * Options:
 * 1. Use Playwright/Cypress for true E2E tests (recommended for manual testing)
 * 2. Mock axios responses (loses integration test value)
 * 3. Skip in CI and run manually
 *
 * The backend API is already thoroughly tested via PHPUnit (59/65 tests passing).
 * These frontend tests are helpful for documentation but JSDOM limitations prevent
 * them from running automatically. Consider this a living specification of the auth flow.
 */

describe('Central App Authentication Flow', () => {
  const TEST_CREDENTIALS = {
    email: 'testadmin@byteforge.se',
    password: 'password',
  };

  const INVALID_CREDENTIALS = {
    email: 'invalid@byteforge.se',
    password: 'wrongpassword',
  };

  beforeEach(() => {
    // Clear any existing auth state
    localStorage.clear();
    expect(authService.isAuthenticated()).toBe(false);
  });

  afterEach(() => {
    // Cleanup after each test
    localStorage.clear();
  });

  describe('Login Flow', () => {
    it('should successfully login with valid superadmin credentials', async () => {
      const response = await api.auth.login(TEST_CREDENTIALS);

      // Verify response structure
      expect(response).toHaveProperty('user');
      expect(response).toHaveProperty('token');

      // Verify user object
      expect(response.user).toHaveProperty('id');
      expect(response.user).toHaveProperty('email', TEST_CREDENTIALS.email);
      expect(response.user).toHaveProperty('name');
      expect(response.user).toHaveProperty('roles');
      expect(response.user).toHaveProperty('permissions');

      // Verify token is a string
      expect(typeof response.token).toBe('string');
      expect(response.token.length).toBeGreaterThan(0);

      // Verify token is stored in localStorage
      const storedToken = authService.getToken();
      expect(storedToken).toBe(response.token);
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should fail login with invalid credentials', async () => {
      await expect(
        api.auth.login(INVALID_CREDENTIALS)
      ).rejects.toThrow();

      // Verify no token is stored
      expect(authService.getToken()).toBeNull();
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should fail login with missing email', async () => {
      await expect(
        api.auth.login({ email: '', password: 'password' })
      ).rejects.toThrow();

      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should fail login with missing password', async () => {
      await expect(
        api.auth.login({ email: TEST_CREDENTIALS.email, password: '' })
      ).rejects.toThrow();

      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should verify superadmin has correct roles and permissions', async () => {
      const response = await api.auth.login(TEST_CREDENTIALS);

      // Verify superadmin role
      const roles = response.user.roles;
      expect(Array.isArray(roles)).toBe(true);
      expect(roles.length).toBeGreaterThan(0);

      const hasSuperadminRole = roles.some(
        (role: any) => role.name === 'superadmin'
      );
      expect(hasSuperadminRole).toBe(true);

      // Verify permissions exist
      expect(Array.isArray(response.user.permissions)).toBe(true);
    });
  });

  describe('Authenticated Requests', () => {
    let authToken: string;

    beforeEach(async () => {
      // Login before each test
      const response = await api.auth.login(TEST_CREDENTIALS);
      authToken = response.token;
    });

    it('should successfully fetch authenticated user info', async () => {
      const user = await api.auth.user();

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email', TEST_CREDENTIALS.email);
      expect(user).toHaveProperty('roles');
      expect(user).toHaveProperty('permissions');
    });

    it('should include auth token in request headers', async () => {
      // The http service should automatically add the token
      const storedToken = authService.getToken();
      expect(storedToken).toBe(authToken);

      // Making an authenticated request should work
      await expect(api.auth.user()).resolves.toBeDefined();
    });

    it('should successfully access superadmin endpoints', async () => {
      // Test that we can access superadmin-only endpoints
      const response = await api.tenants.list({ page: 1, per_page: 10 });

      expect(response).toHaveProperty('data');
      expect(Array.isArray(response.data)).toBe(true);
      expect(response).toHaveProperty('meta');
    });
  });

  describe('Logout Flow', () => {
    beforeEach(async () => {
      // Login before each test
      await api.auth.login(TEST_CREDENTIALS);
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should successfully logout and clear token', async () => {
      const response = await api.auth.logout();

      expect(response).toHaveProperty('message');

      // Verify token is cleared from localStorage
      expect(authService.getToken()).toBeNull();
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should not be able to access protected endpoints after logout', async () => {
      await api.auth.logout();

      // Attempting to access protected endpoint should fail
      await expect(api.auth.user()).rejects.toThrow();
    });
  });

  describe('Unauthorized Access', () => {
    it('should reject requests without authentication token', async () => {
      // Ensure no token is present
      expect(authService.isAuthenticated()).toBe(false);

      // Attempt to access protected endpoint
      await expect(api.auth.user()).rejects.toThrow();
    });

    it('should reject requests with invalid token', async () => {
      // Set an invalid token
      localStorage.setItem('auth_token', 'invalid-token-12345');
      expect(authService.isAuthenticated()).toBe(true); // Token exists

      // But request should fail due to invalid token
      await expect(api.auth.user()).rejects.toThrow();

      // Token should be cleared after 401 response
      expect(authService.getToken()).toBeNull();
    });

    it('should reject superadmin endpoints without authentication', async () => {
      expect(authService.isAuthenticated()).toBe(false);

      // Attempt to access superadmin endpoint
      await expect(
        api.tenants.list({ page: 1, per_page: 10 })
      ).rejects.toThrow();
    });

    it('should automatically clear token and redirect on 401 response', async () => {
      // Login first
      await api.auth.login(TEST_CREDENTIALS);
      expect(authService.isAuthenticated()).toBe(true);

      // Manually set an expired/invalid token
      localStorage.setItem('auth_token', 'expired-token');

      // Make a request that will fail with 401
      await expect(api.auth.user()).rejects.toThrow();

      // Token should be cleared by the response interceptor
      expect(authService.getToken()).toBeNull();
    });
  });

  describe('Token Refresh Flow', () => {
    beforeEach(async () => {
      // Login before each test
      await api.auth.login(TEST_CREDENTIALS);
    });

    it('should successfully refresh access token', async () => {
      const oldToken = authService.getToken();
      expect(oldToken).not.toBeNull();

      const response = await api.auth.refresh();

      expect(response).toHaveProperty('token');
      expect(typeof response.token).toBe('string');

      // New token should be different from old token
      const newToken = authService.getToken();
      expect(newToken).toBe(response.token);
      expect(newToken).not.toBe(oldToken);
    });

    it('should be able to make requests with refreshed token', async () => {
      // Refresh token
      await api.auth.refresh();

      // Should be able to access protected endpoints with new token
      const user = await api.auth.user();
      expect(user).toHaveProperty('email', TEST_CREDENTIALS.email);
    });

    it('should fail to refresh without valid token', async () => {
      // Logout to clear token
      await api.auth.logout();

      // Attempt to refresh without token
      await expect(api.auth.refresh()).rejects.toThrow();
    });
  });

  describe('Session Persistence', () => {
    it('should persist authentication across page reloads', async () => {
      const loginResponse = await api.auth.login(TEST_CREDENTIALS);
      const originalToken = loginResponse.token;

      // Simulate page reload by checking localStorage
      const persistedToken = localStorage.getItem('auth_token');
      expect(persistedToken).toBe(originalToken);

      // Should still be able to make authenticated requests
      const user = await api.auth.user();
      expect(user).toHaveProperty('email', TEST_CREDENTIALS.email);
    });
  });
});
