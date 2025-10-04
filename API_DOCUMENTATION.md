# ByteForge API Documentation

**Base URL (Central):** `http://localhost/api` or `https://byteforge.se/api`  
**Base URL (Tenant):** `http://tenant-one.byteforge.se/api`

**Authentication:** Bearer Token (Laravel Passport)

---

## 🔐 Authentication Endpoints

### POST `/api/auth/register`
Register a new user account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "password_confirmation": "SecurePassword123!"
}
```

**Response (201):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "type": "customer"
  },
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."
}
```

---

### POST `/api/auth/login`
Login with email and password.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "type": "superadmin"
  },
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."
}
```

---

### POST `/api/auth/logout`
Logout and revoke access token.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### POST `/api/auth/refresh`
Refresh access token.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."
}
```

---

### GET `/api/auth/user`
Get authenticated user details.

**Headers:** `Authorization: Bearer {token}`

**Response (200):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "type": "superadmin",
  "email_verified_at": "2025-10-04T12:00:00.000000Z",
  "created_at": "2025-10-04T12:00:00.000000Z",
  "updated_at": "2025-10-04T12:00:00.000000Z"
}
```

---

## 👥 User Management (Superadmin Only)

**Base Path:** `/api/superadmin/users`  
**Required:** `auth:api` + `superadmin` middleware

### GET `/api/superadmin/users`
List all users.

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "type": "superadmin",
      "memberships_count": 0,
      "roles": [
        {"id": 1, "name": "superadmin"}
      ],
      "memberships": []
    }
  ]
}
```

---

### GET `/api/superadmin/users/{id}`
Get a specific user.

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "type": "superadmin",
    "roles": [
      {"id": 1, "name": "superadmin"}
    ],
    "memberships": [
      {
        "id": 1,
        "role": "owner",
        "status": "active",
        "tenant": {
          "id": "tenant_one",
          "name": "Tenant One",
          "domain": "tenant-one.byteforge.se"
        }
      }
    ]
  }
}
```

---

### POST `/api/superadmin/users`
Create a new user.

**Request:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "type": "tenant_user",
  "roles": ["editor"]
}
```

**Response (201):**
```json
{
  "message": "User created successfully",
  "data": {
    "id": 2,
    "name": "Jane Smith",
    "email": "jane@example.com",
    "type": "tenant_user"
  }
}
```

---

### PUT `/api/superadmin/users/{id}`
Update a user.

**Request:**
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "type": "tenant_user",
  "roles": ["admin"]
}
```

**Response (200):**
```json
{
  "message": "User updated successfully",
  "data": {
    "id": 2,
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "type": "tenant_user"
  }
}
```

---

### DELETE `/api/superadmin/users/{id}`
Delete a user (also removes all memberships and role assignments).

**Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

---

## 🏢 Tenant Management (Superadmin Only)

**Base Path:** `/api/superadmin/tenants`  
**Required:** `auth:api` + `superadmin` middleware

### GET `/api/superadmin/tenants`
List all tenants.

**Response (200):**
```json
{
  "data": [
    {
      "id": "tenant_one",
      "name": "Tenant One",
      "slug": "tenant-one",
      "domain": "tenant-one.byteforge.se",
      "email": "contact@tenant-one.byteforge.se",
      "phone": "+46701234567",
      "status": "active",
      "memberships_count": 1,
      "created_at": "2025-10-04T12:00:00.000000Z",
      "updated_at": "2025-10-04T12:00:00.000000Z"
    }
  ]
}
```

---

### GET `/api/superadmin/tenants/{id}`
Get a specific tenant with members.

**Response (200):**
```json
{
  "data": {
    "id": "tenant_one",
    "name": "Tenant One",
    "slug": "tenant-one",
    "domain": "tenant-one.byteforge.se",
    "email": "contact@tenant-one.byteforge.se",
    "phone": "+46701234567",
    "status": "active",
    "memberships": [
      {
        "id": 1,
        "role": "owner",
        "status": "active",
        "user": {
          "id": 1,
          "name": "John Doe",
          "email": "john@example.com",
          "type": "tenant_user"
        }
      }
    ],
    "created_at": "2025-10-04T12:00:00.000000Z",
    "updated_at": "2025-10-04T12:00:00.000000Z"
  }
}
```

---

### POST `/api/superadmin/tenants`
Create a new tenant.

**Request:**
```json
{
  "name": "New Tenant",
  "domain": "new-tenant.byteforge.se",
  "email": "contact@new-tenant.com",
  "phone": "+46701234567",
  "status": "active"
}
```

**Response (201):**
```json
{
  "message": "Tenant created successfully",
  "data": {
    "id": "new_tenant",
    "name": "New Tenant",
    "slug": "new-tenant",
    "domain": "new-tenant.byteforge.se",
    "email": "contact@new-tenant.com",
    "phone": "+46701234567",
    "status": "active",
    "created_at": "2025-10-04T12:00:00.000000Z",
    "updated_at": "2025-10-04T12:00:00.000000Z"
  }
}
```

---

### PUT `/api/superadmin/tenants/{id}`
Update a tenant.

**Request:**
```json
{
  "name": "Updated Tenant Name",
  "email": "new-email@tenant.com",
  "phone": "+46709876543",
  "status": "active"
}
```

**Response (200):**
```json
{
  "message": "Tenant updated successfully",
  "data": {
    "id": "tenant_one",
    "name": "Updated Tenant Name",
    "slug": "tenant-one",
    "domain": "tenant-one.byteforge.se",
    "email": "new-email@tenant.com",
    "phone": "+46709876543",
    "status": "active"
  }
}
```

---

### DELETE `/api/superadmin/tenants/{id}`
Delete a tenant (also removes all memberships and domains).

**Response (200):**
```json
{
  "message": "Tenant deleted successfully"
}
```

---

### POST `/api/superadmin/tenants/{id}/users`
Add a user to a tenant (create membership).

**Request:**
```json
{
  "user_id": 2,
  "role": "owner",
  "status": "active"
}
```

**Response (201):**
```json
{
  "message": "User added to tenant successfully",
  "data": {
    "id": 5,
    "user_id": 2,
    "tenant_id": "tenant_one",
    "role": "owner",
    "status": "active",
    "user": {
      "id": 2,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "type": "tenant_user"
    }
  }
}
```

---

### DELETE `/api/superadmin/tenants/{tenant_id}/users/{user_id}`
Remove a user from a tenant (delete membership).

**Response (200):**
```json
{
  "message": "User removed from tenant successfully"
}
```

**Response (404) - If user is not a member:**
```json
{
  "message": "User is not a member of this tenant"
}
```

---

## 🔐 Role Management (Superadmin Only)

**Base Path:** `/api/superadmin/roles`  
**Required:** `auth:api` + `superadmin` middleware

### GET `/api/superadmin/roles`
List all roles with permissions.

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "superadmin",
      "guard_name": "web",
      "permissions": [
        {"id": 1, "name": "manage users"},
        {"id": 2, "name": "manage tenants"}
      ]
    }
  ]
}
```

