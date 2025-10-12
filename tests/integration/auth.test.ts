import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios, { AxiosInstance } from 'axios';

describe('Authentication API Integration', () => {
  let client: AxiosInstance;
  let testToken: string;
  const BASE_URL = 'http://byteforge.se';

  const testUser = {
    email: 'lullrich@example.org',
    password: 'password',
  };

  beforeAll(() => {
    client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      validateStatus: () => true, // Don't throw on any status
    });
  });

  afterAll(async () => {
    // Cleanup: logout if we have a token
    if (testToken) {
      await client.post(
        '/api/auth/logout',
        {},
        {
          headers: { Authorization: `Bearer ${testToken}` },
        }
      );
    }
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials and return token', async () => {
      const response = await client.post('/api/auth/login', testUser);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('user');
      expect(response.data).toHaveProperty('token');
      expect(response.data.user).toHaveProperty('email', testUser.email);
      expect(response.data.user).toHaveProperty('roles');
      expect(response.data.user).toHaveProperty('permissions');
      expect(typeof response.data.token).toBe('string');
      expect(response.data.token.length).toBeGreaterThan(0);

      // Store token for subsequent tests
      testToken = response.data.token;
    });

    it('should reject login with invalid credentials', async () => {
      const response = await client.post('/api/auth/login', {
        email: testUser.email,
        password: 'wrongpassword',
      });

      expect(response.status).toBe(422);
      expect(response.data).toHaveProperty('errors');
    });

    it('should reject login with missing email', async () => {
      const response = await client.post('/api/auth/login', {
        password: testUser.password,
      });

      expect(response.status).toBe(422);
      expect(response.data).toHaveProperty('errors');
      expect(response.data.errors).toHaveProperty('email');
    });

    it('should reject login with missing password', async () => {
      const response = await client.post('/api/auth/login', {
        email: testUser.email,
      });

      expect(response.status).toBe(422);
      expect(response.data).toHaveProperty('errors');
      expect(response.data.errors).toHaveProperty('password');
    });

    it('should reject login with invalid email format', async () => {
      const response = await client.post('/api/auth/login', {
        email: 'notanemail',
        password: testUser.password,
      });

      expect(response.status).toBe(422);
      expect(response.data).toHaveProperty('errors');
      expect(response.data.errors).toHaveProperty('email');
    });
  });

  describe('GET /api/auth/user', () => {
    it('should return authenticated user with token', async () => {
      // First login to get token
      const loginResponse = await client.post('/api/auth/login', testUser);
      const token = loginResponse.data.token;

      // Then fetch user
      const response = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('email', testUser.email);
      expect(response.data).toHaveProperty('name');
      expect(response.data).toHaveProperty('roles');
      expect(response.data).toHaveProperty('permissions');
      expect(Array.isArray(response.data.roles)).toBe(true);
    });

    it('should reject request without token', async () => {
      const response = await client.get('/api/auth/user');

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await client.get('/api/auth/user', {
        headers: { Authorization: 'Bearer invalid-token-12345' },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token and return new token', async () => {
      // First login
      const loginResponse = await client.post('/api/auth/login', testUser);
      const oldToken = loginResponse.data.token;

      // Then refresh
      const response = await client.post(
        '/api/auth/refresh',
        {},
        {
          headers: { Authorization: `Bearer ${oldToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
      expect(typeof response.data.token).toBe('string');
      expect(response.data.token).not.toBe(oldToken);

      // Verify old token no longer works
      const oldTokenResponse = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${oldToken}` },
      });
      expect(oldTokenResponse.status).toBe(401);

      // Verify new token works
      const newTokenResponse = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${response.data.token}` },
      });
      expect(newTokenResponse.status).toBe(200);
    });

    it('should reject refresh without token', async () => {
      const response = await client.post('/api/auth/refresh');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout and revoke token', async () => {
      // First login
      const loginResponse = await client.post('/api/auth/login', testUser);
      const token = loginResponse.data.token;

      // Verify token works before logout
      const beforeLogout = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(beforeLogout.status).toBe(200);

      // Logout
      const logoutResponse = await client.post(
        '/api/auth/logout',
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.data).toHaveProperty('message');

      // Verify token no longer works after logout
      const afterLogout = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(afterLogout.status).toBe(401);
    });

    it('should reject logout without token', async () => {
      const response = await client.post('/api/auth/logout');

      expect(response.status).toBe(401);
    });
  });

  describe('Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      // 1. Login
      const loginResponse = await client.post('/api/auth/login', testUser);
      expect(loginResponse.status).toBe(200);
      const token = loginResponse.data.token;

      // 2. Access protected resource
      const userResponse = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(userResponse.status).toBe(200);

      // 3. Refresh token
      const refreshResponse = await client.post(
        '/api/auth/refresh',
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      expect(refreshResponse.status).toBe(200);
      const newToken = refreshResponse.data.token;

      // 4. Use new token
      const newUserResponse = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      expect(newUserResponse.status).toBe(200);

      // 5. Logout
      const logoutResponse = await client.post(
        '/api/auth/logout',
        {},
        {
          headers: { Authorization: `Bearer ${newToken}` },
        }
      );
      expect(logoutResponse.status).toBe(200);

      // 6. Verify token revoked
      const finalResponse = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      expect(finalResponse.status).toBe(401);
    });
  });
});
