# ByteForge Documentation Index

This folder contains organized documentation for the ByteForge multi-tenant CMS platform.

Last updated: March 14, 2026

---

## Quick Start

| Document | Description |
|----------|-------------|
| [CURRENT_STATUS.md](CURRENT_STATUS.md) | What's done, what's next, recent changes |
| [ROADMAP.md](ROADMAP.md) | Milestones, priorities, estimates |
| [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) | Tech stack, folder structure, setup |

---

## Active Documentation

### 📋 Status & Planning
- [CURRENT_STATUS.md](CURRENT_STATUS.md) - Current state, completed features, next steps
- [ROADMAP.md](ROADMAP.md) - Milestones and priorities
- [PHASE12_TENANT_RUNTIME_READINESS.md](PHASE12_TENANT_RUNTIME_READINESS.md) - **Current phase: tenant storefront/login/dashboard readiness gate**
- [COOKIE_CONSENT_GDPR_AUDIT_AND_PLAN.md](COOKIE_CONSENT_GDPR_AUDIT_AND_PLAN.md) - GDPR cookie consent audit, scope rules, and implementation plan
- [AUTH_HTTPONLY_MIGRATION_PLAN.md](AUTH_HTTPONLY_MIGRATION_PLAN.md) - Planned migration from browser storage tokens to host-scoped HttpOnly refresh-cookie auth
- Booking Integration (Phase 13) - planned after tenant runtime readiness
- [PHASE7_FONT_SYSTEM_COMPLETE.md](PHASE7_FONT_SYSTEM_COMPLETE.md) - Completed font system implementation summary
- [NAVIGATION_REFACTOR_PLAN.md](NAVIGATION_REFACTOR_PLAN.md) - Navigation v2 architecture and refactor plan (implemented)

### 📐 Architecture
- [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) - Complete tech stack, packages, structure
- [THEME_SYSTEM_ARCHITECTURE.md](THEME_SYSTEM_ARCHITECTURE.md) - Theme system design
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - REST API endpoints
- [AUTH_STRATEGY.md](AUTH_STRATEGY.md) - Authentication & authorization

### 🎯 Guidelines
- [DEVELOPMENT_PRINCIPLES.md](DEVELOPMENT_PRINCIPLES.md) - Core development principles
- [DESIGN_PATTERNS_AND_BEST_PRACTICES.md](DESIGN_PATTERNS_AND_BEST_PRACTICES.md) - Patterns & practices
- [AI_COLLABORATION_GUIDE.md](AI_COLLABORATION_GUIDE.md) - AI pair programming guidelines
- [ACTIVITY_LOGGING_COVERAGE.md](ACTIVITY_LOGGING_COVERAGE.md) - Activity log implementation

### 🧪 Testing
- [TESTING.md](TESTING.md) - **Comprehensive testing guide** (backend + frontend)

---

## Archive

Historical documentation for completed phases and audits:

```
archive/
├── completed-phases/     # Completed phase implementation docs
│   ├── PHASE5*.md        # CSS generation phases
│   ├── PHASE6*.md        # Theme customization phases  
│   ├── PHASE9*.md        # Analytics foundation
│   ├── PHASE10*.md       # Payments core
│   ├── PHASE11*.md       # Dashboard translation/i18n
│   └── THEME_*.md        # Theme architecture docs
├── audits/               # One-time audits and analysis
│   ├── AUDIT_*.md
│   └── *_AUDIT.md
└── *.md                  # Legacy testing docs (now in TESTING.md)
```

---

## What's Implemented ✅

- **Multi-tenant backend** with Passport auth, RBAC, activity logging
- **Full media library** with folders, conversions, responsive images
- **Puck Page Builder** with 15 themed components and advanced controls
- **Theme system** with blueprints, placeholders, customization
- **Navigation v2 refactor** merged with field-group CSS architecture
- **CSS generation** with section files and dual-mode rendering
- **Central admin** for pages, themes, media, users, tenants, settings
- **Dashboard** with stats, activity, and permission-based visibility

---

## Key Code Locations

| Feature | Location |
|---------|----------|
| Puck Components | `resources/js/shared/puck/components/` |
| Puck Fields | `resources/js/shared/puck/fields/` |
| Theme Context | `resources/js/shared/contexts/ThemeContext.tsx` |
| API Services | `resources/js/shared/services/api/` |
| Backend Services | `app/Services/` |
| Backend Actions | `app/Actions/` |

---

## For New Contributors

1. **Read first:** [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)
2. **Understand current state:** [CURRENT_STATUS.md](CURRENT_STATUS.md)
3. **Follow guidelines:** [DEVELOPMENT_PRINCIPLES.md](DEVELOPMENT_PRINCIPLES.md)
4. **Testing:** [TESTING.md](TESTING.md)

---

## Document Maintenance

When completing a phase:
1. Update [ROADMAP.md](ROADMAP.md) - Mark phase as complete
2. Update [CURRENT_STATUS.md](CURRENT_STATUS.md) - Add to completed features
3. Move phase docs to `archive/completed-phases/`