---

### GET `/api/superadmin/roles/{id}`
Get a specific role.

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "name": "superadmin",
    "guard_name": "web",
    "permissions": [
      {"id": 1, "name": "manage users"},
      {"id": 2, "name": "manage tenants"}
    ]
  }
}
```

---

### POST `/api/superadmin/roles`
Create a new role.

**Request:**
```json
{
  "name": "editor",
  "permissions": ["pages.create", "pages.edit", "pages.view"]
}
```

**Response (201):**
```json
{
  "message": "Role created successfully",
  "data": {
    "id": 5,
    "name": "editor",
    "guard_name": "web",
    "permissions": [
      {"id": 10, "name": "pages.create"},
      {"id": 11, "name": "pages.edit"},
      {"id": 12, "name": "pages.view"}
    ]
  }
}
```

---

### PUT `/api/superadmin/roles/{id}`
Update a role.

**Request:**
```json
{
  "name": "senior-editor",
  "permissions": ["pages.create", "pages.edit", "pages.view", "pages.delete"]
}
```

**Response (200):**
```json
{
  "message": "Role updated successfully",
  "data": {
    "id": 5,
    "name": "senior-editor",
    "permissions": [...]
  }
}
```

---

### DELETE `/api/superadmin/roles/{id}`
Delete a role.

**Response (200):**
```json
{
  "message": "Role deleted successfully"
}
```

---

## 🔑 Permission Management (Superadmin Only)

**Base Path:** `/api/superadmin/permissions`  
**Required:** `auth:api` + `superadmin` middleware

### GET `/api/superadmin/permissions`
List all permissions.

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "manage users",
      "guard_name": "web",
      "roles": [
        {"id": 1, "name": "superadmin"}
      ]
    }
  ]
}
```

---

### GET `/api/superadmin/permissions/{id}`
Get a specific permission.

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "name": "manage users",
    "guard_name": "web",
    "roles": [...]
  }
}
```

---

### POST `/api/superadmin/permissions`
Create a new permission.

**Request:**
```json
{
  "name": "export data"
}
```

**Response (201):**
```json
{
  "message": "Permission created successfully",
  "data": {
    "id": 20,
    "name": "export data",
    "guard_name": "web"
  }
}
```

---

### PUT `/api/superadmin/permissions/{id}`
Update a permission.

**Request:**
```json
{
  "name": "export all data"
}
```

**Response (200):**
```json
{
  "message": "Permission updated successfully",
  "data": {
    "id": 20,
    "name": "export all data"
  }
}
```

---

### DELETE `/api/superadmin/permissions/{id}`
Delete a permission.

**Response (200):**
```json
{
  "message": "Permission deleted successfully"
}
```

---

## 📄 Tenant API Endpoints

**Base URL:** `http://tenant-one.byteforge.se/api`  
**Required:** Tenant domain + `auth:api` middleware

