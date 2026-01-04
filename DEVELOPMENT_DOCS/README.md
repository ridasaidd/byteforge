# ByteForge Documentation Index

This folder holds a slim, up‑to‑date set of docs for contributors and reviewers. It replaces earlier phase-by-phase notes with a concise overview of what matters now.

—

## Quick Navigation

### 🚀 Start Here
- **Current status**: [CURRENT_STATUS.md](CURRENT_STATUS.md)
- **Puck Roadmap & Architecture**: [PUCK_ROADMAP_AND_ARCHITECTURE.md](PUCK_ROADMAP_AND_ARCHITECTURE.md) ⭐ NEW
- **Roadmap**: [ROADMAP.md](ROADMAP.md)
- **Principles**: [DEVELOPMENT_PRINCIPLES.md](DEVELOPMENT_PRINCIPLES.md) and [AI_COLLABORATION_GUIDE.md](AI_COLLABORATION_GUIDE.md)

### 📐 Architecture & Design
- **Frontend Architecture**: [FRONTEND_ARCHITECTURE_PLAN.md](FRONTEND_ARCHITECTURE_PLAN.md)
- **Theme System**: [THEME_SYSTEM_ARCHITECTURE.md](THEME_SYSTEM_ARCHITECTURE.md)
- **API Documentation**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Auth Strategy**: [AUTH_STRATEGY.md](AUTH_STRATEGY.md)

### 🧪 Testing
- **Testing Strategy**: [TESTING_STRATEGY.md](TESTING_STRATEGY.md)
- **Puck Component Testing**: [PUCK_COMPONENT_TESTING_GUIDE.md](PUCK_COMPONENT_TESTING_GUIDE.md)
- **Puck Testing Summary**: [PUCK_TESTING_SUMMARY.md](PUCK_TESTING_SUMMARY.md)
- **Testing Checklist**: [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)
- **Test Credentials**: [TESTING_CREDENTIALS.md](TESTING_CREDENTIALS.md)

—

## What's Implemented (High Level)

- **Multi-tenant backend** with Passport auth, RBAC, activity logging
- **Full media library** with folders, conversions, and React UI
- **Puck-based Page Builder** with themed components and advanced controls
- **Theme system** with disk sync, active theme, and theme editor endpoints
- **Public page rendering** using Puck data and active theme
- **Central admin app** with pages, themes, users, tenants, activity, settings

### Key Code Entry Points
- **Puck Components**: `resources/js/shared/puck/components/`
- **Puck Fields & Controls**: `resources/js/shared/puck/fields/`
- **Theme Provider**: `resources/js/shared/contexts/ThemeContext.tsx`
- **Theme Hook**: `resources/js/shared/hooks/useTheme.ts`
- **API Services**: `resources/js/shared/services/api/`
- **Public Render**: `resources/js/apps/central/components/pages/PublicPage.tsx`

—

## How to Use These Docs

### For Page Builder Work (Current Branch)
1. **Start with**: [PUCK_ROADMAP_AND_ARCHITECTURE.md](PUCK_ROADMAP_AND_ARCHITECTURE.md) - Complete roadmap and patterns
2. **Check**: Archived Puck docs in `ARCHIVE/` for historical context
3. **Testing**: [PUCK_COMPONENT_TESTING_GUIDE.md](PUCK_COMPONENT_TESTING_GUIDE.md)

### For General Development
1. **Status Check**: [CURRENT_STATUS.md](CURRENT_STATUS.md) - What's done, what's next
2. **Architecture**: [FRONTEND_ARCHITECTURE_PLAN.md](FRONTEND_ARCHITECTURE_PLAN.md) - App structure
3. **API Reference**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Endpoint shapes
4. **Next Steps**: [ROADMAP.md](ROADMAP.md) - Short-term focus

—

## Recent Consolidation (December 25, 2025)

### 📁 Archived Puck Documents
Moved to `ARCHIVE/` and consolidated into `PUCK_ROADMAP_AND_ARCHITECTURE.md`:
- ~~PUCK_IMPLEMENTATION_CHECKLIST.md~~
- ~~PUCK_ARCHITECTURE_REFACTOR.md~~
- ~~FIELD_GROUPS_CONSOLIDATION.md~~
- ~~UI_CONTROL_REFACTORING.md~~
- ~~PUCK_INLINE_STRATEGY.md~~
- ~~PUCK_STYLING_GUIDELINES.md~~

All information preserved and organized by priority in the new roadmap document.

—

Last updated: December 25, 2025  
Current branch: page-builder
