# Phase 3: Page Builder Model

## Goals
- Tenant DB: sites, pages, page_versions
- Block-based page content (JSON)
- Versioning and publishing

## Steps
1. Create migrations for sites, pages, page_versions
2. Implement models and relationships
3. Add basic CRUD for pages and versions
4. Set up publish flow (current_version_id)
5. Test page creation, editing, publishing

## Acceptance Criteria
- Tenants can create/edit/publish pages
- Page content stored as JSON blocks
- Version history is tracked