### GET `/api/info`
Get tenant information (public).

**Response (200):**
```json
{
  "tenant_id": "tenant_one",
  "name": "Tenant One",
  "domain": "tenant-one.byteforge.se"
}
```

---

### GET `/api/dashboard`
Get tenant dashboard data (protected).

**Headers:** `Authorization: Bearer {token}`

**Response (200):**
```json
{
  "tenant": {
    "id": "tenant_one",
    "name": "Tenant One"
  },
  "stats": {
    "pages": 5,
    "users": 3
  }
}
```

---

## 🖼️ Media Management (Tenant)

**Base Path:** `http://tenant-one.byteforge.se/api/media`  
**Required:** Tenant context + `auth:api` middleware

### GET `/api/media`
List media items (with optional folder filter).

**Query Parameters:**
- `folder_id` (optional): Filter by folder

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "file_name": "hero-image.jpg",
      "mime_type": "image/jpeg",
      "size": 245678,
      "folder_id": null,
      "created_at": "2025-10-04T12:00:00.000000Z"
    }
  ]
}
```

---

### POST `/api/media`
Upload a new image.

**Request (multipart/form-data):**
- `file`: Image file (max 10MB)
- `folder_id` (optional): Folder ID
- `alt_text` (optional): Alt text for accessibility
- `title` (optional): Image title

**Response (201):**
```json
{
  "message": "Image uploaded successfully",
  "data": {
    "id": 1,
    "file_name": "hero-image.jpg",
    "mime_type": "image/jpeg",
    "size": 245678,
    "url": "https://tenant-one.byteforge.se/storage/media/hero-image.jpg",
    "conversions": {
      "thumb": "https://...",
      "small": "https://...",
      "medium": "https://...",
      "large": "https://...",
      "webp": "https://..."
    }
  }
}
```

---

### PUT `/api/media/{id}`
Update media metadata.

**Request:**
```json
{
  "alt_text": "Updated alt text",
  "title": "Updated title",
  "folder_id": 2
}
```

---

### DELETE `/api/media/{id}`
Delete a media item.

**Response (200):**
```json
{
  "message": "Media deleted successfully"
}
```

---

### POST `/api/media/bulk-delete`
Delete multiple media items.

**Request:**
```json
{
  "ids": [1, 2, 3]
}
```

**Response (200):**
```json
{
  "message": "3 media items deleted successfully"
}
```

---

## 📁 Media Folders (Tenant)

**Base Path:** `http://tenant-one.byteforge.se/api/media-folders`

### GET `/api/media-folders`
List all folders.

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Products",
      "slug": "products",
      "parent_id": null,
      "path": "/products",
      "media_count": 5
    }
  ]
}
```

---

### GET `/api/media-folders/tree`
Get folder tree structure.

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Products",
      "children": [
        {
          "id": 2,
          "name": "Electronics",
          "children": []
        }
      ]
    }
  ]
}
```

---

### POST `/api/media-folders`
Create a new folder.

**Request:**
```json
{
  "name": "Product Images",
  "parent_id": null
}
```

**Response (201):**
```json
{
  "message": "Folder created successfully",
  "data": {
    "id": 3,
    "name": "Product Images",
    "slug": "product-images",
    "path": "/product-images"
  }
}
```

---

## 🧪 Test Credentials

See `TESTING_CREDENTIALS.md` for fixed test data:
- Tenants: `tenant_one`, `tenant_two`, `tenant_three`
- Users: `user.multiple@byteforge.test`, `user.single@byteforge.test`
- Password: `password`

---

## 📝 Notes

1. **All endpoints return JSON**
2. **Timestamps** are in ISO 8601 format (UTC)
3. **Authentication** required for protected routes via `Authorization: Bearer {token}` header
4. **Validation errors** return 422 with error details
5. **Tenant context** automatically resolved from subdomain
6. **Superadmin** middleware checks user type + permissions

---

## ✅ Implementation Status

- ✅ Authentication (login, register, logout, refresh)
- ✅ User Management (full CRUD)
- ✅ Tenant Management (full CRUD + memberships)
- ✅ Role & Permission Management (full CRUD)
- ✅ Media Management (images only, full CRUD + folders)
- ⏳ Page Builder (coming next)
- ⏳ Navigation Management (coming next)
- ⏳ Activity Logging (coming next)

**All endpoints are fully tested and ready for frontend consumption!** 🚀
