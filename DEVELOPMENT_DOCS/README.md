# ByteForge Documentation Index

This folder holds a slim, up‑to‑date set of docs for contributors and reviewers. It replaces earlier phase-by-phase notes with a concise overview of what matters now.

—

## Quick Navigation

### 🚀 Start Here
- **Project Architecture & Setup**: [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) ⭐ **ESSENTIAL - Read First**
- **Architecture Migration Plan**: [ARCHITECTURE_MIGRATION_PLAN.md](ARCHITECTURE_MIGRATION_PLAN.md) ⭐ **NEW - Decision & Roadmap**
- **Current Status**: [CURRENT_STATUS.md](CURRENT_STATUS.md)
- **Roadmap**: [ROADMAP.md](ROADMAP.md)
- **Principles**: [DEVELOPMENT_PRINCIPLES.md](DEVELOPMENT_PRINCIPLES.md) and [AI_COLLABORATION_GUIDE.md](AI_COLLABORATION_GUIDE.md)

### 📐 Architecture & Design
- **Project Architecture**: [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) - Complete tech stack, structure, setup
- **Architecture Migration Plan**: [ARCHITECTURE_MIGRATION_PLAN.md](ARCHITECTURE_MIGRATION_PLAN.md) - Hybrid refactoring strategy + 10-week roadmap
- **Design Patterns & Best Practices**: [DESIGN_PATTERNS_AND_BEST_PRACTICES.md](DESIGN_PATTERNS_AND_BEST_PRACTICES.md) - 30 patterns explained with examples
- **Frontend Architecture**: [FRONTEND_ARCHITECTURE_PLAN.md](FRONTEND_ARCHITECTURE_PLAN.md)
- **Theme System**: [THEME_SYSTEM_ARCHITECTURE.md](THEME_SYSTEM_ARCHITECTURE.md)
- **Puck Roadmap & Architecture**: [PUCK_ROADMAP_AND_ARCHITECTURE.md](PUCK_ROADMAP_AND_ARCHITECTURE.md)
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
- **Dashboard home** with stats, recent tenants, activity (Jan 22, 2026)
- **Stats API optimization** with caching (Jan 22, 2026)

### Key Code Entry Points
- **Puck Components**: `resources/js/shared/puck/components/`
- **Puck Fields & Controls**: `resources/js/shared/puck/fields/`
- **Theme Provider**: `resources/js/shared/contexts/ThemeContext.tsx`
- **Theme Hook**: `resources/js/shared/hooks/useTheme.ts`
- **API Services**: `resources/js/shared/services/api/`
- **Public Render**: `resources/js/apps/central/components/pages/PublicPage.tsx`

—

## How to Use These Docs

### For New Contributors or Context Refresh
1. **MUST READ**: [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) - Full tech stack, structure, packages, setup
2. **Current State**: [CURRENT_STATUS.md](CURRENT_STATUS.md) - What's done, what's next
3. **Architecture Deep Dive**: Domain-specific docs (Theme, Frontend, API, etc.)

### For Page Builder Work
1. **Start with**: [PUCK_ROADMAP_AND_ARCHITECTURE.md](PUCK_ROADMAP_AND_ARCHITECTURE.md) - Complete roadmap and patterns
2. **Check**: Archived Puck docs in `ARCHIVE/` for historical context
3. **Testing**: [PUCK_COMPONENT_TESTING_GUIDE.md](PUCK_COMPONENT_TESTING_GUIDE.md)

### For Theme Customization
1. **Architecture**: [THEME_SYSTEM_ARCHITECTURE.md](THEME_SYSTEM_ARCHITECTURE.md) - Complete theme system guide
2. **Implementation**: See ThemeBuilderPage vs ThemeCustomizerPage sections
3. **API**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Theme endpoints

### For General Development
1. **Status Check**: [CURRENT_STATUS.md](CURRENT_STATUS.md) - What's done, what's next
2. **Architecture**: [FRONTEND_ARCHITECTURE_PLAN.md](FRONTEND_ARCHITECTURE_PLAN.md) - App structure
3. **API Reference**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Endpoint shapes
4. **Next Steps**: [ROADMAP.md](ROADMAP.md) - Short-term focus

—

## Document Purpose Guide

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **PROJECT_ARCHITECTURE.md** | Complete tech stack, packages, structure, build setup | Starting new work, onboarding, architecture questions |
| **ARCHITECTURE_MIGRATION_PLAN.md** | Refactoring strategy, phases, decision rationale | Planning feature work, understanding migration approach |
| **DESIGN_PATTERNS_AND_BEST_PRACTICES.md** | 30 recommended patterns, code quality, performance, security | Implementing features, refactoring, code reviews |
| **CURRENT_STATUS.md** | What's complete, what's next, recent changes | Daily standup, progress tracking |
| **ROADMAP.md** | Milestones, priorities, estimates | Planning, sprint goals |
| **THEME_SYSTEM_ARCHITECTURE.md** | Theme system from disk→DB→UI | Theme customization work |
| **API_DOCUMENTATION.md** | All API endpoints and shapes | Building frontend features |
| **PUCK_COMPONENT_TESTING_GUIDE.md** | Testing patterns for Puck | Writing component tests |
| **FRONTEND_ARCHITECTURE_PLAN.md** | React app structure, patterns | Building new pages/components |

—

## Recent Updates

### January 22, 2026
- ✅ Added **ARCHITECTURE_MIGRATION_PLAN.md** - Hybrid refactoring strategy (build features + improve incrementally)
- ✅ Added **DESIGN_PATTERNS_AND_BEST_PRACTICES.md** - 30 patterns with code examples and implementation guides
- ✅ Added **PROJECT_ARCHITECTURE.md** - Complete codebase audit and setup guide
- ✅ Updated **THEME_SYSTEM_ARCHITECTURE.md** - Added ThemeBuilder vs ThemeCustomizer comparison
- ✅ Dashboard stats optimization completed (1 API call with caching)
- ✅ Public/dashboard blade separation for performance

### December 25, 2025
- Archived Puck documents consolidated into `PUCK_ROADMAP_AND_ARCHITECTURE.md`
- Moved legacy docs to `ARCHIVE/` folder

—

Last updated: January 22, 2026  
Current branch: main
