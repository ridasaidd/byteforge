# Authorization Flow - Final Understanding
**Date:** 2025-10-03  
**Status:** ✅ Clarified with User

## 🎯 THE CORE CONCEPT

**Spatie Permissions = Dynamic, Flexible, UI-Manageable Access Control**

Both superadmins and tenant owners use the SAME Spatie system, but in different contexts:
- **Superadmins** → Manage global system (central domain)
- **Tenant Owners** → Manage their tenant (subdomain)

## 📋 USER TYPES EXPLAINED

### **1. Super Super Admin (You)**
```
users.type = 'superadmin'
Spatie Role = 'superadmin'
Context = Central domain (localhost, main domain)
Scope = GLOBAL (all tenants, all data)

Powers:
- Create/edit/delete ANY tenant
- Create/edit/delete ANY user
- Create/edit/delete roles & permissions
- Access ANY tenant's data
- Manage system-wide settings
```

### **2. Superadmin (Created by Super Super Admin)**
```
users.type = 'superadmin'
Spatie Role = Custom role with specific permissions (you create this)
Context = Central domain
Scope = GLOBAL or LIMITED (you decide via permissions)

Powers:
- Whatever permissions you assign to their role
- Examples:
  - "Can view all tenants but not delete"
  - "Can manage users but not billing"
  - "Read-only access to analytics"
```

### **3. Tenant Owner (tenant_user)**
```
users.type = 'tenant_user'
Spatie Role = 'owner' (or custom)
membership.role = 'owner'
Context = Tenant subdomain (e.g., klocko-huels-and-konopelski.byteforge.se)
Scope = TENANT-SCOPED (only their tenant)

Powers:
- Create/edit/delete pages in THEIR tenant
- Create/edit/delete users in THEIR tenant
- Create/edit/delete roles & permissions for THEIR tenant
- Manage THEIR tenant settings
- Upload media for THEIR tenant
```

### **4. Tenant Staff/Customer**
```
users.type = 'tenant_user'
Spatie Role = Custom role (owner creates this)
membership.role = 'staff' or 'customer'
Context = Tenant subdomain
Scope = TENANT-SCOPED

Powers:
- Whatever permissions tenant owner assigns
- Examples:
  - Staff: Can edit pages, can't manage users
  - Customer: Read-only access to content
  - Editor: Can create/edit pages, can't delete
```

## 🔐 AUTHORIZATION FLOW

### **Central Domain (localhost, main domain)**

```php
// Middleware: auth:api

1. User logs in
2. Check: users.type == 'superadmin'?
   - NO → 403 Forbidden (only superadmins access central domain)
   - YES → Continue

3. Check Spatie permissions for the action
   - Example: User tries to delete tenant
   - Check: $user->can('manage tenants')
   - If YES → Allow
   - If NO → 403 Forbidden

4. Execute action (global scope, no tenant filter)
```

### **Tenant Subdomain (e.g., tenant.byteforge.se)**

```php
// Middleware: InitializeTenancyByDomain + auth:api

1. Tenancy initialized (tenant context set)
2. User logs in
3. Check: Does user have membership in this tenant?
   - Query: memberships where user_id = X AND tenant_id = current_tenant
   - NO → 403 Forbidden (user doesn't belong to this tenant)
   - YES → Continue

4. Get user's role in THIS tenant (membership.role)
5. Check Spatie permissions for the action
   - Example: User tries to edit page
   - Check: $user->can('pages.edit')
   - If YES → Allow
   - If NO → 403 Forbidden

6. Execute action (tenant-scoped, all queries filtered by tenant_id)
```

### **Special Case: Super Super Admin**

```php
// You can access BOTH central AND tenant domains

Central Domain:
- Full superadmin access

Tenant Subdomain:
- Option A: Bypass tenant membership check (god mode)
- Option B: Create membership for yourself to act as owner
- Recommended: Option A (you're the super super admin)
```

