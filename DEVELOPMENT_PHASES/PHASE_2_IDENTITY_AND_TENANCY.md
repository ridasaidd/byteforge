# Phase 2: Identity & Tenancy

## Goals
- Centralized user accounts (single login)
- Tenants (businesses) and domains
- Memberships: user <-> tenant link
- Staff invitation flow

## Steps
1. Create migrations for users, tenants, domains, memberships
2. Implement models and relationships
3. Add staff invitation logic (token, email, status)
4. Seed sample tenants and users
5. Test user can belong to multiple tenants

## Acceptance Criteria
- Users can be linked to multiple tenants
- Staff can be invited and join tenants
- Tenancy context resolves by domain/header
