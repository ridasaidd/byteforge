# ByteForge - Project Architecture & Setup

**Last Updated**: January 22, 2026

## Table of Contents
1. [Technology Stack](#technology-stack)
2. [Project Structure](#project-structure)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Database Schema](#database-schema)
6. [API Routes](#api-routes)
7. [Build & Development](#build--development)
8. [Testing](#testing)
9. [Deployment](#deployment)

---

## Technology Stack

### Backend
- **Framework**: Laravel 12.0 (PHP 8.2+)
- **Authentication**: Laravel Passport (OAuth2)
- **Multi-tenancy**: Stancl/Tenancy 3.9
- **Permissions**: Spatie Laravel Permission 6.21
- **Activity Logging**: Spatie Laravel Activity Log 4.10
- **Media Management**: Spatie Laravel Media Library 11.14
- **Settings**: Spatie Laravel Settings 3.4
- **Image Processing**: Intervention Image Laravel 1.5
- **Actions**: Loris Leiva Laravel Actions 2.9

### Frontend
- **Framework**: React 18.3.1
- **Language**: TypeScript 5.9.3
- **Build Tool**: Vite 7.1.9
- **Routing**: React Router DOM 6.30.1
- **State Management**: 
  - React Query 5.90.2 (server state)
  - Zustand 5.0.8 (client state)
- **UI Components**: 
  - Radix UI (headless components)
  - shadcn/ui patterns
  - Tailwind CSS 4.1.14
- **Page Builder**: @measured/puck 0.20.2
- **Icons**: Lucide React 0.544.0
- **Drag & Drop**: @dnd-kit 6.3.1
- **Forms**: React Hook Form 7.64.0 + Zod 3.25.76
- **Notifications**: Sonner 2.0.7
- **Color Picker**: React Colorful 5.6.1
- **Date Utilities**: date-fns 4.1.0

### Testing
- **Backend**: PHPUnit 11.5.3
- **Frontend**: Vitest 3.2.4 + React Testing Library 16.3.0
- **Environment**: jsdom 27.0.0

### Development Tools
- **Debugger**: Laravel Debugbar 3.16
- **IDE Helper**: Laravel IDE Helper 3.6
- **Linting**: ESLint 9.37.0 + TypeScript ESLint 8.45.0
- **Code Formatting**: Laravel Pint 1.24
- **Log Viewer**: Laravel Pail 1.2.2

---

## Project Structure

```
byteforge/
├── app/                          # Laravel backend
│   ├── Actions/                  # Laravel Actions (business logic)
│   ├── Console/                  # Artisan commands
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/             # API controllers
│   │   │   │   ├── AuthController.php
│   │   │   │   ├── SuperadminController.php
│   │   │   │   ├── StatsController.php
│   │   │   │   ├── PageController.php
│   │   │   │   ├── NavigationController.php
│   │   │   │   ├── ThemeController.php
│   │   │   │   ├── ThemePartController.php
│   │   │   │   ├── MediaController.php
│   │   │   │   ├── RoleController.php
│   │   │   │   ├── PermissionController.php
│   │   │   │   └── ...
│   │   └── Middleware/
│   ├── Models/                  # Eloquent models
│   │   ├── User.php
│   │   ├── Tenant.php
│   │   ├── Page.php
│   │   ├── Navigation.php
│   │   ├── Theme.php
│   │   ├── ThemePart.php
│   │   ├── Media.php
│   │   └── ...
│   ├── Observers/               # Model observers
│   │   └── NavigationObserver.php
│   ├── Providers/               # Service providers
│   ├── Resolvers/               # Custom resolvers
│   ├── Services/                # Business logic services
│   │   ├── PuckCompilerService.php
│   │   ├── ThemeService.php
│   │   └── ...
│   └── Settings/                # Spatie settings classes
│
├── resources/
│   ├── css/
│   │   └── app.css              # Tailwind base styles
│   ├── js/
│   │   ├── superadmin.tsx       # Entry: Central admin app
│   │   ├── tenant.tsx           # Entry: Tenant CMS app
│   │   ├── public.tsx           # Entry: Public renderer
│   │   ├── apps/                # Application modules
│   │   │   ├── central/         # Central admin (superadmin)
│   │   │   │   ├── App.tsx
│   │   │   │   ├── components/pages/
│   │   │   │   │   ├── DashboardPage.tsx
│   │   │   │   │   ├── ThemesPage.tsx
│   │   │   │   │   ├── ThemeBuilderPage.tsx
│   │   │   │   │   ├── PagesPage.tsx
│   │   │   │   │   ├── PageEditorPage.tsx
│   │   │   │   │   ├── UsersPage.tsx
│   │   │   │   │   ├── TenantsPage.tsx
│   │   │   │   │   ├── ActivityLogPage.tsx
│   │   │   │   │   ├── SettingsPage.tsx
│   │   │   │   │   ├── RolesPermissionsPage.tsx
│   │   │   │   │   └── puck-components/   # Puck page builder components
│   │   │   │   └── config/
│   │   │   │       └── menu.ts          # Central app menu
│   │   │   ├── tenant/          # Tenant CMS
│   │   │   │   ├── App.tsx
│   │   │   │   └── components/pages/
│   │   │   └── public/          # Public renderer
│   │   │       ├── App.tsx
│   │   │       └── components/
│   │   └── shared/              # Shared across apps
│   │       ├── components/      # Reusable UI components
│   │       │   ├── ui/          # shadcn/ui primitives
│   │       │   ├── atoms/       # Small components (Logo, Icon)
│   │       │   ├── molecules/   # Medium components (Card, PageHeader)
│   │       │   ├── organisms/   # Large components (Header, Sidebar)
│   │       │   └── templates/   # Page layouts
│   │       ├── contexts/        # React contexts (Theme, Auth)
│   │       ├── hooks/           # Custom React hooks
│   │       ├── puck/            # Puck page builder setup
│   │       │   ├── components/  # Reusable Puck components
│   │       │   ├── config/      # Puck configuration
│   │       │   └── types/       # Puck TypeScript types
│   │       ├── services/        # API & business logic
│   │       │   ├── http.ts      # Axios client
│   │       │   └── api/         # API service modules
│   │       │       ├── auth.ts
│   │       │       ├── tenants.ts
│   │       │       ├── users.ts
│   │       │       ├── pages.ts
│   │       │       ├── themes.ts
│   │       │       ├── stats.ts
│   │       │       ├── media.ts
│   │       │       └── types.ts  # TypeScript types
│   │       ├── themes/          # Theme JSON files
│   │       │   ├── minimal/
│   │       │   │   └── theme.json
│   │       │   └── modern/
│   │       │       └── theme.json
│   │       ├── types/           # Global TypeScript types
│   │       └── utils/           # Utility functions
│   └── views/                   # Blade templates
│       ├── welcome.blade.php    # Default landing page
│       ├── dash-central.blade.php   # Dashboard app (authenticated)
│       └── public-central.blade.php # Public app (visitors)
│
├── routes/
│   ├── web.php                  # Web routes (central domain)
│   ├── api.php                  # API routes (central domain)
│   ├── tenant.php               # Tenant-scoped routes
│   └── console.php              # Artisan console routes
│
├── database/
│   ├── migrations/              # Database migrations
│   ├── seeders/                 # Database seeders
│   ├── factories/               # Model factories
│   └── settings/                # Settings migrations
│
├── config/                      # Laravel configuration files
│   ├── tenancy.php              # Multi-tenancy config
│   ├── passport.php             # OAuth config
│   ├── permission.php           # Permissions config
│   ├── media-library.php        # Media library config
│   ├── activitylog.php          # Activity logging config
│   └── ...
│
├── tests/
│   ├── Feature/                 # Feature tests (PHPUnit)
│   ├── Unit/                    # Unit tests (PHPUnit)
│   └── TestCase.php
│
├── DEVELOPMENT_DOCS/            # Project documentation
│   ├── PROJECT_ARCHITECTURE.md  # This file
│   ├── reference/THEME_SYSTEM_ARCHITECTURE.md
│   ├── reference/API_DOCUMENTATION.md
│   ├── PUCK_COMPONENT_TESTING_GUIDE.md
│   ├── CURRENT_STATUS.md
│   └── ...
│
├── package.json                 # NPM dependencies & scripts
├── composer.json                # PHP dependencies & scripts
├── vite.config.ts               # Vite build configuration
├── vitest.config.ts             # Vitest test configuration
├── phpunit.xml                  # PHPUnit configuration
├── tsconfig.json                # TypeScript configuration
├── eslint.config.js             # ESLint configuration
├── tailwind.config.js           # Tailwind CSS configuration
└── .env                         # Environment variables
```

---

## Backend Architecture

### Multi-Tenancy Setup

**Package**: `stancl/tenancy:^3.9`

**Central Domains**:
- Configured in `config/tenancy.php`
- Default: `byteforge.se` (development)
- Handles: superadmin dashboard, user authentication, theme management

**Tenant Domains**:
- Each tenant gets a unique subdomain (e.g., `acme.byteforge.se`)
- Tenant data isolated in `tenant_id` columns
- Automatic tenant context initialization via middleware

**Key Middleware**:
- `InitializeTenancyByDomain` - Sets tenant context based on domain
- `PreventAccessFromCentralDomains` - Blocks tenant routes on central domain

### Authentication & Authorization

**System**: Laravel Passport (OAuth2)

**Guards**:
- `api` - Token-based authentication for API routes
- `web` - Session-based for web routes

**Permissions** (Spatie Laravel Permission):
- `view tenants`, `manage tenants`
- `view users`, `manage users`
- `view settings`, `manage settings`
- `view activity logs`
- `manage roles`

**Roles**:
- `superadmin` - Full system access
- `admin` - Tenant admin
- Custom roles can be created

### Key Services

#### PuckCompilerService
**Location**: `app/Services/PuckCompilerService.php`

**Purpose**: Compiles Puck page data with theme tokens and metadata

**Methods**:
- `compilePage(Page $page)` - Compiles page with theme + header/footer
- `compileThemePart(ThemePart $part)` - Compiles theme part
- `gatherMetadata()` - Injects navigation, theme data for performance

#### ThemeService
**Location**: `app/Services/ThemeService.php`

**Purpose**: Manages theme operations

**Methods**:
- `syncThemesFromDisk()` - Import themes from `resources/js/shared/themes/`
- `activateTheme()` - Set theme as active for tenant
- `resetTheme()` - Reset to base theme from disk
- `duplicateTheme()` - Clone theme with new name

### Database Models

**Key Models**:
- `User` - User accounts
- `Tenant` - Multi-tenant organizations
- `Page` - CMS pages (Puck data)
- `Navigation` - Navigation menus
- `Theme` - Theme definitions
- `ThemePart` - Header/footer components
- `Media` - Uploaded files
- `TenantActivity` - Activity logs

**Relationships**:
- `Tenant` hasMany `Users`, `Pages`, `Themes`
- `Theme` hasMany `ThemeParts`, `PageTemplates`
- `Page` belongsTo `Layout`, `Theme`

### Observers

**NavigationObserver** (`app/Observers/NavigationObserver.php`):
- Watches navigation changes
- Auto-recompiles pages when navigation updates
- Ensures metadata stays fresh

---

## Frontend Architecture

### Multi-App Setup

**Three Independent Applications**:

1. **Central Admin** (`superadmin.tsx`)
   - Entry point: `resources/js/superadmin.tsx`
   - Blade template: `dash-central.blade.php`
   - Purpose: System administration
   - Routes: `/dashboard/*`
   - Features: Tenants, users, themes, pages, media, activity logs

2. **Tenant CMS** (`tenant.tsx`)
   - Entry point: `resources/js/tenant.tsx`
   - Purpose: Tenant content management
   - Routes: Tenant subdomain
   - Features: Pages, media, navigation (tenant-scoped)

3. **Public Renderer** (`public.tsx`)
   - Entry point: `resources/js/public.tsx`
   - Blade template: `public-central.blade.php`
   - Purpose: Render public pages
   - Routes: `/`, `/pages/:slug`
   - Features: Page rendering with Puck data

### State Management

**Server State** (React Query):
- API data fetching and caching
- Automatic refetching and invalidation
- Loading/error states
- Optimistic updates

**Global State** (React Context):
- `ThemeContext` - Active theme and token resolver
- `AuthContext` - User authentication state

**Local State** (Zustand - optional):
- Component-level state when needed

### API Services

**Location**: `resources/js/shared/services/api/`

**Architecture**:
- Each domain has its own service file
- Centralized HTTP client (`http.ts`) with token handling
- TypeScript types in `types.ts`

**Service Files**:
```typescript
// resources/js/shared/services/api/
├── http.ts              // Axios client with auth
├── types.ts             // All TypeScript interfaces
├── auth.ts              // Login, logout, user profile
├── tenants.ts           // Tenant CRUD
├── users.ts             // User management
├── pages.ts             // Page CRUD
├── navigations.ts       // Navigation menus
├── themes.ts            // Theme management
├── themeParts.ts        // Theme parts (header/footer)
├── pageTemplates.ts     // Page templates
├── media.ts             // Media upload/download
├── mediaFolders.ts      // Media folder organization
├── stats.ts             // Dashboard statistics
├── settings.ts          // System settings
└── activity.ts          // Activity logs
```

**Example Service**:
```typescript
// resources/js/shared/services/api/themes.ts
export const themes = {
  active: () => http.get<{ data: Theme }>('/superadmin/themes/active'),
  list: () => http.get<{ data: Theme[] }>('/superadmin/themes'),
  activate: (data) => http.post('/superadmin/themes/activate', data),
  update: (id, data) => http.put(`/superadmin/themes/${id}`, data),
  reset: (id) => http.post(`/superadmin/themes/${id}/reset`, {}),
  // ... more methods
};
```

### Component Architecture

**Atomic Design Pattern**:

```
shared/components/
├── ui/                  # Primitives (Button, Input, Card, Dialog)
├── atoms/               # Small components (Logo, Icon)
├── molecules/           # Medium components (Card, PageHeader, ListView)
├── organisms/           # Large components (Header, Sidebar, MediaPickerModal)
└── templates/           # Page layouts (DashboardLayout, AuthLayout)
```

**shadcn/ui Integration**:
- Radix UI primitives with Tailwind styling
- Copy-paste components (not installed as package)
- Full customization control
- Located in `resources/js/shared/components/ui/`

### Page Builder (Puck)

**Package**: `@measured/puck:^0.20.2`

**Config Location**: `resources/js/apps/central/components/pages/puck-components/`

**Components**:
- `Hero` - Hero sections
- `TextBlock` - Rich text
- `ButtonBlock` - CTA buttons
- `ImageBlock` - Images
- `CardGrid` - Card layouts
- `ContactForm` - Forms
- `Navigation` - Navigation menus

**Features**:
- Drag-and-drop visual editor
- Live preview
- Theme token integration
- Mobile/tablet/desktop viewport switcher
- Component customization controls

---

## Database Schema

### Core Tables

**users**
- `id`, `name`, `email`, `password`
- `avatar` - Profile picture path
- Multi-tenant via `memberships` pivot

**tenants**
- `id`, `name`, `slug`
- Stancl/Tenancy managed

**domains**
- `id`, `domain`, `tenant_id`
- Maps domains to tenants

**pages**
- `id`, `tenant_id` (nullable - NULL for central)
- `title`, `slug`, `status`, `page_type`
- `puck_data` - Puck component JSON
- `puck_data_compiled` - Compiled with metadata
- `is_homepage`, `layout_id`, `theme_id`

**navigations**
- `id`, `tenant_id` (nullable)
- `name`, `location`, `items` (JSON)
- `mobile_display_style`

**themes**
- `id`, `tenant_id` (nullable)
- `name`, `slug`, `description`
- `base_theme` - Reference to disk theme
- `theme_data` - JSON with tokens (customizable)
- `is_active`, `is_system_theme`

**theme_parts**
- `id`, `theme_id`, `type` (header/footer)
- `puck_data_raw` - Puck component JSON

**page_templates**
- `id`, `theme_id`, `name`, `slug`
- `puck_data` - Pre-built page layouts

**media** (Spatie Media Library)
- `id`, `model_type`, `model_id`
- `collection_name`, `name`, `file_name`
- `mime_type`, `size`, `disk`

**media_folders**
- `id`, `name`, `parent_id`
- Hierarchical folder structure

**activity_log** (Spatie Activity Log)
- `id`, `log_name`, `description`
- `subject_type`, `subject_id`
- `causer_type`, `causer_id`
- `properties` (JSON)

**permissions** & **roles** (Spatie Permission)
- RBAC system tables

### Indexes

**Performance Indexes**:
- `(tenant_id, is_active)` on `themes`
- `(tenant_id, slug)` on `pages`
- `(tenant_id, status)` on `pages`
- `media` table has indexes on `model_id`, `collection_name`

---

## API Routes

### Central Domain Routes (`/api`)

**Authentication** (`/auth`):
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/user` - Get authenticated user
- `PUT /auth/user` - Update profile
- `PUT /auth/password` - Change password
- `POST /auth/avatar` - Upload avatar
- `DELETE /auth/avatar` - Delete avatar

**Superadmin** (`/superadmin` - requires `auth:api`):
- `GET /superadmin/dashboard/stats` - Dashboard statistics (cached)
- `GET /superadmin/tenants` - List tenants
- `POST /superadmin/tenants` - Create tenant
- `GET /superadmin/users` - List users
- `POST /superadmin/users` - Create user
- `GET /superadmin/pages` - List pages (apiResource)
- `GET /superadmin/navigations` - List navigations (apiResource)
- `GET /superadmin/themes/active` - Get active theme
- `POST /superadmin/themes/activate` - Activate theme
- `POST /superadmin/themes/{id}/reset` - Reset to base
- `POST /superadmin/themes/{id}/duplicate` - Duplicate theme
- `GET /superadmin/themes/{id}/export` - Export theme JSON
- `GET /superadmin/activity-logs` - Activity logs
- `GET /superadmin/settings` - Get settings
- `PUT /superadmin/settings` - Update settings
- `GET /superadmin/media` - List media files
- `POST /superadmin/media` - Upload media
- `GET /superadmin/roles` - List roles
- `GET /superadmin/permissions` - List permissions

**Public** (no auth):
- `GET /api/health` - Health check
- `GET /api/themes/public` - Get public theme
- `GET /api/pages/public/homepage` - Get homepage
- `GET /api/pages/public/{slug}` - Get page by slug

### Tenant Routes (`/api` on tenant domain)

**Tenant API**:
- `GET /api/info` - Tenant info
- `GET /api/dashboard` - Tenant dashboard data
- Pages, media, navigation (tenant-scoped)

**Middleware**:
- `InitializeTenancyByDomain` - Sets tenant context
- `PreventAccessFromCentralDomains` - Blocks on central

---

## Build & Development

### NPM Scripts

```json
{
  "dev": "vite",                    // Start dev server
  "build": "tsc && vite build",     // Production build
  "preview": "vite preview",        // Preview production build
  "lint": "eslint .",               // Lint TypeScript
  "lint:fix": "eslint . --fix",     // Auto-fix linting issues
  "type-check": "tsc --noEmit",     // Check TypeScript types
  "test": "vitest",                 // Run tests in watch mode
  "test:run": "vitest run",         // Run tests once
  "test:ui": "vitest --ui",         // Run tests with UI
  "test:coverage": "vitest run --coverage" // Generate coverage
}
```

### Composer Scripts

```json
{
  "dev": "concurrently ... php artisan serve & queue & logs & npm run dev",
  "test": "@php artisan config:clear && @php artisan test"
}
```

**Development Command**:
```bash
composer dev
```
Runs in parallel:
- Laravel dev server (`:8000`)
- Queue worker
- Log viewer (Pail)
- Vite dev server (`:5173`)

### Vite Configuration

**Entry Points**:
- `resources/css/app.css` - Tailwind styles
- `resources/js/superadmin.tsx` - Central admin app
- `resources/js/tenant.tsx` - Tenant CMS app
- `resources/js/public.tsx` - Public renderer

**Aliases**:
- `@` → `resources/js/`

**Dev Server**:
- Host: `0.0.0.0` (all interfaces)
- Port: `5173`
- HMR: `byteforge.se`

### Environment Variables

**Key Variables**:
```env
APP_ENV=local
APP_DEBUG=true
APP_URL=http://byteforge.se

DB_CONNECTION=mysql
DB_DATABASE=byteforge

CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

PASSPORT_PRIVATE_KEY=...
PASSPORT_PUBLIC_KEY=...

CENTRAL_DOMAINS=byteforge.se
```

---

## Testing

### Backend Testing (PHPUnit)

**Configuration**: `phpunit.xml`

**Test Suites**:
- `tests/Unit/` - Unit tests
- `tests/Feature/` - Feature/integration tests

**Database**:
- Uses in-memory SQLite for speed
- `RefreshDatabase` trait for isolation

**Run Tests**:
```bash
php artisan test              # Run all tests
php artisan test --filter=ThemeTest  # Run specific test
```

**Test Count** (as of Jan 22, 2026):
- ✅ 111 Feature tests passing
- ✅ 12 Unit tests passing
- ✅ 123 total backend tests

### Frontend Testing (Vitest + React Testing Library)

**Configuration**: `vitest.config.ts`

**Test Patterns**:
- `resources/js/**/*.{test,spec}.{ts,tsx}` - Component/unit tests
- `tests/integration/**/*.{test,spec}.{ts,tsx}` - Integration tests

**Setup**: `src/test/setup.ts`

**Utilities**:
- `renderPuckComponent()` - Render with ThemeProvider
- `renderPuckComponentWithDragRef()` - Render with drag ref mock
- `mockThemeResolver()` - Mock theme token resolver

**Run Tests**:
```bash
npm test                      # Watch mode
npm run test:run              # Run once
npm run test:ui               # UI mode
npm run test:coverage         # With coverage
```

**Test Count** (as of Jan 19, 2026):
- ✅ 577 tests passing
- ✅ 52 E2E tests skipped (intentional)

### Test Documentation

- **Puck Component Testing**: `PUCK_COMPONENT_TESTING_GUIDE.md`
- **Testing Strategy**: `TESTING_STRATEGY.md`
- **Testing Checklist**: `TESTING_CHECKLIST.md`

---

## Deployment

### Production Build

```bash
# Frontend
npm run build

# Backend
composer install --optimize-autoloader --no-dev
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Assets

**Vite builds to**:
- `public/build/assets/` - JS/CSS bundles
- `public/build/manifest.json` - Asset manifest

### Queue Workers

**Required for**:
- Email sending
- Image processing
- Background jobs

```bash
php artisan queue:work --tries=3
```

### Cron Jobs

```cron
* * * * * cd /path-to-app && php artisan schedule:run >> /dev/null 2>&1
```

### Performance

**Optimizations**:
- OpCache enabled (PHP)
- Redis for cache/session
- Vite code splitting
- Image optimization (Intervention Image)
- HTTP caching with ETag
- Server-side caching (10min TTL for stats)
- Metadata injection (eliminates 3+ API calls per page)

---

## Key File Locations Quick Reference

### Backend
- Controllers: `app/Http/Controllers/Api/`
- Models: `app/Models/`
- Services: `app/Services/`
- Routes: `routes/api.php`, `routes/web.php`, `routes/tenant.php`
- Migrations: `database/migrations/`
- Config: `config/`

### Frontend
- Entry points: `resources/js/superadmin.tsx`, `tenant.tsx`, `public.tsx`
- Central app: `resources/js/apps/central/`
- Shared code: `resources/js/shared/`
- API services: `resources/js/shared/services/api/`
- Components: `resources/js/shared/components/`
- Puck components: `resources/js/apps/central/components/pages/puck-components/`
- Theme files: `resources/js/shared/themes/`

### Configuration
- Vite: `vite.config.ts`
- TypeScript: `tsconfig.json`
- Vitest: `vitest.config.ts`
- PHPUnit: `phpunit.xml`
- ESLint: `eslint.config.js`
- Tailwind: `tailwind.config.js`

---

## Related Documentation

- **Theme System**: `reference/THEME_SYSTEM_ARCHITECTURE.md`
- **API Reference**: `reference/API_DOCUMENTATION.md`
- **Puck Components**: `PUCK_COMPONENT_TESTING_GUIDE.md`
- **Current Status**: `CURRENT_STATUS.md`
- **Roadmap**: `ROADMAP.md`
- **Testing Guide**: `TESTING_STRATEGY.md`
- **Development Principles**: `DEVELOPMENT_PRINCIPLES.md`

---

_This document should be updated whenever major architectural changes are made._
