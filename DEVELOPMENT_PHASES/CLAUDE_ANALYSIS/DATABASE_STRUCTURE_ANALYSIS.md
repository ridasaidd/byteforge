# Database Structure Analysis
**Date:** 2025-10-03  
**Purpose:** Complete understanding of database schema before backend API implementation

## 📊 DATABASE SCHEMA OVERVIEW

### 🔐 AUTHENTICATION & AUTHORIZATION

#### **Users Table**
```
- id (bigint, primary)
- name (string)
- email (string, unique)
- email_verified_at (timestamp, nullable)
- password (string)
- type (enum: 'tenant_user', 'customer', 'superadmin') - DEFAULT: 'customer'
- remember_token
- timestamps
```

**Key Observations:**
- ✅ User types are defined at database level (enum)
- ✅ Supports multiple user types
- ⚠️ 'type' field separate from Spatie roles (dual system?)

#### **Spatie Permission Tables**
```
permissions:
- id, name, guard_name, timestamps
- unique: [name, guard_name]

roles:
- id, name, guard_name, timestamps
- team_foreign_key (nullable) - for multi-tenancy
- unique: [team_foreign_key, name, guard_name]

model_has_permissions:
- permission_id, model_type, model_morph_key
- team_foreign_key (nullable)

model_has_roles:
- role_id, model_type, model_morph_key
- team_foreign_key (nullable)

role_has_permissions:
- permission_id, role_id
```

**Key Observations:**
- ✅ Supports team-based permissions (multi-tenancy)
- ✅ Polymorphic relationships (can attach to any model)
- ✅ Role-permission hierarchy supported

#### **Passport OAuth Tables**
```
oauth_clients
oauth_access_tokens
oauth_refresh_tokens
oauth_auth_codes
oauth_device_codes
personal_access_tokens
```

**Key Observations:**
- ✅ Full OAuth2 server implementation
- ✅ Supports personal access tokens (API tokens)
- ✅ Refresh token support

---

### 🏢 MULTI-TENANCY

#### **Tenants Table**
```
- id (string, primary) - UUID
- name (string)
- slug (string, unique)
- data (json, nullable)
- timestamps
```

**Key Observations:**
- ✅ UUID as primary key (Stancl Tenancy standard)
- ✅ Slug for URL-friendly identifiers
- ✅ JSON data field for flexible metadata

#### **Domains Table** (Stancl Tenancy)
```
- id
- tenant_id (foreign -> tenants.id)
- domain (string, unique)
- timestamps
```

**Key Observations:**
- ✅ One tenant can have multiple domains
- ✅ Domain is unique globally

#### **Memberships Table**
```
- id
- user_id (foreign -> users.id, cascade delete)
- tenant_id (foreign -> tenants.id, cascade delete)
- role (string) - e.g. 'owner', 'staff', 'customer'
- status (string) - DEFAULT: 'active'
- timestamps
- unique: [user_id, tenant_id]
```

**Key Observations:**
- ✅ Many-to-many: User ↔ Tenant
- ✅ User can belong to multiple tenants
- ✅ Role per tenant membership (separate from Spatie roles)
- ⚠️ Dual role system: membership.role + Spatie roles

---

### 📄 CONTENT MANAGEMENT

#### **Pages Table**
```
- id (bigint, primary)
- tenant_id (foreign -> tenants.id, cascade delete)
- title (string)
- slug (string)
- page_type (string) - DEFAULT: 'general' (home, about, contact, etc.)
- puck_data (json, nullable) - Puck editor component structure
- meta_data (json, nullable) - SEO meta tags
- status (string) - DEFAULT: 'draft' (draft, published, archived)
- is_homepage (boolean) - DEFAULT: false
- sort_order (integer) - DEFAULT: 0
- created_by (foreign -> users.id, cascade delete)
- published_at (timestamp, nullable)
- timestamps

Indexes:
- status, page_type, sort_order
- unique: [tenant_id, slug]
```

**Key Observations:**
- ✅ Tenant-scoped (cascade delete with tenant)
- ✅ Slug unique per tenant (not globally)
- ✅ Audit trail (created_by)
- ✅ Publishing workflow (status + published_at)
- ✅ Homepage designation
- ✅ Sortable
- ✅ Puck editor integration ready

#### **Navigations Table** (not examined yet, but exists)
```
(Need to check migration)
```

---

### 📸 MEDIA MANAGEMENT

#### **Media Table** (Spatie Media Library)
```
- id
- model_type (morphs) - polymorphic
- model_id (morphs) - polymorphic
- uuid (unique, nullable)
- collection_name (string)
- name (string)
- file_name (string)
- mime_type (string, nullable)
- disk (string) - storage disk
- conversions_disk (string, nullable)
- size (unsignedBigInteger)
- manipulations (json)
- custom_properties (json)
- generated_conversions (json)
- responsive_images (json)
- order_column (unsignedInteger, nullable, indexed)
- timestamps
```

**Key Observations:**
- ✅ Polymorphic (can attach to Pages, Users, any model)
- ✅ Multiple collections per model
- ✅ Image conversions/manipulations support
- ✅ Responsive images support
- ✅ Flexible storage (can use S3, local, etc.)
- ✅ Sortable within collections

---

### 📊 AUDIT & ACTIVITY

