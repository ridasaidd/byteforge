import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios, { AxiosInstance } from 'axios';

describe('Users API Integration', () => {
  let client: AxiosInstance;
  let authToken: string;
  let createdUserId: string;
  const BASE_URL = 'http://byteforge.se';

  beforeAll(async () => {
    client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      validateStatus: () => true,
    });

    // Login as superadmin
    const loginResponse = await client.post('/api/auth/login', {
      email: 'testadmin@byteforge.se',
      password: 'password',
    });

    authToken = loginResponse.data.token;
  });

  afterAll(async () => {
    // Cleanup: delete test user if created
    if (createdUserId) {
      await client.delete(`/api/superadmin/users/${createdUserId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
    }

    // Logout
    await client.post(
      '/api/auth/logout',
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
  });

  describe('GET /api/users', () => {
    it('should return list of users', async () => {
      const response = await client.get('/api/superadmin/users', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(Array.isArray(response.data.data)).toBe(true);

      if (response.data.data.length > 0) {
        const user = response.data.data[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('email');
        expect(user).not.toHaveProperty('password'); // Password should be hidden
      }
    });

    it('should reject request without authentication', async () => {
      const response = await client.get('/api/superadmin/users');

      expect(response.status).toBe(401);
    });

    it('should support pagination', async () => {
      const response = await client.get('/api/superadmin/users?page=1&per_page=5', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('meta');
      expect(response.data.meta).toHaveProperty('current_page', 1);
      expect(response.data.meta).toHaveProperty('per_page', 5);
    });

    it('should support search', async () => {
      const response = await client.get('/api/superadmin/users?search=admin', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const newUser = {
        name: 'Integration Test User',
        email: `test-${Date.now()}@example.com`,
        password: 'Password123!',
        password_confirmation: 'Password123!',
      };

      const response = await client.post('/api/superadmin/users', newUser, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('data');
      expect(response.data.data).toHaveProperty('id');
      expect(response.data.data).toHaveProperty('name', newUser.name);
      expect(response.data.data).toHaveProperty('email', newUser.email);
      expect(response.data.data).not.toHaveProperty('password');

      createdUserId = response.data.data.id;
    });

    it('should reject creation with missing name', async () => {
      const response = await client.post(
        '/api/superadmin/users',
        {
          email: 'test@example.com',
          password: 'Password123!',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(422);
      expect(response.data).toHaveProperty('errors');
      expect(response.data.errors).toHaveProperty('name');
    });

    it('should reject creation with missing email', async () => {
      const response = await client.post(
        '/api/superadmin/users',
        {
          name: 'Test User',
          password: 'Password123!',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(422);
      expect(response.data).toHaveProperty('errors');
      expect(response.data.errors).toHaveProperty('email');
    });

    it('should reject creation with invalid email', async () => {
      const response = await client.post(
        '/api/superadmin/users',
        {
          name: 'Test User',
          email: 'notanemail',
          password: 'Password123!',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(422);
      expect(response.data).toHaveProperty('errors');
      expect(response.data.errors).toHaveProperty('email');
    });

    it('should reject creation with duplicate email', async () => {
      const newUser = {
        name: 'Duplicate Test',
        email: `duplicate-${Date.now()}@example.com`,
        password: 'Password123!',
        password_confirmation: 'Password123!',
      };

      // Create first user
      const firstResponse = await client.post('/api/superadmin/users', newUser, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(firstResponse.status).toBe(201);

      // Try to create duplicate
      const duplicateResponse = await client.post('/api/superadmin/users', newUser, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(duplicateResponse.status).toBe(422);
      expect(duplicateResponse.data).toHaveProperty('errors');
      expect(duplicateResponse.data.errors).toHaveProperty('email');

      // Cleanup
      await client.delete(`/api/superadmin/users/${firstResponse.data.data.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
    });

    it('should reject creation with mismatched password confirmation', async () => {
      const response = await client.post(
        '/api/superadmin/users',
        {
          name: 'Test User',
          email: `test-${Date.now()}@example.com`,
          password: 'Password123!',
          password_confirmation: 'DifferentPassword!',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(422);
      expect(response.data).toHaveProperty('errors');
      expect(response.data.errors).toHaveProperty('password');
    });

    it('should reject creation without authentication', async () => {
      const response = await client.post('/api/superadmin/users', {
        name: 'Test',
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return a single user by id', async () => {
      // First create a user
      const createResponse = await client.post(
        '/api/superadmin/users',
        {
          name: 'Single User Test',
          email: `single-${Date.now()}@example.com`,
          password: 'Password123!',
          password_confirmation: 'Password123!',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      const userId = createResponse.data.data.id;

      // Then fetch it
      const response = await client.get(`/api/superadmin/users/${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(response.data.data).toHaveProperty('id', userId);
      expect(response.data.data).toHaveProperty('name');
      expect(response.data.data).toHaveProperty('email');
      expect(response.data.data).not.toHaveProperty('password');

      // Cleanup
      await client.delete(`/api/superadmin/users/${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
    });

    it('should return 404 for non-existent user', async () => {
      const response = await client.get('/api/superadmin/users/99999999', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(404);
    });

    it('should reject request without authentication', async () => {
      const response = await client.get('/api/superadmin/users/1');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update a user', async () => {
      // First create a user
      const createResponse = await client.post(
        '/api/superadmin/users',
        {
          name: 'Update Test User',
          email: `update-${Date.now()}@example.com`,
          password: 'Password123!',
          password_confirmation: 'Password123!',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      const userId = createResponse.data.data.id;

      // Update it
      const updatedData = {
        name: 'Updated User Name',
      };

      const response = await client.put(`/api/superadmin/users/${userId}`, updatedData, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(response.data.data).toHaveProperty('id', userId);
      expect(response.data.data).toHaveProperty('name', updatedData.name);

      // Cleanup
      await client.delete(`/api/superadmin/users/${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
    });

    it('should update user password', async () => {
      // First create a user
      const createResponse = await client.post(
        '/api/superadmin/users',
        {
          name: 'Password Update Test',
          email: `password-${Date.now()}@example.com`,
          password: 'OldPassword123!',
          password_confirmation: 'OldPassword123!',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      const userId = createResponse.data.data.id;
      const userEmail = createResponse.data.data.email;

      // Update password
      const response = await client.put(
        `/api/superadmin/users/${userId}`,
        {
          password: 'NewPassword123!',
          password_confirmation: 'NewPassword123!',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(200);

      // Verify new password works
      const loginResponse = await client.post('/api/auth/login', {
        email: userEmail,
        password: 'NewPassword123!',
      });
      expect(loginResponse.status).toBe(200);

      // Cleanup
      await client.delete(`/api/superadmin/users/${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
    });

    it('should return 404 for non-existent user', async () => {
      const response = await client.put(
        '/api/superadmin/users/99999999',
        {
          name: 'Test',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(404);
    });

    it('should reject request without authentication', async () => {
      const response = await client.put('/api/superadmin/users/1', {
        name: 'Test',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete a user', async () => {
      // First create a user
      const createResponse = await client.post(
        '/api/superadmin/users',
        {
          name: 'Delete Test User',
          email: `delete-${Date.now()}@example.com`,
          password: 'Password123!',
          password_confirmation: 'Password123!',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      const userId = createResponse.data.data.id;

      // Delete it
      const response = await client.delete(`/api/superadmin/users/${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');

      // Verify it's gone
      const getResponse = await client.get(`/api/superadmin/users/${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await client.delete('/api/superadmin/users/99999999', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(404);
    });

    it('should reject request without authentication', async () => {
      const response = await client.delete('/api/superadmin/users/1');

      expect(response.status).toBe(401);
    });
  });

  describe('User CRUD Flow', () => {
    it('should complete full CRUD lifecycle', async () => {
      // 1. Create
      const createData = {
        name: 'CRUD Flow Test',
        email: `crud-${Date.now()}@example.com`,
        password: 'Password123!',
        password_confirmation: 'Password123!',
      };

      const createResponse = await client.post('/api/superadmin/users', createData, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(createResponse.status).toBe(201);
      const userId = createResponse.data.data.id;

      // 2. Read (single)
      const getResponse = await client.get(`/api/superadmin/users/${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.data.name).toBe(createData.name);

      // 3. Update
      const updateData = { name: 'Updated CRUD Test' };
      const updateResponse = await client.put(`/api/superadmin/users/${userId}`, updateData, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.data.name).toBe(updateData.name);

      // 4. Read (list) - verify it's in the list by searching for it
      const listResponse = await client.get(`/api/superadmin/users?search=${updateData.name}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(listResponse.status).toBe(200);
      const foundInList = listResponse.data.data.some((u: { id: number }) => u.id === userId);
      expect(foundInList).toBe(true);

      // 5. Delete
      const deleteResponse = await client.delete(`/api/superadmin/users/${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(deleteResponse.status).toBe(200);

      // 6. Verify deletion
      const verifyResponse = await client.get(`/api/superadmin/users/${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(verifyResponse.status).toBe(404);
    });
  });
});