## 🎨 UI/UX IMPLICATIONS

### **Central App (Superadmin Dashboard)**
```
URL: http://localhost/dashboard (or main domain)

Pages/Routes:
- /dashboard → Overview of all tenants
- /tenants → List/Create/Edit/Delete tenants
- /tenants/{id}/users → Manage users in specific tenant
- /users → Global user management
- /roles → Create/edit roles & permissions (system-wide)
- /settings → System settings

Authentication:
- Only users.type == 'superadmin' can access
```

### **Tenant App (Owner/User Dashboard)**
```
URL: http://klocko-huels-and-konopelski.byteforge.se/dashboard

Pages/Routes:
- /dashboard → Tenant overview
- /pages → Manage pages (CRUD)
- /navigation → Manage navigation
- /users → Manage users IN THIS TENANT
- /roles → Create/edit roles & permissions FOR THIS TENANT
- /media → Manage uploaded files
- /settings → Tenant settings

Authentication:
- User must have membership in this tenant
- Permissions checked via Spatie
```

## 🔧 IMPLEMENTATION STRATEGY

### **Step 1: Middleware Setup**

```php
// Central Domain Protection
Route::middleware(['auth:api', 'superadmin'])->group(function() {
    // Only superadmins
});

// Tenant Domain Protection  
Route::middleware(['auth:api', 'tenant.member'])->group(function() {
    // Only tenant members
});
```

### **Step 2: Custom Middleware**

**SuperadminMiddleware:**
```php
public function handle($request, Closure $next)
{
    if ($request->user()->type !== 'superadmin') {
        abort(403, 'Superadmin access required');
    }
    return $next($request);
}
```

**TenantMemberMiddleware:**
```php
public function handle($request, Closure $next)
{
    $user = $request->user();
    $tenant = tenancy()->tenant;
    
    // Super super admin bypass
    if ($user->type === 'superadmin' && $user->hasRole('superadmin')) {
        return $next($request);
    }
    
    // Check membership
    $membership = Membership::where('user_id', $user->id)
        ->where('tenant_id', $tenant->id)
        ->where('status', 'active')
        ->first();
        
    if (!$membership) {
        abort(403, 'You do not have access to this tenant');
    }
    
    return $next($request);
}
```

### **Step 3: Authorization Policies**

**PagePolicy:**
```php
public function create(User $user)
{
    return $user->can('pages.create');
}

public function update(User $user, Page $page)
{
    // Ensure page belongs to current tenant
    if ($page->tenant_id !== tenancy()->tenant->id) {
        return false;
    }
    
    return $user->can('pages.edit');
}

public function delete(User $user, Page $page)
{
    if ($page->tenant_id !== tenancy()->tenant->id) {
        return false;
    }
    
    return $user->can('pages.delete');
}
```

### **Step 4: Role Management**

**Central Domain - Superadmin Role Management:**
```php
// Create roles that apply to superadmins
POST /api/superadmin/roles
{
    "name": "Support Agent",
    "permissions": ["view tenants", "view users", "view analytics"]
}
```

**Tenant Domain - Owner Role Management:**
```php
// Create roles that apply within THIS tenant
POST /api/roles
{
    "name": "Content Editor",
    "permissions": ["pages.create", "pages.edit", "pages.view"]
}

// These roles are automatically scoped to tenant using team_foreign_key
```

## 📊 DATABASE USAGE

### **Spatie Roles with Team (Tenant) Scoping**

```sql
-- Superadmin roles (no team_foreign_key)
INSERT INTO roles (name, guard_name, team_foreign_key)
VALUES ('superadmin', 'api', NULL);

-- Tenant-specific roles (with team_foreign_key = tenant_id)
INSERT INTO roles (name, guard_name, team_foreign_key)
VALUES ('Content Editor', 'api', '2a6e03fa-3f58-4fb5-baf4-5d217a06ca09');

-- User gets role in specific tenant context
INSERT INTO model_has_roles (role_id, model_type, model_id, team_foreign_key)
VALUES (5, 'App\Models\User', 10, '2a6e03fa-3f58-4fb5-baf4-5d217a06ca09');
```

