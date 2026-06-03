# Enhancement Plan: Location-Based Search for Mechanics and Tenant Management

## Overview
This document outlines the steps and architectural recommendations to implement location-based search functionality for a mechanics directory and tenant management within your existing `byteforge` repository.

---

## Current Repository Features & Strengths

### Multi-Tenancy
- Utilizes `stancl/tenancy` for tenant separation with middleware (`InitializeTenancyByDomain`).
- Ability to manage central domains for global oversight.

### Technology Stack
- Backend: Laravel (PHP) with support for advanced middleware and centralized routing.
- Frontend: TypeScript + React using Vite for faster builds.

### Authentication & RBAC
- **Spatie Permissions** integrated for Role-Based Access Control.
- **OAuth2 via Laravel Passport** for user authentication.

---

## Enhancement Goals
1. Add support for location-based search for Mechanics.
2. Enable tiered user roles:
   - **Customers**: Search mechanics.
   - **Mechanics**: Manage services and availability.
   - **Tenant Admins**: Oversee tenant-specific configurations and users.

3. Evaluate feasibility of using this project for tenant mechanics only versus deploying it as a standalone service.

---

## Execution Plan

### Step 1: Extend Database Schema
- Add `geo-coordinates` columns (latitude, longitude).
- Consider using spatial data types for efficient querying.
- New models:
  - **Mechanic**:
    - `name`, `services`, `availability`, `tenant_id`.
  - **Customer**:
    - `name`, `preferences`, `location` (optional).

### Step 2: Update Backend APIs
- **REST Endpoints:**
  - Tenant-specific mechanics listing: `/api/mechanics`.
    - Filters: Location, Service.
  - Centralized tenant management: `/api/superadmin/tenants`.

### Step 3: Adjust Frontend
- Integrate location-selector UI with Google Maps API or similar.
- Implement React components for search and mechanic filtering.

### Step 4: Tenant Isolation
- Retain multi-tenancy where mechanics are scoped within their `tenant_id`.
- If standalone service is chosen, modify `tenant_id` to point to individual mechanics.

### Feasibility Comparison
#### **Option 1: Centralized Tenant Management**
- **Pros**:
  - Fits current architecture.
  - One database; simplifies deployment and scaling.
- **Cons**:
  - Risks of overburdening central database.

#### **Option 2: Standalone Mechanics Service**
- **Pros**:
  - Each mechanic acts as an individual tenant.
  - Service autonomy, enhanced scaling potential.
- **Cons**:
  - Requires additional setup for each mechanic.

---

## Detailed Next Steps
1. Create new DB migrations.
2. Develop API endpoints and test.
3. Build frontend components for new features.
4. Communicate deployment strategy with stakeholders.
5. Conduct user-level testing prior to production launch.

---