# Activity Logging Coverage

This document provides an overview of activity logging implementation across the ByteForge application.

## Overview

Activity logging is implemented using the Spatie Laravel ActivityLog package, which tracks user actions and model changes across both central and tenant contexts.

## Models with Automatic Activity Logging

The following models have the `LogsActivity` trait, which automatically logs CREATE, UPDATE, and DELETE operations:

### Tenant-Scoped Models

1. **Page** (`App\Models\Page`)
   - Logs: `title`, `slug`, `page_type`, `status`, `is_homepage`
   - Events: created, updated, deleted

2. **Navigation** (`App\Models\Navigation`)
   - Logs: `name`, `slug`, `type`
   - Events: created, updated, deleted

3. **Theme** (`App\Models\Theme`)
   - Logs: `name`, `slug`, `is_active`
   - Events: created, updated, deleted

4. **ThemePart** (`App\Models\ThemePart`)
   - Logs: `name`, `slug`, `type`
   - Events: created, updated, deleted

5. **Layout** (`App\Models\Layout`)
   - Logs: `name`, `slug`
   - Events: created, updated, deleted

6. **Media** (`App\Models\Media`)
   - Logs: `name`, `file_name`, `collection_name`, `size`
   - Events: created, updated, deleted

7. **MediaFolder** (`App\Models\MediaFolder`)
   - Logs: `name`, `slug`, `path`, `parent_id`
   - Events: created, updated, deleted

### Central Models

1. **User** (`App\Models\User`)
   - Logs: `name`, `email`, `type`
   - Events: created, updated, deleted

2. **Tenant** (`App\Models\Tenant`)
   - Logs: `name`, `slug`
   - Events: created, updated, deleted

## Controllers with Explicit Activity Logging

### AuthController
Logs authentication-related actions:
- **Profile Updates**: Tracks changes to user profile (name, email)
- **Password Changes**: Logs when users change their password
- **Avatar Upload**: Logs when users upload profile avatars
- **Avatar Deletion**: Logs when users delete their avatars

### RoleAssignmentController
Logs RBAC operations:
- **assignPermissions()**: Tracks when permissions are assigned to roles
  - Logs: old permissions, new permissions, role name
- **assignRoles()**: Tracks when roles are assigned to users
  - Logs: old roles, new roles, user email

### SettingsController
Logs configuration changes:
- **update()**: Tracks tenant settings changes
  - Logs: changed fields with old and new values
  - Fields tracked: `site_title`, `site_description`, `logo_url`, `favicon_url`, `maintenance_mode`, `social_links`, `seo_meta`

## Activity Log Configuration

All models use the following configuration:
- **logOnlyDirty()**: Only logs when actual changes occur
- **dontSubmitEmptyLogs()**: Prevents empty activity log entries
- **log_name**: Defaults to 'default' for tenant context, 'central' for central context

## Testing

Activity logging is covered by the following tests:

1. **ActivityLogTest::page_creation_is_logged** - Verifies page creation is logged
2. **ActivityLogTest::page_update_is_logged** - Verifies page updates are logged
3. **ActivityLogTest::authenticated_user_can_view_activity_logs** - Verifies users can view activity logs
4. **ActivityLogTest::activity_logs_can_be_filtered_by_subject_type** - Verifies filtering works

All 4 tests passing (14 assertions).

## Viewing Activity Logs

### Tenant Context
- **Endpoint**: `GET /api/activity-logs`
- **Permission**: `view activity logs`
- **Filters**: `subject_type`, `event`, `causer_id`, `per_page`

### Central Context  
- **Endpoint**: `GET /api/superadmin/activity`
- **Permission**: `superadmin` role
- **Filters**: `subject_type`, `event`, `causer_id`, `per_page`

## Best Practices

1. **Model Events**: Use `LogsActivity` trait for automatic CRUD logging
2. **Custom Actions**: Use explicit `activity()` calls for non-CRUD operations
3. **Properties**: Include relevant context in `withProperties()` for debugging
4. **Descriptions**: Use clear, human-readable descriptions
5. **Causer**: Always set the causer using `causedBy($request->user())`
6. **Subject**: Use `performedOn($model)` when logging actions on specific models

## What's NOT Logged Yet

The following operations are stubs and don't have full activity logging yet:
- Tenant-user relationship management (addUserToTenant, removeUserFromTenant in SuperadminController)

These can be implemented when the functionality is fully developed.

## Future Enhancements

1. Add activity logging for template CRUD operations
2. Add activity logging for advanced settings changes
3. Implement activity log pruning for old entries
4. Add activity log export functionality
5. Create activity log dashboard widgets for recent activity
