# Phase 5: Frontend Implementation 🚧 IN PROGRESS

**Current Status:** Infrastructure setup  
**Started:** October 11, 2025  
**Branch:** `feature/frontend-stack-setup`

---

## Overview

Building three React applications with shared UI components:
- **Central App** - Superadmin tenant/user management
- **Tenant App** - CMS for pages, media, navigation
- **Public App** - Public page renderer (Puck JSON display)

---

## Architecture Decisions

### Three Separate Entry Points ✅
- `superadmin.tsx` - Central admin
- `tenant.tsx` - Tenant CMS
- `public.tsx` - Public renderer

**Why?**
- Different routes (`/dashboard/tenants` vs `/dashboard/pages`)
- Different APIs (`/api/central/*` vs `/api/tenant/*`)
- Smaller bundles (users only load what they need)

### Shared UI Components ✅
- All apps use same shadcn/ui components
- Data-agnostic patterns (components don't know APIs)
- Single source of truth for design system

---

## Progress Checklist

### ✅ Completed
- [x] Folder structure created
- [x] Entry points configured (superadmin.tsx, tenant.tsx, public.tsx)
- [x] App.tsx placeholders for each app
- [x] Architecture plan documented

### 🚧 In Progress (Step 2)
- [ ] **Configure shadcn/ui** ⬅️ CURRENT
- [ ] Install core components (Button, Input, Card, Table)
- [ ] Set up path aliases (@/ imports)
- [ ] Update Vite config for multiple entry points

### 📋 Next Up (Step 3)
- [ ] Create Blade templates (dash-central, dash-tenant, public)
- [ ] Set up AuthContext
- [ ] Create API service layer
- [ ] Build DashboardLayout template

### 📋 Future
- [ ] Central App pages (Tenants, Users, Settings)
- [ ] Tenant App pages (Pages, Media, Navigation)
- [ ] Public App rendering (Puck display)

---

## Folder Structure

```
resources/js/
├── shared/                    # Shared across all apps
│   ├── components/
│   │   ├── ui/               # shadcn components
│   │   ├── atoms/            # Custom atoms
│   │   ├── molecules/        # FormField, SearchBox
│   │   ├── organisms/        # Header, Sidebar
│   │   └── templates/        # DashboardLayout
│   ├── puck/                 # PuckEditor config
│   ├── hooks/                # useAuth, useApi
│   ├── context/              # AuthContext
│   ├── services/             # API layer
│   ├── utils/                # Helpers
│   └── types/                # TypeScript types
│
├── apps/
│   ├── central/              # Central admin
│   │   ├── components/pages/
│   │   ├── routes/
│   │   ├── stores/
│   │   └── App.tsx
│   │
│   ├── tenant/               # Tenant CMS
│   │   ├── components/pages/
│   │   ├── routes/
│   │   ├── stores/
│   │   └── App.tsx
│   │
│   └── public/               # Public renderer
│       ├── components/
│       └── App.tsx
│
├── superadmin.tsx            # Entry: Central
├── tenant.tsx                # Entry: Tenant CMS
└── public.tsx                # Entry: Public
```

---

## Implementation Steps

### Step 1: Infrastructure ✅ DONE
```bash
# Folder structure created
# Entry points configured
```

### Step 2: shadcn/ui Setup 🚧 CURRENT
```bash
# Initialize shadcn
npx shadcn@latest init

# Install core components
npx shadcn@latest add button input card table dialog form
```

### Step 3: Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        superadmin: resolve(__dirname, 'resources/js/superadmin.tsx'),
        tenant: resolve(__dirname, 'resources/js/tenant.tsx'),
        public: resolve(__dirname, 'resources/js/public.tsx'),
      }
    }
  }
})
```

### Step 4: Blade Templates
```php
// resources/views/dash-central.blade.php
@vite(['resources/css/app.css', 'resources/js/superadmin.tsx'])
<div id="superadmin-app"></div>

// resources/views/dash-tenant.blade.php
@vite(['resources/css/app.css', 'resources/js/tenant.tsx'])
<div id="tenant-app"></div>

// resources/views/public.blade.php
@vite(['resources/css/app.css', 'resources/js/public.tsx'])
<div id="public-app"></div>
```

### Step 5: AuthContext
```typescript
// shared/context/AuthContext.tsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Authentication logic
  
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
```

### Step 6: API Service Layer
```typescript
// shared/services/http.ts
import axios from 'axios'

export const http = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
})

// Central API
export const centralApi = {
  tenants: {
    list: () => http.get('/central/tenants'),
    create: (data) => http.post('/central/tenants', data),
  }
}

// Tenant API
export const tenantApi = {
  pages: {
    list: () => http.get('/tenant/pages'),
    create: (data) => http.post('/tenant/pages', data),
  }
}
```

---

## Tech Stack

- **React 18.3.1** + TypeScript 5.9.3
- **Vite 7.1.9** (multi-entry build)
- **Tailwind CSS 4.1.14**
- **shadcn/ui** (UI components)
- **React Router** (client routing)
- **Zustand** (state management)
- **React Hook Form + Zod** (forms)
- **PuckEditor** (visual page builder)

---

## Success Criteria

### Phase 5.1: Infrastructure ✅
- [x] Folder structure matches architecture
- [x] Entry points working
- [x] TypeScript configured

### Phase 5.2: Shared Components (Current)
- [ ] shadcn/ui installed and configured
- [ ] DashboardLayout template working
- [ ] AuthContext providing user state
- [ ] API service layer functional

### Phase 5.3: Central App
- [ ] Login page working
- [ ] Tenant list/create/edit pages
- [ ] User management interface
- [ ] Dashboard with stats

### Phase 5.4: Tenant App
- [ ] Page management (list, create with Puck)
- [ ] Media library (upload, organize)
- [ ] Navigation builder (drag-drop menus)
- [ ] Settings page

### Phase 5.5: Public App
- [ ] Puck JSON renderer
- [ ] Public header/footer
- [ ] Theme integration

---

## Current Blockers

None - ready to proceed with Step 2 (shadcn/ui setup)

---

## Next Immediate Actions

1. **Initialize shadcn/ui**
   ```bash
   npx shadcn@latest init
   ```

2. **Install core components**
   ```bash
   npx shadcn@latest add button input card table dialog form badge avatar
   ```

3. **Update Vite config** - Add multiple entry points

4. **Create Blade templates** - All three entry views

5. **Test hot reload** - Verify all three apps load

---

**See:** `FRONTEND_ARCHITECTURE_PLAN.md` for complete architecture details.
