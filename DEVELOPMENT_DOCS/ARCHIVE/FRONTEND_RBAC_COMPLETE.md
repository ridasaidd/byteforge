# Frontend RBAC Implementation - Complete

## Overview
Implemented a comprehensive Role-Based Access Control (RBAC) system on the frontend to dynamically show/hide UI elements and routes based on user permissions.

## What Was Implemented

### 1. Updated User Type (`resources/js/shared/types/index.ts`)
- Added `Role` and `Permission` interfaces matching Laravel Spatie structure
- Updated `User` interface to include:
  - `roles?: Role[]` - Array of roles with nested permissions
  - `permissions?: Permission[]` - Direct permissions assigned to user

### 2. Permission Hook (`resources/js/shared/hooks/usePermissions.ts`)
Created a comprehensive hook that provides:

**Functions:**
- `hasPermission(permission: string)` - Check single permission
- `hasAnyPermission(perms: string[])` - Check if user has ANY of the permissions
- `hasAllPermissions(perms: string[])` - Check if user has ALL permissions
- `hasRole(role: string)` - Check single role
- `hasAnyRole(roles: string[])` - Check if user has ANY of the roles
- `hasAllRoles(roles: string[])` - Check if user has ALL roles

**Data:**
- `permissions: string[]` - Array of all user permission names
- `roles: string[]` - Array of all user role names

**Usage:**
```tsx
import { usePermissions } from '@/shared/hooks/usePermissions';

function MyComponent() {
  const { hasPermission, hasRole, permissions } = usePermissions();
  
  if (hasPermission('manage users')) {
    // Show admin UI
  }
  
  if (hasAnyRole(['superadmin', 'admin'])) {
    // Show elevated access
  }
}
```

### 3. Can Component (`resources/js/shared/components/auth/Can.tsx`)
A declarative component for conditional rendering based on permissions/roles.

**Props:**
- `permission?: string | string[]` - Required permission(s)
- `role?: string | string[]` - Required role(s)
- `requireAll?: boolean` - If true, user must have ALL perms/roles (default: false = ANY)
- `fallback?: ReactNode` - Content to show when access denied (default: null)

**Usage Examples:**

```tsx
import { Can } from '@/shared/components/auth/Can';

// Single permission
<Can permission="manage users">
  <Button>Create User</Button>
</Can>

// Multiple permissions (ANY)
<Can permission={["view users", "manage users"]}>
  <UsersList />
</Can>

// Multiple permissions (ALL required)
<Can permission={["view users", "manage users"]} requireAll>
  <AdminPanel />
</Can>

// Role-based
<Can role="superadmin">
  <SuperAdminTools />
</Can>

// With fallback
<Can permission="view sensitive data" fallback={<div>Access Denied</div>}>
  <SensitiveContent />
</Can>
```

### 4. Updated Drawer/Sidebar (`resources/js/shared/components/organisms/Drawer.tsx`)

**Updated MenuItem interface:**
```typescript
export interface MenuItem {
  label: string;
  path: string;
  icon: LucideIcon;
  permission?: string | string[];  // NEW
  role?: string | string[];        // NEW
  requireAll?: boolean;            // NEW
}
```

**Auto-filters menu items:**
- Only shows menu items the user has permission to access
- Checks both `permission` and `role` properties
- Respects `requireAll` flag

### 5. Updated Central Menu Config (`resources/js/apps/central/config/menu.ts`)
Added permission requirements to each menu item:

```typescript
export const centralMenuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    // No permission = everyone can access
  },
  {
    label: 'Tenants',
    path: '/dashboard/tenants',
    icon: Building2,
    permission: 'view tenants',
  },
  {
    label: 'Users',
    path: '/dashboard/users',
    icon: Users,
    permission: 'view users',
  },
  {
    label: 'Manage Roles & Permissions',
    path: '/dashboard/roles-permissions',
    icon: Shield,
    permission: 'manage roles',
  },
  {
    label: 'Activity Log',
    path: '/dashboard/activity',
    icon: Activity,
    permission: 'view activity logs',
  },
  {
    label: 'Settings',
    path: '/dashboard/settings',
    icon: Settings,
    permission: 'view settings',
  },
];
```

### 6. Updated Roles & Permissions Page
Wrapped all action buttons with `<Can>` component:
- Create Role button - requires `manage roles` permission
- Edit Role button - requires `manage roles` permission
- Delete Role button - requires `manage roles` permission
- Manage Permissions button - requires `manage roles` permission
- Create Permission button - requires `manage roles` permission
- Edit Permission button - requires `manage roles` permission
- Delete Permission button - requires `manage roles` permission

