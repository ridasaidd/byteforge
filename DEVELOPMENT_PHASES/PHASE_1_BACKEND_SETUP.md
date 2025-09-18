# Phase 1: Backend Setup

## Goals
- Bootstrap Laravel 12 project
- Install and configure core packages:
  - stancl/tenancy (multi-tenant)
  - spatie/laravel-permission (roles/teams)
  - spatie/laravel-medialibrary (media)
  - spatie/laravel-activitylog (audit)
  - spatie/laravel-settings (tenant/global settings)
  - laravel/passport (API auth)
  - lorisleiva/laravel-actions (action classes)
  - intervention/image-laravel (image handling)
  - barryvdh/laravel-debugbar (dev only)

## Steps
1. Initialize repo and push to GitHub
2. Configure tenancy (central domains, tenant DB separation)
3. Set up Spatie Permission with teams (tenant_id as team key)
4. Configure Medialibrary for tenant-aware storage
5. Enable Activitylog and Settings for tenant context
6. Set up Passport for API authentication
7. Add basic models and migrations for users, tenants, memberships
8. Test app boots and packages are working

## Acceptance Criteria
- App boots, all packages installed and configured
- GitHub repo with backend-setup branch
- Ready for next phase
