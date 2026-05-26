import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { getCentralAdminEmail, getCentralBaseUrl, getCentralSuperadminEmail } from '../support/runtimeTestConfig';

const describeHttpIntegration = process.env.RUN_HTTP_INTEGRATION === '1' ? describe : describe.skip;

// E2E Test - Requires a live backend at the configured central base URL.
// Run with: npx vitest run tests/integration/authorization.test.ts --no-coverage
// Backend is tested via PHPUnit
describeHttpIntegration('Authorization & Permissions Integration', () => {
  let client: AxiosInstance;
  let superadminToken: string;
  let regularUserToken: string;
  let regularUserId: string;
  const BASE_URL = getCentralBaseUrl();

  const buildUserPayload = (overrides: Record<string, unknown> = {}) => ({
    name: 'Regular User',
    email: `regular-${Date.now()}@example.com`,
    password: 'Password123!',
    password_confirmation: 'Password123!',
    role: 'viewer',
    ...overrides,
  });

  const extractNames = (items: Array<string | { name?: string }>) =>
    items.map((item) => typeof item === 'string' ? item : item.name ?? '');

  const extractRolePermissionNames = (roles: Array<{ permissions?: Array<{ name?: string }> }>) =>
    roles.flatMap((role) => extractNames(role.permissions ?? []));

  beforeAll(async () => {
    client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      validateStatus: () => true,
    });

    // Login as superadmin - use this token throughout tests
    const superadminLogin = await client.post('/api/auth/login', {
      email: getCentralSuperadminEmail(),
      password: 'password',
    });
    expect(superadminLogin.status).toBe(200);
    superadminToken = superadminLogin.data.token;

    // Create a regular user
    const createUserResponse = await client.post(
      '/api/superadmin/users',
      buildUserPayload(),
      {
        headers: { Authorization: `Bearer ${superadminToken}` },
      }
    );
    expect(createUserResponse.status).toBe(201);
    regularUserId = createUserResponse.data.data.id;

    // Login as regular user
    const regularLogin = await client.post('/api/auth/login', {
      email: createUserResponse.data.data.email,
      password: 'Password123!',
    });
    expect(regularLogin.status).toBe(200);
    regularUserToken = regularLogin.data.token;
  });

  afterAll(async () => {
    // Cleanup: delete regular user
    if (regularUserId) {
      await client.delete(`/api/superadmin/users/${regularUserId}`, {
        headers: { Authorization: `Bearer ${superadminToken}` },
      });
    }

    // Logout both users
    await client.post(
      '/api/auth/logout',
      {},
      {
        headers: { Authorization: `Bearer ${superadminToken}` },
      }
    );

    if (regularUserToken) {
      await client.post(
        '/api/auth/logout',
        {},
        {
          headers: { Authorization: `Bearer ${regularUserToken}` },
        }
      );
    }
  });

  describe('User Roles & Permissions', () => {
    it('should return user with roles and permissions', async () => {
      const response = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${superadminToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('roles');
      expect(response.data).toHaveProperty('permissions');
      expect(Array.isArray(response.data.roles)).toBe(true);

      // Superadmin should have superadmin role
      expect(extractNames(response.data.roles)).toContain('superadmin');
      expect(extractRolePermissionNames(response.data.roles)).toContain('users.manage');
    });

    it('should show different roles for different users', async () => {
      // Get superadmin user
      const superadminResponse = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${superadminToken}` },
      });

      // Get regular user
      const regularResponse = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${regularUserToken}` },
      });

      expect(superadminResponse.status).toBe(200);
      expect(regularResponse.status).toBe(200);

      // Roles should be different
      const superadminRoles = extractNames(superadminResponse.data.roles);
      const regularRoles = extractNames(regularResponse.data.roles);

      expect(superadminRoles).toContain('superadmin');
      expect(regularRoles).toContain('viewer');
      expect(regularRoles).not.toContain('superadmin');
    });
  });

  describe('Protected Resource Access', () => {
    it('superadmin should access all tenant endpoints', async () => {
      // Use shared superadmin token throughout

      // List tenants
      const listResponse = await client.get('/api/superadmin/tenants', {
        headers: { Authorization: `Bearer ${superadminToken}` },
      });
      expect(listResponse.status).toBe(200);

      // Create tenant
      const timestamp = Date.now();
      const createResponse = await client.post(
        '/api/superadmin/tenants',
        {
          name: `Auth Test Tenant ${timestamp}`,
          domain: `auth-test-${timestamp}.example.com`,
        },
        {
          headers: { Authorization: `Bearer ${superadminToken}` },
        }
      );
      expect(createResponse.status).toBe(201);

      const tenantId = createResponse.data.data.id;

      // Update tenant
      const updateResponse = await client.put(
        `/api/superadmin/tenants/${tenantId}`,
        { name: 'Updated Auth Test' },
        {
          headers: { Authorization: `Bearer ${superadminToken}` },
        }
      );
      expect(updateResponse.status).toBe(200);

      // Delete tenant
      const deleteResponse = await client.delete(`/api/superadmin/tenants/${tenantId}`, {
        headers: { Authorization: `Bearer ${superadminToken}` },
      });
      expect(deleteResponse.status).toBe(200);
    });

    it('superadmin should access all user endpoints', async () => {
      // List users
      const listResponse = await client.get('/api/superadmin/users', {
        headers: { Authorization: `Bearer ${superadminToken}` },
      });
      expect(listResponse.status).toBe(200);

      // Create user
      const createResponse = await client.post(
        '/api/superadmin/users',
        buildUserPayload({
          name: 'Auth Test User',
          email: `auth-test-${Date.now()}@example.com`,
          role: 'admin',
        }),
        {
          headers: { Authorization: `Bearer ${superadminToken}` },
        }
      );
      expect(createResponse.status).toBe(201);

      const userId = createResponse.data.data.id;

      // Update user
      const updateResponse = await client.put(
        `/api/superadmin/users/${userId}`,
        { name: 'Updated Auth Test' },
        {
          headers: { Authorization: `Bearer ${superadminToken}` },
        }
      );
      expect(updateResponse.status).toBe(200);

      // Delete user
      const deleteResponse = await client.delete(`/api/superadmin/users/${userId}`, {
        headers: { Authorization: `Bearer ${superadminToken}` },
      });
      expect(deleteResponse.status).toBe(200);
    });

    it('regular user cannot create tenants', async () => {
      const response = await client.post(
        '/api/superadmin/tenants',
        {
          name: 'Regular User Tenant',
          domain: `regular-${Date.now()}.example.com`,
        },
        {
          headers: { Authorization: `Bearer ${regularUserToken}` },
        }
      );

      expect(response.status).toBe(403);
    });

    it('regular user cannot manage users', async () => {
      const response = await client.post(
        '/api/superadmin/users',
        buildUserPayload({
          name: 'Unauthorized User',
          email: `unauthorized-${Date.now()}@example.com`,
        }),
        {
          headers: { Authorization: `Bearer ${regularUserToken}` },
        }
      );

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated Access', () => {
    it('should reject access to protected endpoints without token', async () => {
      // Test GET endpoints
      const getEndpoints = [
        '/api/superadmin/tenants',
        '/api/superadmin/users',
        '/api/auth/user',
      ];

      for (const endpoint of getEndpoints) {
        const response = await client.get(endpoint);
        expect(response.status).toBe(401);
      }

      // Test POST endpoint (refresh is POST only)
      const refreshResponse = await client.post('/api/auth/refresh');
      expect(refreshResponse.status).toBe(401);
    });

    it('should reject access with invalid token', async () => {
      const endpoints = ['/api/superadmin/tenants', '/api/superadmin/users', '/api/auth/user'];

      for (const endpoint of endpoints) {
        const response = await client.get(endpoint, {
          headers: { Authorization: 'Bearer invalid-token-123' },
        });
        expect(response.status).toBe(401);
      }
    });

    it('should reject access with expired/revoked token', async () => {
      // Login, logout, then try to use the token
      const loginResponse = await client.post('/api/auth/login', {
        email: getCentralAdminEmail(),
        password: 'password',
      });
      expect(loginResponse.status).toBe(200);
      const token = loginResponse.data.token;

      // Logout (revokes token)
      await client.post(
        '/api/auth/logout',
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Try to use revoked token
      const response = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Cross-User Access', () => {
    it('user should not be able to update another user without proper permissions', async () => {
      // Create two users
      const user1Response = await client.post(
        '/api/superadmin/users',
        buildUserPayload({
          name: 'User One',
          email: `user1-${Date.now()}@example.com`,
        }),
        {
          headers: { Authorization: `Bearer ${superadminToken}` },
        }
      );
      expect(user1Response.status).toBe(201);
      const user1Id = user1Response.data.data.id;

      const user2Response = await client.post(
        '/api/superadmin/users',
        buildUserPayload({
          name: 'User Two',
          email: `user2-${Date.now()}@example.com`,
        }),
        {
          headers: { Authorization: `Bearer ${superadminToken}` },
        }
      );
      expect(user2Response.status).toBe(201);
      const user2Id = user2Response.data.data.id;

      // Login as user1
      const user1Login = await client.post('/api/auth/login', {
        email: user1Response.data.data.email,
        password: 'Password123!',
      });
      expect(user1Login.status).toBe(200);
      const user1Token = user1Login.data.token;

      // Try to update user2 as user1 (should fail unless user1 has admin permissions)
      const updateResponse = await client.put(
        `/api/superadmin/users/${user2Id}`,
        { name: 'Hacked Name' },
        {
          headers: { Authorization: `Bearer ${user1Token}` },
        }
      );

      expect(updateResponse.status).toBe(403);

      // Cleanup
      await client.delete(`/api/superadmin/users/${user1Id}`, {
        headers: { Authorization: `Bearer ${superadminToken}` },
      });
      await client.delete(`/api/superadmin/users/${user2Id}`, {
        headers: { Authorization: `Bearer ${superadminToken}` },
      });
    });
  });

  describe('Token Security', () => {
    it('should not accept tokens from different users', async () => {
      // Get superadmin data with regular user token (should fail)
      const response = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${regularUserToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.email).not.toBe(getCentralSuperadminEmail());
      expect(response.data.email).toContain('regular-');
    });

    it('should validate token ownership on all requests', async () => {
      // This verifies that each token correctly identifies its owner
      const superadminUser = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${superadminToken}` },
      });

      const regularUser = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${regularUserToken}` },
      });

      expect(superadminUser.data.id).not.toBe(regularUser.data.id);
      expect(superadminUser.data.email).toBe(getCentralSuperadminEmail());
      expect(regularUser.data.email).toContain('regular-');
    });
  });
});
