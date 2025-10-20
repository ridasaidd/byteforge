import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios, { AxiosInstance } from 'axios';

describe('Tenants API Integration', () => {
  let client: AxiosInstance;
  let authToken: string;
  let createdTenantId: string;
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

    // Login once and reuse token (like a real user would)
    const loginResponse = await client.post('/api/auth/login', {
      email: 'testadmin@byteforge.se',
      password: 'password',
    });
    authToken = loginResponse.data.token;
  });

  afterAll(async () => {
    // Cleanup: delete test tenant if created
    if (createdTenantId) {
      await client.delete(`/api/superadmin/tenants/${createdTenantId}`, {
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

  describe('GET /api/tenants', () => {
    it('should return list of tenants', async () => {
      const response = await client.get('/api/superadmin/tenants', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(Array.isArray(response.data.data)).toBe(true);

      if (response.data.data.length > 0) {
        const tenant = response.data.data[0];
        expect(tenant).toHaveProperty('id');
        expect(tenant).toHaveProperty('name');
        expect(tenant).toHaveProperty('domain');
      }
    });

    it('should reject request without authentication', async () => {
      const response = await client.get('/api/superadmin/tenants');

      expect(response.status).toBe(401);
    });

    it('should support pagination', async () => {
      const response = await client.get('/api/superadmin/tenants?page=1&per_page=5', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(response.data).toHaveProperty('meta');
      expect(response.data.meta).toHaveProperty('current_page', 1);
      expect(response.data.meta).toHaveProperty('per_page', 5);
    });

    it('should support search', async () => {
      const response = await client.get('/api/superadmin/tenants?search=test', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('POST /api/tenants', () => {
    it('should create a new tenant', async () => {
      // Use shared token from beforeAll

      const timestamp = Date.now();
      const newTenant = {
        name: `Integration Test Tenant ${timestamp}`,
        domain: `test-${timestamp}.example.com`,
      };

      const response = await client.post('/api/superadmin/tenants', newTenant, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.status !== 201) {
        console.log('Create tenant failed - Status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
      }

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('data');
      expect(response.data.data).toHaveProperty('id');
      expect(response.data.data).toHaveProperty('name', newTenant.name);
      expect(response.data.data).toHaveProperty('domain', newTenant.domain);

      createdTenantId = response.data.data.id;
    });

    it('should reject creation with missing name', async () => {
      const response = await client.post(
        '/api/superadmin/tenants',
        {
          domain: 'test.example.com',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(422);
      expect(response.data).toHaveProperty('errors');
      expect(response.data.errors).toHaveProperty('name');
    });

    it('should reject creation with missing domain', async () => {
      const response = await client.post(
        '/api/superadmin/tenants',
        {
          name: 'Test Tenant',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(422);
      expect(response.data).toHaveProperty('errors');
      expect(response.data.errors).toHaveProperty('domain');
    });

    it('should reject creation with duplicate domain', async () => {
      // Use shared token from beforeAll

      const timestamp = Date.now();
      const newTenant = {
        name: `Duplicate Test ${timestamp}`,
        domain: `duplicate-${timestamp}.example.com`,
      };

      // Create first tenant
      const firstResponse = await client.post('/api/superadmin/tenants', newTenant, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(firstResponse.status).toBe(201);

      // Try to create duplicate (same name will have different slug due to timestamp, but same domain)
      const duplicateResponse = await client.post('/api/superadmin/tenants', {
        ...newTenant,
        name: `${newTenant.name} Copy`, // Different name to avoid slug conflict
      }, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(duplicateResponse.status).toBe(422);
      expect(duplicateResponse.data).toHaveProperty('errors');
      expect(duplicateResponse.data.errors).toHaveProperty('domain');

      // Cleanup
      await client.delete(`/api/superadmin/tenants/${firstResponse.data.data.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
    });

    it('should reject creation without authentication', async () => {
      const response = await client.post('/api/superadmin/tenants', {
        name: 'Test',
        domain: 'test.com',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/tenants/:id', () => {
    it('should return a single tenant by id', async () => {
      // Get fresh token
      // Use shared token from beforeAll

      // First create a tenant
      const createResponse = await client.post(
        '/api/superadmin/tenants',
        {
          name: `Single Tenant Test ${Date.now()}`,
          domain: `single-${Date.now()}.example.com`,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      const tenantId = createResponse.data.data.id;

      // Then fetch it
      const response = await client.get(`/api/superadmin/tenants/${tenantId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(response.data.data).toHaveProperty('id', tenantId);
      expect(response.data.data).toHaveProperty('name');
      expect(response.data.data).toHaveProperty('domain');

      // Cleanup
      await client.delete(`/api/superadmin/tenants/${tenantId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
    });

    it('should return 404 for non-existent tenant', async () => {
      const response = await client.get('/api/superadmin/tenants/99999999', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(404);
    });

    it('should reject request without authentication', async () => {
      const response = await client.get('/api/superadmin/tenants/1');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/tenants/:id', () => {
    it('should update a tenant', async () => {
      // Get fresh token
      // Use shared token from beforeAll

      // First create a tenant
      const createResponse = await client.post(
        '/api/superadmin/tenants',
        {
          name: `Update Test Tenant ${Date.now()}`,
          domain: `update-${Date.now()}.example.com`,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      const tenantId = createResponse.data.data.id;

      // Update it
      const updatedData = {
        name: 'Updated Tenant Name',
      };

      const response = await client.put(`/api/superadmin/tenants/${tenantId}`, updatedData, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(response.data.data).toHaveProperty('id', tenantId);
      expect(response.data.data).toHaveProperty('name', updatedData.name);

      // Cleanup
      await client.delete(`/api/superadmin/tenants/${tenantId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
    });

    it('should return 404 for non-existent tenant', async () => {
      const response = await client.put(
        '/api/superadmin/tenants/99999999',
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
      const response = await client.put('/api/superadmin/tenants/1', {
        name: 'Test',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/tenants/:id', () => {
    it('should delete a tenant', async () => {
      // Get fresh token
      // Use shared token from beforeAll

      // First create a tenant
      const createResponse = await client.post(
        '/api/superadmin/tenants',
        {
          name: `Delete Test Tenant ${Date.now()}`,
          domain: `delete-${Date.now()}.example.com`,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      const tenantId = createResponse.data.data.id;

      // Delete it
      const response = await client.delete(`/api/superadmin/tenants/${tenantId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');

      // Verify it's gone
      const getResponse = await client.get(`/api/superadmin/tenants/${tenantId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent tenant', async () => {
      const response = await client.delete('/api/superadmin/tenants/99999999', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(404);
    });

    it('should reject request without authentication', async () => {
      const response = await client.delete('/api/superadmin/tenants/1');

      expect(response.status).toBe(401);
    });
  });

  describe('Tenant CRUD Flow', () => {
    it('should complete full CRUD lifecycle', async () => {
      // Get fresh token for entire flow
      // Use shared token from beforeAll

      // 1. Create
      const createData = {
        name: `CRUD Flow Test ${Date.now()}`,
        domain: `crud-${Date.now()}.example.com`,
      };

      const createResponse = await client.post('/api/superadmin/tenants', createData, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(createResponse.status).toBe(201);
      const tenantId = createResponse.data.data.id;

      // 2. Read (single)
      const getResponse = await client.get(`/api/superadmin/tenants/${tenantId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.data.name).toBe(createData.name);

      // 3. Update
      const updateData = { name: 'Updated CRUD Test' };
      const updateResponse = await client.put(`/api/superadmin/tenants/${tenantId}`, updateData, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.data.name).toBe(updateData.name);

      // 4. Read (list) - verify it's in the list
      const listResponse = await client.get('/api/superadmin/tenants', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(listResponse.status).toBe(200);
      const foundInList = listResponse.data.data.some((t: { id: string }) => t.id === tenantId);
      expect(foundInList).toBe(true);

      // 5. Delete
      const deleteResponse = await client.delete(`/api/superadmin/tenants/${tenantId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(deleteResponse.status).toBe(200);

      // 6. Verify deletion
      const verifyResponse = await client.get(`/api/superadmin/tenants/${tenantId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(verifyResponse.status).toBe(404);
    });
  });
});