### **Membership Table Usage**

```sql
-- Tracks which users belong to which tenants
INSERT INTO memberships (user_id, tenant_id, role, status)
VALUES (10, '2a6e03fa-3f58-4fb5-baf4-5d217a06ca09', 'owner', 'active');

-- Same user in different tenant
INSERT INTO memberships (user_id, tenant_id, role, status)
VALUES (10, 'another-tenant-id', 'staff', 'active');
```

**Purpose of membership.role:**
- Quick lookup for UI (show "Owner" badge)
- Default role assignment when user joins tenant
- Fallback if Spatie roles complex

## ✅ FINAL ANSWERS TO MY QUESTIONS

### **Q1: Authorization Hierarchy**
```
Central Domain:
1. Check users.type == 'superadmin'
2. Check Spatie permission for action
3. Allow/Deny

Tenant Domain:
1. Check membership exists (or bypass for super super admin)
2. Check Spatie permission for action (with tenant scope)
3. Verify resource belongs to tenant
4. Allow/Deny
```

### **Q2: Superadmin Powers**
```
✅ Super super admin (you):
   - Can access any tenant
   - Can edit any data
   - Bypass all checks (god mode)

✅ Regular superadmins (created by you):
   - Limited to central domain
   - Permissions you assign
   - Cannot access tenant subdomains (unless you give them membership)
```

### **Q3: Page Ownership**
```
Determined by Spatie permissions:
- If user has 'pages.edit' → Can edit ANY page in their tenant
- If user has 'pages.delete' → Can delete ANY page in their tenant
- Tenant owner controls who has what permission
```

### **Q4: Media Storage**
```
- Need your preference: Local or S3?
- File size limit: Suggest 10MB (you decide)
- Allowed types: Images + PDFs (you decide)
- Scoping: Via polymorphic relationship (Page → Media)
  - Media inherits tenant scope from parent (Page)
```

## 🎯 NEXT STEPS - CLEAR IMPLEMENTATION PATH

### **Phase 1: Authorization Infrastructure** ⚠️
1. Create SuperadminMiddleware
2. Create TenantMemberMiddleware  
3. Create PagePolicy
4. Configure Spatie to use team_foreign_key for tenant scoping
5. Test authorization scenarios

### **Phase 2: Complete Page Management** 📄
1. Add validation (FormRequest classes)
2. Create UpdatePageAction
3. Register PagePolicy
4. Add authorization checks to controllers
5. Test CRUD with different roles

### **Phase 3: Role & Permission Management** 🔐
1. Create RoleController (central domain)
2. Create RoleController (tenant domain)
3. Allow creating/editing roles via API
4. Allow assigning permissions to roles
5. Test role creation & permission assignment

### **Phase 4: Media Upload System** 📸
1. Configure Page model with HasMedia trait
2. Create MediaController
3. Add upload/delete endpoints
4. Add authorization (pages.edit permission)
5. Test file uploads

### **Phase 5: Superadmin CRUD** 👤
1. Implement tenant CRUD (Actions + validation)
2. Implement user CRUD (Actions + validation)
3. Add authorization checks
4. Test superadmin operations

## 🤔 ONE FINAL QUESTION

**Media Storage Location:**
Where should uploaded files be stored?
- A) Local storage (`storage/app/public`) - Simple, good for development
- B) S3/DigitalOcean Spaces - Production-ready, scalable
- C) Let me configure both, use local for now, easy to switch later

**My Recommendation:** Option C - Configure Spatie Media Library for both, use local now, switch to S3 later with one config change.

Should I proceed with **Phase 1: Authorization Infrastructure**?
