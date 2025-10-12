# ByteForge Development Documentation

This folder contains all active development documentation for the ByteForge project.

---

## 📋 Quick Navigation

### Start Here
- **[CURRENT_STATUS.md](CURRENT_STATUS.md)** - Current project status, what's done, what's next
- **[FRONTEND_ARCHITECTURE_PLAN.md](FRONTEND_ARCHITECTURE_PLAN.md)** - Complete frontend architecture guide

### Reference Documents
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Backend API endpoint reference
- **[TESTING_CREDENTIALS.md](TESTING_CREDENTIALS.md)** - Test accounts and credentials
- **[DEVELOPMENT_PRINCIPLES.md](DEVELOPMENT_PRINCIPLES.md)** - Coding principles and standards
- **[AI_COLLABORATION_GUIDE.md](AI_COLLABORATION_GUIDE.md)** - AI pair programming protocol

### Development Phases
See `/PHASES/` folder:
- **[PHASES_1-4_BACKEND_COMPLETED.md](PHASES/PHASES_1-4_BACKEND_COMPLETED.md)** - Backend completion summary
- **[PHASE_5_FRONTEND_IMPLEMENTATION.md](PHASES/PHASE_5_FRONTEND_IMPLEMENTATION.md)** - Current phase (frontend)

### Archive
Old/outdated documentation moved to `/ARCHIVE/` - kept for historical reference.

---

## 🎯 Current Focus

**Phase 5: Frontend Implementation** (In Progress)
- Setting up React + TypeScript infrastructure
- Configuring shadcn/ui components
- Building three separate apps (Central, Tenant, Public)

**See:** [PHASE_5_FRONTEND_IMPLEMENTATION.md](PHASES/PHASE_5_FRONTEND_IMPLEMENTATION.md) for current tasks.

---

## 📊 Project Status at a Glance

- **Backend:** ✅ 100% Complete (all APIs operational)
- **Frontend:** 🚧 20% Complete (infrastructure setup)
- **Overall:** ~25% Complete

**Next Immediate Step:** Configure shadcn/ui and create shared components.

---

## 🏗️ Architecture Overview

### Three React Applications
1. **Central App** (`superadmin.tsx`) - Manage tenants, users, system settings
2. **Tenant App** (`tenant.tsx`) - CMS for pages, media, navigation
3. **Public App** (`public.tsx`) - Render Puck-built pages for visitors

### Shared UI Components
- All apps use same shadcn/ui design system
- Data-agnostic components (reusable across contexts)
- Single source of truth for styling and interactions

### Backend APIs
- **Central Domain:** `/api/central/*` (tenant/user management)
- **Tenant Domain:** `/api/tenant/*` (pages, media, navigation)
- **Public:** `/api/public/*` (page rendering)

---

## 📁 File Organization

```
DEVELOPMENT_DOCS/
├── CURRENT_STATUS.md              # Start here: Current state
├── FRONTEND_ARCHITECTURE_PLAN.md  # Frontend implementation guide
├── API_DOCUMENTATION.md           # Backend API reference
├── TESTING_CREDENTIALS.md         # Test accounts
├── DEVELOPMENT_PRINCIPLES.md      # Coding standards
├── AI_COLLABORATION_GUIDE.md      # AI pairing protocol
│
├── PHASES/                        # Development phases
│   ├── PHASES_1-4_BACKEND_COMPLETED.md
│   └── PHASE_5_FRONTEND_IMPLEMENTATION.md
│
└── ARCHIVE/                       # Historical docs (outdated)
```

---

## 🚀 Getting Started (New Developers)

1. Read **CURRENT_STATUS.md** - Understand where we are
2. Read **FRONTEND_ARCHITECTURE_PLAN.md** - Understand the architecture
3. Check **PHASE_5_FRONTEND_IMPLEMENTATION.md** - See current tasks
4. Review **API_DOCUMENTATION.md** - Know the backend APIs
5. Start coding! Follow **DEVELOPMENT_PRINCIPLES.md**

---

## 🤝 Working with AI

If collaborating with AI (GitHub Copilot, etc.), share:
1. **AI_COLLABORATION_GUIDE.md** - Protocol for structured collaboration
2. **DEVELOPMENT_PRINCIPLES.md** - Coding standards to follow
3. **Current phase doc** - What we're working on

This ensures AI assistance stays aligned with project goals.

---

## 📝 Keeping Documentation Updated

When completing work:
- ✅ Update **CURRENT_STATUS.md** with new progress
- ✅ Check off completed items in current **PHASE_X** document
- ✅ Update **FRONTEND_ARCHITECTURE_PLAN.md** if architecture changes
- ✅ Add new API endpoints to **API_DOCUMENTATION.md**

When starting new phase:
- Create new **PHASE_X_NAME.md** in `/PHASES/`
- Move completed phase to `/ARCHIVE/` if no longer relevant
- Update **CURRENT_STATUS.md** with new focus

---

**Last Updated:** October 12, 2025  
**Current Branch:** `feature/frontend-stack-setup`
