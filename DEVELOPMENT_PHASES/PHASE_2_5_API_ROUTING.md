# Phase 2.5: API Routing Setup (Priority over Phase 3)

## Goals
- Establish API routes for authentication, protected routes, and public routes
- Implement multi-tenant routing architecture
- Create central app routes (superadmin, auth) and tenant app routes (tenant-specific)

## Multi-Tenant Routing Architecture

### Central App Routes (routes/api.php)
- **Authentication**: Login, register, logout, password reset
- **Superadmin**: Tenant management, user management, global settings
- **Public**: General info, health checks
- **Always available**: No tenancy context required

### Tenant App Routes (routes/tenant.php)
- **Protected**: Page management, navigation, user roles within tenant
- **Scoped to tenant**: All routes require tenancy context
- **Domain-based**: Accessed via tenant subdomains (tenant1.app.com/api/...)

### Routing Flow
1. Request hits domain (central.app.com or tenant1.app.com)
2. Tenancy middleware detects tenant from domain
3. If central domain: Load routes/api.php
4. If tenant domain: Initialize tenancy, load routes/tenant.php
5. Authentication middleware checks user permissions
6. Route handlers execute with proper context

## Steps
1. Set up central API routes (auth, superadmin)
2. Set up tenant API routes (pages, users, roles)
3. Implement authentication middleware
4. Test routing with different domains
5. Document API endpoints

## Acceptance Criteria
- Central API accessible without tenant context
- Tenant API requires tenant subdomain
- Authentication works for both contexts
- Proper permission checks on protected routes
- API documentation generated

## Questions to Resolve
- Exact API structure (REST vs GraphQL)
- Authentication flow details
- Permission middleware implementation
- Error handling for invalid tenants/domains