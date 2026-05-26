import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { getCentralAdminEmail, getCentralBaseUrl, getCentralEmail, getCentralSuperadminEmail } from '../support/runtimeTestConfig';

const describeHttpIntegration = process.env.RUN_HTTP_INTEGRATION === '1' ? describe : describe.skip;

describeHttpIntegration('Authentication API Integration', () => {
  let client: AxiosInstance;
  let testToken: string;
  let cookieJar: Map<string, string>;
  const BASE_URL = getCentralBaseUrl();

  const testUser = {
    email: getCentralSuperadminEmail(),
    password: 'password',
  };
  const adminUser = {
    email: getCentralAdminEmail(),
    password: 'password',
  };
  const supportUser = {
    email: getCentralEmail('support'),
    password: 'password',
  };
  const viewerUser = {
    email: getCentralEmail('viewer'),
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

  beforeEach(() => {
    testToken = '';
    cookieJar = new Map<string, string>();
  });

  afterEach(async () => {
    if (!testToken) {
      return;
    }

    await post('/api/auth/logout', {}, {
      Authorization: `Bearer ${testToken}`,
    });
  });

  const persistCookies = (response: AxiosResponse): void => {
    const setCookieHeader = response.headers['set-cookie'];
    const cookies = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : typeof setCookieHeader === 'string'
        ? [setCookieHeader]
        : [];

    for (const cookie of cookies) {
      const [nameValue] = cookie.split(';');

      if (!nameValue) {
        continue;
      }

      const separatorIndex = nameValue.indexOf('=');

      if (separatorIndex === -1) {
        continue;
      }

      const name = nameValue.slice(0, separatorIndex).trim();
      const value = nameValue.slice(separatorIndex + 1).trim();

      if (value === '') {
        cookieJar.delete(name);

        continue;
      }

      cookieJar.set(name, value);
    }
  };

  const cookieHeader = (): string | undefined => {
    if (cookieJar.size === 0) {
      return undefined;
    }

    return Array.from(cookieJar.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  };

  const post = async (
    url: string,
    data: Record<string, unknown> = {},
    headers: Record<string, string> = {}
  ): Promise<AxiosResponse> => {
    const cookie = cookieHeader();
    const response = await client.post(url, data, {
      headers: cookie ? { ...headers, Cookie: cookie } : headers,
    });

    persistCookies(response);

    return response;
  };

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials and return token', async () => {
      const response = await post('/api/auth/login', testUser);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('user');
      expect(response.data).toHaveProperty('token');
      expect(response.data.user).toHaveProperty('email', testUser.email);
      expect(response.data.user).toHaveProperty('roles');
      expect(response.data.user).toHaveProperty('permissions');
      expect(typeof response.data.token).toBe('string');
      expect(response.data.token.length).toBeGreaterThan(0);
      expect(cookieJar.size).toBeGreaterThan(0);

      // Store token for subsequent tests
      testToken = response.data.token;
    });

    it('should reject login with invalid credentials', async () => {
      const response = await post('/api/auth/login', {
        email: supportUser.email,
        password: 'wrongpassword',
      });

      expect(response.status).toBe(422);
      expect(response.data).toHaveProperty('errors');
    });

    it('should reject login with missing email', async () => {
      const response = await post('/api/auth/login', {
        password: adminUser.password,
      });

      expect(response.status).toBe(422);
      expect(response.data).toHaveProperty('errors');
      expect(response.data.errors).toHaveProperty('email');
    });

    it('should reject login with missing password', async () => {
      const response = await post('/api/auth/login', {
        email: adminUser.email,
      });

      expect(response.status).toBe(422);
      expect(response.data).toHaveProperty('errors');
      expect(response.data.errors).toHaveProperty('password');
    });

    it('should reject login with invalid email format', async () => {
      const response = await post('/api/auth/login', {
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
      const loginResponse = await post('/api/auth/login', adminUser);
      const token = loginResponse.data.token;
      testToken = token;

      // Then fetch user
      const response = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('email', adminUser.email);
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
      const loginResponse = await post('/api/auth/login', supportUser);
      const oldToken = loginResponse.data.token;
      testToken = oldToken;

      // Then refresh
      const response = await post('/api/auth/refresh');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
      expect(typeof response.data.token).toBe('string');
      expect(response.data.token).not.toBe(oldToken);
      testToken = response.data.token;

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

    it('should reject refresh without refresh cookie', async () => {
      const response = await post('/api/auth/refresh');

      expect(response.status).toBe(401);
    });

    it('should reject refresh with bearer token but no refresh cookie', async () => {
      const loginResponse = await post('/api/auth/login', viewerUser);
      const token = loginResponse.data.token;
      cookieJar.clear();

      const response = await post('/api/auth/refresh', {}, {
        Authorization: `Bearer ${token}`,
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout and revoke token', async () => {
      // First login
      const loginResponse = await post('/api/auth/login', viewerUser);
      const token = loginResponse.data.token;
      testToken = token;

      // Verify token works before logout
      const beforeLogout = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(beforeLogout.status).toBe(200);

      // Logout
      const logoutResponse = await post('/api/auth/logout', {}, {
        Authorization: `Bearer ${token}`,
      });

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.data).toHaveProperty('message');

      // Verify token no longer works after logout
      const afterLogout = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(afterLogout.status).toBe(401);
    });

    it('should reject logout without token', async () => {
      const response = await post('/api/auth/logout');

      expect(response.status).toBe(401);
    });
  });

  describe('Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      // 1. Login
      const loginResponse = await post('/api/auth/login', adminUser);
      expect(loginResponse.status).toBe(200);
      const token = loginResponse.data.token;
      testToken = token;

      // 2. Access protected resource
      const userResponse = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(userResponse.status).toBe(200);

      // 3. Refresh token
      const refreshResponse = await post('/api/auth/refresh');
      expect(refreshResponse.status).toBe(200);
      const newToken = refreshResponse.data.token;
      testToken = newToken;

      // 4. Use new token
      const newUserResponse = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      expect(newUserResponse.status).toBe(200);

      // 5. Logout
      const logoutResponse = await post('/api/auth/logout', {}, {
        Authorization: `Bearer ${newToken}`,
      });
      expect(logoutResponse.status).toBe(200);

      // 6. Verify token revoked
      const finalResponse = await client.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      expect(finalResponse.status).toBe(401);
    });
  });
});