#### **Activity Log Table** (Spatie Activity Log)
```
(Standard Spatie activity log structure)
- id
- log_name (string, nullable)
- description (text)
- subject_type (nullable)
- subject_id (nullable)
- causer_type (nullable)
- causer_id (nullable)
- properties (json, nullable)
- event (string, nullable)
- batch_uuid (uuid, nullable)
- timestamps
```

**Key Observations:**
- ✅ Tracks all model changes
- ✅ Records who did what (causer)
- ✅ Records what was changed (subject)
- ✅ Batch operations support

---

## 🔍 SEEDER ANALYSIS

### **RolePermissionSeeder**

**Permissions Defined:**
```
Pages:
- pages.create
- pages.edit
- pages.delete
- pages.view

Navigation:
- navigation.create
- navigation.edit
- navigation.delete
- navigation.view

Other:
- view analytics
- manage users
- manage tenants
- access billing
- view content
```

**Roles & Permissions Matrix:**

| Permission | superadmin | owner | staff | customer |
|-----------|------------|-------|-------|----------|
| pages.* | ✅ All | ✅ All | ✅ create, edit, view | ✅ view only |
| navigation.* | ✅ All | ✅ All | ✅ create, edit, view | ✅ view only |
| view analytics | ✅ | ✅ | ✅ | ❌ |
| manage users | ✅ | ✅ | ❌ | ❌ |
| manage tenants | ✅ | ✅ | ❌ | ❌ |
| access billing | ✅ | ✅ | ❌ | ❌ |
| view content | ✅ | ✅ | ✅ | ✅ |

---

## ⚠️ CRITICAL OBSERVATIONS

### **Dual Role System**
There are TWO role systems in play:

1. **User Type (enum on users table)**
   - `tenant_user`, `customer`, `superadmin`
   - Database-level constraint
   - Used for basic user categorization

2. **Spatie Roles (roles table)**
   - `superadmin`, `owner`, `staff`, `customer`
   - Permission-based authorization
   - Used for granular access control

3. **Membership Roles (memberships table)**
   - `owner`, `staff`, `customer`
   - Tenant-specific roles
   - User can have different role in each tenant

**Question:** How do these three systems interact?

**My Analysis:**
- User.type = Global user category (is this a superadmin?)
- Spatie Roles = What permissions does user have?
- Membership.role = What's user's role in THIS tenant?

**Recommended Logic:**
```
if (user.type == 'superadmin') {
    // Full access to everything
}
else if (membership.role == 'owner') {
    // Check Spatie role 'owner' permissions
}
else if (membership.role == 'staff') {
    // Check Spatie role 'staff' permissions
}
```

### **Tenant Scoping**
- Pages are tenant-scoped (tenant_id foreign key)
- Media is NOT tenant-scoped (polymorphic, could attach to anything)
- Users are global (can belong to multiple tenants via memberships)
- Spatie roles support team_foreign_key (but need to verify if it's being used as tenant_id)

---

## 🎯 IMPLEMENTATION PRIORITIES

Based on database structure analysis:

### **Priority 1: Clarify Authorization Logic**
**Why:** Three overlapping systems need clear hierarchy
**Action:** 
- Document the interaction between user.type, Spatie roles, membership.role
- Create authorization middleware that checks correct system
- Write tests for authorization scenarios

### **Priority 2: Complete Page Management**
**Why:** Structure is ready, just need implementation
**Action:**
- Add validation
- Add authorization policies (use Spatie permissions)
- Create UpdatePageAction
- Add media attachment to pages

### **Priority 3: Implement Media Uploads**
**Why:** Spatie Media Library configured, need endpoints
**Action:**
- Configure Page model with HasMedia trait
- Create MediaController
- Add upload/delete endpoints
- Add authorization (pages.edit permission required)

### **Priority 4: Implement Superadmin CRUD**
**Why:** Routes exist but controllers are stubs
**Action:**
- Create Actions for tenant CRUD
- Create Actions for user CRUD
- Add validation
- Add authorization (manage users/tenants permissions)

---

## 🤔 QUESTIONS FOR USER

1. **Authorization Hierarchy**
   - How do user.type, Spatie roles, and membership.role work together?
   - Should I use Spatie permissions for all authorization checks?
   - When should I check membership.role vs Spatie role?

2. **Media Uploads**
   - Where should files be stored? (local? S3?)
   - What file types allowed?
   - File size limits?
   - Should media be tenant-scoped? (currently it's not)

3. **Page Authorization**
   - Who can create pages? (any tenant member? or specific role?)
   - Who can edit pages? (creator only? tenant owner? staff?)
   - Should we use Spatie policies or manual checks?

4. **Superadmin vs Owner**
   - Both have all permissions in seeder - what's the difference?
   - Should superadmin bypass tenant scoping?
   - Should superadmin be able to edit any tenant's pages?

---

## 📝 NEXT STEPS

**Immediate Actions:**
1. ✅ Create this analysis document
2. ⏭️ Wait for user clarification on authorization hierarchy
3. ⏭️ Document authorization flow
4. ⏭️ Implement authorization middleware
5. ⏭️ Add policies to Page model
6. ⏭️ Complete page management endpoints
7. ⏭️ Implement media upload system
8. ⏭️ Implement superadmin CRUD

**Test Strategy:**
- Create authorization tests first
- Test each permission level (superadmin, owner, staff, customer)
- Test tenant scoping (can user A edit tenant B's pages?)
- Test media attachments
- Test validation

