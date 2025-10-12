# Frontend Architecture Plan

## Overview

Multi-app React/TypeScript frontend with three independent applications sharing a common UI design system:

- **Central App** (`superadmin.tsx`): Manage tenants, users, system settings
- **Tenant App** (`tenant.tsx`): CMS for pages, media, navigation (PuckEditor integration)
- **Public App** (`public.tsx`): Public page renderer (displays Puck JSON configurations)

### Key Architecture Decision
**Three separate entry points** with **shared UI components**:
- Each app has different routes and API endpoints
- UI components are **data-agnostic** (no hardcoded APIs)
- Central and Tenant share same control panel design but different business logic
- Public app is completely separate (no dashboard UI)

## Technology Stack

- **React 18.3.1** + **TypeScript 5.9.3**
- **Vite 7.1.9** (multiple entry points)
- **Tailwind CSS 4.1.14**
- **shadcn/ui** (shared UI components)
- **React Router** (client-side routing)
- **React Hook Form + Zod** (form validation)
- **Zustand** (state management)
- **PuckEditor** (visual page builder)
- **Vitest + React Testing Library** (testing)

## Why Three Entry Points?

### Different Routes
```
Central:  /dashboard/tenants, /dashboard/users, /dashboard/settings
Tenant:   /dashboard/pages, /dashboard/media, /dashboard/navigation
Public:   /, /about, /contact (Puck-rendered pages)
```

### Different API Endpoints
```
Central:  /api/central/tenants, /api/central/users
Tenant:   /api/tenant/pages, /api/tenant/media
Public:   /api/public/pages/{slug}
```

### Benefits
- ✅ Clear separation of concerns
- ✅ Smaller bundle sizes (users load only what they need)
- ✅ Independent optimization per app
- ✅ Shared UI components (no duplication)
- ✅ Data-agnostic components (reusable across apps)

## Folder Structure (Simplified)

```
resources/js/
├── shared/                     # Shared across all apps
│   ├── components/
│   │   ├── ui/                # shadcn components (Button, Input, Card, Table, etc.)
│   │   ├── atoms/             # Custom atoms (Icon, Logo)
│   │   ├── molecules/         # FormField, SearchBox, Pagination, DataTable
│   │   ├── organisms/         # Header, Sidebar, Footer, UserMenu
│   │   └── templates/         # DashboardLayout, AuthLayout, PublicLayout
│   ├── puck/                  # PuckEditor components & config
│   │   ├── components/        # Hero, TextBlock, ImageBlock, etc.
│   │   ├── config/            # puck.config.tsx
│   │   └── types/
│   ├── hooks/                 # useAuth, useApi, useTenant
│   ├── context/               # AuthContext, TenantContext
│   ├── services/              # API services (http.ts, auth.service.ts)
│   ├── utils/                 # Helpers, formatters, validation
│   └── types/                 # Shared TypeScript types
│
├── apps/
│   ├── central/               # Central admin app
│   │   ├── components/pages/  # Dashboard, Tenants, Users, Settings
│   │   ├── routes/            # Central routing
│   │   ├── stores/            # tenantStore, userStore (Zustand)
│   │   ├── types/             # Central-specific types
│   │   └── App.tsx
│   │
│   ├── tenant/                # Tenant CMS app
│   │   ├── components/pages/  # Dashboard, Pages, Media, Navigation
│   │   ├── routes/            # Tenant routing
│   │   ├── stores/            # pageStore, mediaStore (Zustand)
│   │   ├── types/             # Tenant-specific types
│   │   └── App.tsx
│   │
│   └── public/                # Public page renderer
│       ├── components/        # PublicHeader, PublicFooter, PageRenderer
│       ├── types/
│       └── App.tsx
│
├── superadmin.tsx             # Entry: Central admin
├── tenant.tsx                 # Entry: Tenant CMS
└── public.tsx                 # Entry: Public pages
```

## Component Strategy: Data-Agnostic UI

### Shared UI Components (shadcn/ui)
All apps use the same components from `shared/components/ui/`:
- Button, Input, Card, Table, Dialog, Form, Badge, Avatar, etc.
- Import: `import { Button } from '@/shared/components/ui/button'`

### Data-Agnostic Pattern
Components don't know about APIs - they only handle presentation:

```typescript
// ✅ GOOD: Data-agnostic
function UserTable({ users, onEdit, onDelete }) {
  return (
    <Table>
      {users.map(user => (
        <TableRow key={user.id}>
          <TableCell>{user.name}</TableCell>
          <TableCell>
            <Button onClick={() => onEdit(user)}>Edit</Button>
          </TableCell>
        </TableRow>
      ))}
    </Table>
  )
}

// Central App: Uses /api/central/users
function CentralUsersPage() {
  const { data } = useQuery('/api/central/users')
  return <UserTable users={data} onEdit={handleEdit} />
}

// Tenant App: Uses /api/tenant/members  
function TenantMembersPage() {
  const { data } = useQuery('/api/tenant/members')
  return <UserTable users={data} onEdit={handleEdit} />
}
```

## State Management

- **React Context**: Auth, Tenant info (app-level, infrequent changes)
- **Zustand**: Feature stores (pages, media, navigation - frequent updates)

## Vite Configuration

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

## Laravel Integration

```php
// Central admin routes
Route::middleware(['auth', 'role:superadmin'])->group(function () {
    Route::get('/dashboard', fn() => view('dash-central'));
});

// Tenant routes (subdomain)
Route::middleware(['tenant', 'auth'])->group(function () {
    Route::get('/dashboard', fn() => view('dash-tenant'));
});

// Public pages
Route::get('/{slug?}', fn($slug) => view('public', ['page' => $page]));
```

## Implementation Phases

### Phase 1: Foundation ✅ (Completed)
- [x] Folder structure created
- [x] Entry points configured
- [x] Backend APIs complete (Pages, Media, Navigation, Settings)

### Phase 2: Shared Infrastructure (Current)
- [ ] Configure shadcn/ui
- [ ] Create shared UI components
- [ ] Set up AuthContext and API services
- [ ] Create DashboardLayout template
- [ ] Configure Vite for multiple entry points

### Phase 3: Central App
- [ ] Tenant management pages
- [ ] User management interface
- [ ] System settings
- [ ] Dashboard with stats

### Phase 4: Tenant App
- [ ] Page management (list, create, edit with Puck)
- [ ] Media library interface
- [ ] Navigation builder
- [ ] Settings management

### Phase 5: Public App
- [ ] Page renderer (Puck JSON display)
- [ ] Public header/footer components
- [ ] Theme integration

## Next Steps

1. **Configure shadcn/ui** - Initialize and install core components
2. **Update Vite config** - Add multiple entry points
3. **Create Blade templates** - dash-central.blade.php, dash-tenant.blade.php, public.blade.php
4. **Set up path aliases** - Configure @/ imports in tsconfig.json
5. **Create AuthContext** - Shared authentication provider
6. **Build DashboardLayout** - First shared template component