**Result:** Users without `manage roles` permission can view the page but cannot perform any CRUD operations.

## Permission Mapping

### Backend Permissions (from RolePermissionSeeder)
```
- pages.create, pages.edit, pages.delete, pages.view
- navigation.create, navigation.edit, navigation.delete, navigation.view
- view users, manage users
- view tenants, manage tenants
- manage roles
- view activity logs
- view settings, manage settings
- view analytics
- access billing
- view content
```

### Frontend Permission Usage
| Page/Feature | Required Permission |
|-------------|---------------------|
| Dashboard | None (public to authenticated users) |
| Tenants List | `view tenants` |
| Users List | `view users` |
| Roles & Permissions Page | `manage roles` (view + actions) |
| Activity Log | `view activity logs` |
| Settings | `view settings` |

## How It Works

1. **User Login:**
   - Backend returns user with `roles` and `permissions` relationships loaded
   - Frontend stores this in AuthContext

2. **Permission Check:**
   - `usePermissions` hook extracts all permission names from user's roles and direct permissions
   - Creates a flat array of permission strings for fast lookup

3. **Menu Filtering:**
   - Drawer component checks each MenuItem's permission/role requirement
   - Only renders menu items the user has access to
   - Happens automatically on every render

4. **Component-Level Protection:**
   - Use `<Can>` component to wrap sensitive UI elements
   - Elements only render if user has required permissions
   - Can show fallback content for denied access

5. **Hook-Based Logic:**
   - Use `usePermissions()` hook for conditional logic in components
   - Check permissions before making API calls
   - Show/hide complex UI sections

## Testing

### Test with Different User Roles

**Superadmin (testadmin@byteforge.se):**
- ✅ Sees all menu items
- ✅ Can perform all CRUD operations
- ✅ Has all buttons visible

**Limited User:**
To test limited access, create a user via the Users page and assign only specific roles/permissions, then login as that user. They should see:
- Limited menu items (only those they have permission for)
- CRUD buttons hidden on pages they can view but not modify
- Proper fallback messages if configured

### API Protection
Backend routes are already protected with permission middleware, so even if a user bypasses frontend checks:
- API will return 403 Forbidden
- Frontend shows error toast
- No data is modified

## Best Practices

1. **Always protect both frontend AND backend:**
   - Frontend: Hide UI elements for better UX
   - Backend: Enforce permissions for security

2. **Use descriptive permission names:**
   - ✅ `manage users`, `view tenants`
   - ❌ `admin`, `full_access`

3. **Granular permissions:**
   - Split read/write permissions (`view users` vs `manage users`)
   - Allows more flexible role assignment

4. **Consistent permission checks:**
   - Same permission name in frontend and backend
   - Use constants file for permission names (future improvement)

5. **Graceful degradation:**
   - Don't show broken UI when permissions are missing
   - Hide buttons/links rather than disabling them
   - Show informative messages when access is denied

## Future Enhancements

1. **Permission Constants File:**
   ```typescript
   // permissions.ts
   export const PERMISSIONS = {
     USERS: {
       VIEW: 'view users',
       MANAGE: 'manage users',
     },
     TENANTS: {
       VIEW: 'view tenants',
       MANAGE: 'manage tenants',
     },
     // ...
   } as const;
   ```

2. **Route-Level Protection:**
   - Create ProtectedRoute component
   - Redirect to 403 page if user lacks permission
   - Prevent direct URL access

3. **Permission Caching:**
   - Cache permission checks to avoid repeated array searches
   - Invalidate cache when user roles/permissions change

4. **Audit Logging:**
   - Log failed permission checks
   - Track who attempts to access restricted resources

5. **Dynamic Permission Loading:**
   - Fetch available permissions from backend
   - Build permission UI dynamically
   - Reduce hardcoded permission strings

## Files Changed

### New Files:
- `resources/js/shared/hooks/usePermissions.ts`
- `resources/js/shared/components/auth/Can.tsx`
- `resources/js/shared/components/auth/index.ts`

### Modified Files:
- `resources/js/shared/types/index.ts`
- `resources/js/shared/components/organisms/Drawer.tsx`
- `resources/js/shared/hooks/index.ts`
- `resources/js/apps/central/config/menu.ts`
- `resources/js/apps/central/components/pages/RolesPermissionsPage.tsx`

## Summary

✅ **Complete RBAC system on frontend**
✅ **Dynamic sidebar based on permissions**
✅ **Action buttons protected by permissions**
✅ **Reusable Can component and usePermissions hook**
✅ **Type-safe with TypeScript**
✅ **Zero TypeScript errors**
✅ **Ready for production use**

Users now see only what they have permission to access, providing a clean and secure user experience that matches the backend permission system.
