# Frontend Architecture

## Overview

Multi-app React/TypeScript frontend with three independent applications sharing common components and services:

- **Central App** (`superadmin.tsx`): Tenants, users, themes, system settings
- **Tenant App** (`tenant.tsx`): CMS for pages, media, navigation (Puck editor integration)
- **Public App** (`public.tsx`): Renders tenant pages using Puck data

### Architecture
Three separate entry points with shared infrastructure:
- Independent routing and API endpoints per app
- Shared UI components, hooks, and API services
- Central and Tenant apps share dashboard layout patterns
- Public app is render-only (no admin UI)

## Technology Stack

- **React 18.3.1** + **TypeScript 5.9.3**
- **Vite** (multiple entry points)
- **Tailwind CSS + shadcn/ui**
- **React Router** (client-side routing)
- **React Query** (data fetching/caching)
- **Puck** (visual page builder)
- **Sonner** (toast notifications)
- **Vitest + React Testing Library**

## Project Structure

```
resources/js/
├── shared/                     # Shared across all apps
│   ├── components/
│   │   ├── ui/                # shadcn components (Button, Input, Card, etc.)
│   │   ├── atoms/             # Logo, Icon
│   │   ├── molecules/         # Card, PageHeader, ListView, etc.
│   │   ├── organisms/         # Header, Sidebar, MediaPickerModal
│   │   └── templates/         # DashboardLayout, AuthLayout
│   ├── puck/                  # Puck page builder
│   │   ├── components/        # Hero, TextBlock, ButtonBlock, etc.
│   │   ├── config/            # Puck configuration
│   │   └── types/
│   ├── contexts/              # ThemeContext, AuthContext
│   ├── hooks/                 # useAuth, useTheme, useToast, etc.
│   ├── services/              # API services (http, auth, api/*)
│   ├── themes/                # Theme JSON files (minimal, modern, etc.)
│   ├── types/                 # TypeScript types
│   └── utils/                 # Utilities
│
├── apps/
│   ├── central/               # Central admin app
│   │   ├── components/pages/  # Tenants, Users, Themes, Settings
│   │   ├── routes/            # Central routing
│   │   ├── config/            # Central config
│   │   └── App.tsx
│   │
│   ├── tenant/                # Tenant CMS app
│   │   ├── components/pages/  # Dashboard, Pages, Media, Navigation
│   │   ├── routes/            # Tenant routing
│   │   ├── config/            # Tenant config
│   │   └── App.tsx
│   │
│   └── public/                # Public renderer
│       ├── components/        # PublicHeader, PageRenderer
│       └── App.tsx
│
├── superadmin.tsx             # Entry: Central admin
├── tenant.tsx                 # Entry: Tenant CMS
└── public.tsx                 # Entry: Public pages
```

## API Services Architecture

All API calls go through typed service modules in `shared/services/api/`:

- **auth.ts** - Login, logout, user profile
- **tenants.ts** - Tenant CRUD
- **users.ts** - User management
- **pages.ts** - Page CRUD, publish/unpublish
- **media.ts** - Media upload, retrieval, deletion
- **mediaFolders.ts** - Media folder organization
- **themes.ts** - Theme sync, activate, customize, export/import
- **settings.ts** - System settings
- **navigations.ts** - Navigation menus
- **activity.ts** - Activity logs

All services use the centralized `http` client with auth token handling.

## State Management

- **React Context**: Auth state, Theme state (app-level)
- **React Query**: Server state caching and synchronization
- **Component State**: Local UI state (useState)

## Key Features Implemented

### Page Builder (Puck)
- Custom components: Hero, TextBlock, ButtonBlock, ImageBlock, CardGrid, ContactForm
- Visual editor with drag-and-drop
- Template system with pre-built page layouts
- Media picker integration

### Theme System
- ThemeProvider context with `resolve(path)` for dot-notation token access
- Themes API: sync from disk, activate, customize, reset, duplicate, export/import
- Theme JSON structure with colors, typography, spacing, components, templates
- Active theme loaded globally via context

### Media Library
- Upload to folders
- Media picker modal for Puck components
- Image optimization and thumbnails

### Admin Pages
- **Central**: Tenants, Users, Themes, Settings, Activity Logs
- **Tenant**: Pages (with Puck editor), Media, Navigation, Dashboard

### Public Rendering
- Renders pages from Puck JSON
- Theme-aware styling

## Implementation Status

✅ **Completed**:
- Three-app architecture with separate entry points
- Shared component library (atoms, molecules, organisms, templates)
- API services layer with typed clients
- Page Builder with Puck (Hero, TextBlock, ButtonBlock, ImageBlock, CardGrid, ContactForm)
- Theme system with context provider and API integration
- Media library with folder organization and picker modal
- Admin pages for Central (Tenants, Users, Themes, Settings, Activity) and Tenant (Pages, Media, Navigation, Dashboard)
- Public page renderer with Puck JSON support
- React Query for server state management
- Toast notifications via Sonner
- Authentication context and hooks

🚧 **To-Do**:
- Component test coverage expansion
- Additional Puck components as needed
- Performance optimization (code splitting, lazy loading)
- Enhanced theme customizer UI
- Navigation builder enhancements

---

_See `CURRENT_STATUS.md` and `ROADMAP.md` for broader project status._

