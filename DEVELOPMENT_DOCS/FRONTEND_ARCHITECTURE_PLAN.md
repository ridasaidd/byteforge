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

## Shared Components Architecture

### Component Hierarchy (Atomic Design + shadcn/ui)

```
shadcn/ui (Base Layer - Pre-built)
    ↓
Atoms (Custom brand elements)
    ↓
Molecules (Compositions of shadcn components)
    ↓
Organisms (Complex dashboard patterns)
    ↓
Templates (Page layouts)
    ↓
Pages (App-specific implementations)
```

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

---

## Shared Components Specification

### Templates (Layouts)

#### 1. **DashboardLayout** 🔴 CRITICAL
**Purpose:** Main application shell for Central and Tenant apps (based on shadcn dashboard example)  
**Layout:**
```
┌─────────────────────────────────────────────────┐
│ TopBar: [Logo] [Name] [Search] [Avatar Menu]   │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│  Drawer  │   Main Content Area                  │
│ (Sidebar)│   {children}                         │
│          │                                      │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

**Features:**
- TopBar (header) with logo, site name, search, avatar dropdown
- Drawer (sidebar) with navigation menu
- Collapsible sidebar (mobile overlay, desktop persistent)
- Main content area with proper spacing and scrolling
- Responsive behavior:
  - Desktop: Sidebar visible, TopBar full width
  - Tablet: Sidebar collapsible
  - Mobile: Sidebar as overlay, hamburger menu in TopBar
- Context-aware navigation (different menus for Central vs Tenant)

**Props:**
```typescript
interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
  showSidebar?: boolean
  siteName: string
  user: User
}
```

**Used By:** Central app, Tenant app  
**Test:** ✅ Yes (rendering, responsive behavior, sidebar toggle)

---

#### 2. **AuthLayout**
**Purpose:** Wrapper for login/register pages  
**Features:**
- Centered card design
- Logo at top
- Form container
- Background pattern/gradient
- Responsive

**Props:**
```typescript
interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}
```

**Used By:** Login, Register, Forgot Password pages  
**Test:** ⚠️ Optional (simple wrapper)

---

#### 3. **PublicLayout**
**Purpose:** Layout for tenant's public pages  
**Features:**
- Public header (tenant logo, navigation)
- Footer (copyright, links)
- SEO meta tags
- Theme support (tenant-specific styling)

**Props:**
```typescript
interface PublicLayoutProps {
  children: React.ReactNode
  page: PageData
  tenant: TenantData
}
```

**Used By:** Public app (Puck-rendered pages)  
**Test:** ⚠️ Optional (simple wrapper)

---

### Organisms (Complex Components)

#### 4. **TopBar** 🔴 CRITICAL
**Purpose:** Application header/navbar (inspired by shadcn dashboard example)  
**Layout:** `[Logo] [Site Name] [Spacer] [SearchBar] [Avatar Dropdown]`

**Features:**
- Logo (brand icon/image)
- Site name (e.g., "ByteForge", tenant name)
- Global search bar (centered/right-aligned)
- Avatar with dropdown menu (user profile, settings, logout)
- Responsive:
  - Desktop: Full layout as shown above
  - Mobile: Hamburger menu icon, collapsed search, avatar

**Props:**
```typescript
interface TopBarProps {
  logo?: React.ReactNode
  siteName: string
  user: User
  onSearch?: (query: string) => void
  onMenuToggle?: () => void // For mobile sidebar toggle
  searchPlaceholder?: string
}
```

**Avatar Dropdown Menu Items:**
- Profile
- Settings
- Divider
- Logout

**Used By:** DashboardLayout  
**Test:** ✅ Yes (search, dropdown menu, mobile toggle)

---

#### 5. **Drawer** (Sidebar) 🔴 CRITICAL
**Purpose:** Navigation sidebar  
**Features:**
- Navigation menu items (with icons)
- Active route highlighting
- Collapsible groups
- Collapse/expand functionality
- Different menus for Central vs Tenant
- Responsive (overlay on mobile, persistent on desktop)

**Props:**
```typescript
interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  menuItems: MenuItem[]
  activeRoute: string
}
```

**Menu Items (Central App):**
- Dashboard
- Tenants
- Users
- Settings
- Activity Log

**Menu Items (Tenant App):**
- Dashboard
- Pages
- Media
- Navigation
- Settings
- Team Members

**Used By:** DashboardLayout  
**Test:** ✅ Yes (navigation, active states, collapse)

---

#### 6. **UserMenu** 🟡 HIGH
**Purpose:** User profile dropdown in TopBar (Avatar component)  
**Trigger:** Avatar with user photo/initials

**Features:**
- Dropdown trigger: Avatar (circular image or initials)
- Menu items:
  - User name + email (header, non-clickable)
  - Profile link
  - Settings link
  - Divider
  - Logout button
- Dropdown animation (slide down/fade in)
- Click outside to close

**Props:**
```typescript
interface UserMenuProps {
  user: User // { name, email, avatar? }
  onLogout: () => void
}
```

**Menu Structure:**
```
┌─────────────────────┐
│ John Doe            │ ← Name
│ john@example.com    │ ← Email (muted)
├─────────────────────┤
│ 👤 Profile          │
│ ⚙️  Settings        │
├─────────────────────┤
│ 🚪 Logout           │
└─────────────────────┘
```

**Used By:** TopBar (right side)  
**Test:** ✅ Yes (logout action, navigation, dropdown open/close)

---

#### 7. **Footer**
**Purpose:** Application footer  
**Features:**
- Copyright text
- Links (Privacy, Terms, Support)
- Version info

**Props:**
```typescript
interface FooterProps {
  links?: FooterLink[]
  showVersion?: boolean
}
```

**Used By:** DashboardLayout (optional), PublicLayout  
**Test:** ⚠️ Optional (static content)

---

### Molecules (Component Compositions)

#### 8. **Card** 🟡 HIGH
**Purpose:** Enhanced shadcn Card with common patterns  
**Features:**
- Header with title + actions
- Content area
- Footer (optional)
- Loading state (skeleton)
- Empty state
- Error state

**Props:**
```typescript
interface CardProps {
  title?: string
  actions?: React.ReactNode
  footer?: React.ReactNode
  loading?: boolean
  empty?: boolean
  error?: string
  children: React.ReactNode
}
```

**Used By:** Dashboard widgets, forms, content containers  
**Test:** ✅ Yes (loading, empty, error states)

---

#### 9. **ListView** 🔴 CRITICAL
**Purpose:** Table/list view for data display  
**Features:**
- Built on shadcn Table
- Column sorting
- Row selection (checkboxes)
- Actions per row (edit, delete icons)
- Hover states
- Responsive (stack on mobile)

**Props:**
```typescript
interface ListViewProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (item: T) => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  selectable?: boolean
}
```

**Used By:** Tenants list, Users list, Pages list, Media list  
**Test:** ✅ Yes (sorting, selection, actions)

---

#### 10. **GridView** 🟡 HIGH
**Purpose:** Grid layout for cards (media, pages)  
**Features:**
- Responsive CSS Grid
- Card hover effects
- Actions overlay
- Selection mode
- Empty state

**Props:**
```typescript
interface GridViewProps<T> {
  items: T[]
  renderCard: (item: T) => React.ReactNode
  onSelect?: (item: T) => void
  columns?: { sm: number, md: number, lg: number }
}
```

**Used By:** Media gallery, Page thumbnails, Dashboard widgets  
**Test:** ✅ Yes (rendering, selection)

---

#### 11. **FormField** 🔴 CRITICAL
**Purpose:** Form input wrapper with validation  
**Features:**
- Label
- Input/Select/Textarea (shadcn)
- Error message display
- Helper text
- Required indicator
- Integrates with React Hook Form

**Props:**
```typescript
interface FormFieldProps {
  label: string
  name: string
  type?: 'text' | 'email' | 'password' | 'select' | 'textarea'
  placeholder?: string
  error?: string
  helperText?: string
  required?: boolean
}
```

**Used By:** All forms (Create tenant, Edit user, Page settings)  
**Test:** ✅ Yes (validation, error display)

---

#### 12. **SearchBox** 🔴 CRITICAL
**Purpose:** Global search input in TopBar (inspired by shadcn dashboard)  
**Features:**
- Search icon (magnifying glass)
- Input field with placeholder
- Clear button (X icon when text exists)
- Debounce (300ms) to avoid excessive API calls
- Loading indicator (spinner when searching)
- Keyboard shortcuts:
  - `Cmd/Ctrl + K` to focus
  - `Escape` to clear/blur
- Dropdown results (optional - can show recent searches or suggestions)

**Props:**
```typescript
interface SearchBoxProps {
  onSearch: (query: string) => void
  placeholder?: string // e.g., "Search tenants, pages, media..."
  debounceMs?: number // default 300
  loading?: boolean
  shortcuts?: boolean // Show "⌘K" hint
}
```

**Visual Design:**
```
┌───────────────────────────────────┐
│ 🔍  Search...              [⌘K]  │
└───────────────────────────────────┘
```

**Used By:** TopBar (center/right), ListView filters, Media library  
**Test:** ✅ Yes (debounce, clear button, keyboard shortcuts)

---

#### 13. **Pagination** 🔴 CRITICAL
**Purpose:** Navigate paginated results  
**Features:**
- Page numbers
- Previous/Next buttons
- Jump to page
- Items per page selector
- Total count display

**Props:**
```typescript
interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  itemsPerPage?: number
  onItemsPerPageChange?: (count: number) => void
}
```

**Used By:** ListView (with API pagination)  
**Test:** ✅ Yes (navigation logic)

---

#### 14. **EmptyState** 🟡 HIGH
**Purpose:** Display when no data exists  
**Features:**
- Icon (customizable)
- Title + description
- Action button (e.g., "Create first tenant")
- Illustration (optional)

**Props:**
```typescript
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}
```

**Used By:** ListView/GridView when empty, Error states  
**Test:** ✅ Yes (action button)

---

#### 15. **LoadingState** 🟢 MEDIUM
**Purpose:** Skeleton loaders for better UX  
**Features:**
- Skeleton shapes (rectangle, circle, text)
- Animated pulse
- Matches content layout

**Props:**
```typescript
interface LoadingStateProps {
  type: 'card' | 'list' | 'table' | 'custom'
  count?: number
}
```

**Used By:** During data fetching  
**Test:** ⚠️ Optional (visual component)

---

#### 16. **PageHeader** 🟡 HIGH
**Purpose:** Page title with actions  
**Features:**
- Page title
- Description (optional)
- Action buttons (e.g., "+ New Tenant")
- Breadcrumbs integration

**Props:**
```typescript
interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}
```

**Used By:** Every page (Tenants, Pages, Media, etc.)  
**Test:** ✅ Yes (rendering)

---

#### 17. **Modal** 🟡 HIGH
**Purpose:** Dialog/modal wrapper with common patterns  
**Features:**
- Extends shadcn Dialog
- Confirm dialog pattern
- Form dialog pattern
- Loading state
- Footer with actions

**Props:**
```typescript
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  loading?: boolean
}
```

**Used By:** Delete confirmations, Create/Edit forms  
**Test:** ✅ Yes (open/close, actions)

---

#### 18. **Breadcrumbs** 🟢 MEDIUM
**Purpose:** Show navigation trail  
**Features:**
- Clickable path segments
- Current page (not clickable)
- Separator icon
- Truncation for long paths

**Props:**
```typescript
interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  maxItems?: number
}
```

**Used By:** TopBar or below TopBar  
**Test:** ⚠️ Optional (navigation component)

---

### Atoms (Custom Brand Elements)

#### 19. **Logo**
**Purpose:** Application logo  
**Features:**
- SVG logo
- Light/dark variants
- Different sizes

**Props:**
```typescript
interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'light' | 'dark'
}
```

**Used By:** TopBar, AuthLayout  
**Test:** ❌ No (static SVG)

---

## Implementation Priority

### 🔴 Phase 1: Core Layout (Week 1 - Days 1-3) - CRITICAL
```
1. DashboardLayout (Template) - Everything depends on this
2. TopBar (Organism) - Header with user menu
3. Drawer (Organism) - Sidebar navigation
4. UserMenu (Organism) - Dropdown in TopBar
```

### 🟡 Phase 2: Data Display (Week 1 - Days 4-5) - HIGH
```
5. Card (Molecule) - Content containers
6. ListView (Molecule) - Table/list for CRUD
7. PageHeader (Molecule) - Page titles
8. EmptyState (Molecule) - No data states
```

### 🟡 Phase 3: Forms & Interaction (Week 2 - Days 1-2) - HIGH
```
9. FormField (Molecule) - Form inputs
10. SearchBox (Molecule) - Search/filter
11. Modal (Molecule) - Dialogs
12. Pagination (Molecule) - List navigation
```

### 🟢 Phase 4: Enhancements (Week 2 - Days 3-5) - MEDIUM
```
13. GridView (Molecule) - Grid layouts
14. LoadingState (Molecule) - Skeletons
15. Breadcrumbs (Molecule) - Navigation trail
16. AuthLayout (Template) - Login pages
17. PublicLayout (Template) - Public pages
18. Footer (Organism) - Page footer
```

---

## Component Testing Strategy

### ✅ MUST Test (Business Logic & Interactions)
- DashboardLayout, TopBar, Drawer, UserMenu
- ListView, FormField, SearchBox, Pagination, Modal
- Card (loading/empty/error states)
- EmptyState (action buttons)

### ⚠️ OPTIONAL Tests (Simple Wrappers)
- AuthLayout, PublicLayout, Footer
- Breadcrumbs, LoadingState

### ❌ SKIP Tests
- shadcn/ui components (pre-tested)
- Logo (static SVG)

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
