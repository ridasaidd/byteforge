# Architecture Migration Plan

**Last Updated:** January 22, 2026  
**Status:** Active  
**Decision:** Hybrid approach — build features AND introduce patterns incrementally

---

## Executive Summary

**We will NOT do a full codebase refactor.** Instead, we'll apply recommended design patterns incrementally as we build new features. This approach ships functionality while improving architecture systematically.

**Timeline:** Ongoing (not a separate project)  
**Risk:** Low (incremental, tested in real code)  
**Impact:** High (consistent improvement over time)

---

## The Decision

### ❌ Option A: Refactor First, Then Features

**Timeline:** 3-4 weeks refactoring, then features  
**Pros:**
- Clean slate for new features
- Entire codebase consistent

**Cons:**
- ❌ 3+ weeks with no new features shipped
- ❌ High risk of bugs during large refactor
- ❌ Patterns designed on theory, not tested
- ❌ Team context loss if you stop feature work
- ❌ Better patterns emerge *from building*, not before

---

### ❌ Option B: Keep Current Approach (No Patterns)

**Timeline:** Continuous features  
**Pros:**
- Ship fast now
- Low immediate risk

**Cons:**
- ❌ 6 months from now: messy codebase
- ❌ Technical debt compounds
- ❌ Refactoring becomes 10x harder
- ❌ Team learns inconsistent patterns

---

### ✅ Option C: Hybrid (Recommended)

**Timeline:** Build + pattern introduction simultaneously  
**Pros:**
- ✅ Ship features continuously
- ✅ Learn patterns through real code
- ✅ Set templates for team
- ✅ Improve architecture consistently
- ✅ Low risk (incremental, tested)

**Cons:**
- Slightly slower per-feature (patterns + code)
- Requires discipline to maintain standards

---

## Why This Works Best

### Current Codebase Health

Your codebase is **not broken**:
- ✅ DRY and SOLID principles
- ✅ 700+ tests passing
- ✅ Clear separation (Actions, Services)
- ✅ Good organization
- ✅ No urgent technical debt crisis

**Problem:** Not the present, but the **future**. In 6 months with 10+ new features added using old patterns, refactoring becomes exponentially harder.

### Learning by Doing

Patterns are **learned through application**, not documentation:
- Reading about DDD ≠ understanding DDD
- Building Theme domain in DDD structure = understanding
- Team sees pattern in action, can replicate for next domain

---

## Implementation Strategy

### Phase 1: Code Quality Foundation (Week 1)

**Effort:** 2-3 hours  
**Impact:** All future code is automatically better

**Tasks:**
- [ ] Set up PHPStan + Larastan (level 8 analysis)
- [ ] Configure Prettier + ESLint + Husky
- [ ] Add pre-commit hooks (lint-staged)
- [ ] Add database indexes (quick win)
- [ ] Add health check endpoint

**Why first:** These are non-breaking, one-time setup that improves all code forever.

```bash
# Backend code quality
composer require --dev phpstan/phpstan larastan/larastan
composer require --dev laravel/pint

# Frontend code quality
npm install --save-dev prettier eslint-config-prettier
npm install --save-dev husky lint-staged
```

---

### Phase 2: Build Theme Customizer with Patterns (Weeks 2-3)

**Effort:** Feature development + pattern application  
**Impact:** Working feature + proven pattern template

**Create Domain-Driven Structure:**
```
app/Domains/
  Theme/
    Models/
      Theme.php
      ThemeSettings.php
    Actions/
      ActivateThemeAction.php
      UpdateThemeSettingsAction.php
    Services/
      ThemeCompilerService.php
      ThemeValidationService.php
    Events/
      ThemeActivated.php
      ThemeUpdated.php
    Exceptions/
      InvalidThemeException.php
    Contracts/
      ThemeRepositoryInterface.php
    Repositories/
      ThemeRepository.php
      CachedThemeRepository.php
```

**Build Frontend with Patterns:**
```
resources/js/
  apps/superadmin/
    features/
      themes/
        components/
          ThemesContainer.tsx      ← Logic
          ThemesView.tsx           ← Presentation
          ThemeCustomizer.tsx
        hooks/
          useThemeCustomizer.ts    ← Domain-specific
          useThemes.ts
        services/
          themeApi.ts
        types.ts
```

**Implement Design Patterns:**
- ✅ Domain-Driven Design (Theme domain)
- ✅ CQRS (separate queries/commands)
- ✅ Event-driven (ThemeUpdated event)
- ✅ Repository pattern (theme queries)
- ✅ Feature-Sliced Design (frontend)
- ✅ Container/Presenter (React components)

**Deliverable:** Theme Customizer feature + proven pattern template

---

### Phase 3: Migrate Tenant Domain (Weeks 4-5)

**Effort:** One domain migration  
**Impact:** Second domain establishes pattern consistency

**Apply same structure as Theme:**
```
app/Domains/
  Tenant/
    Models/
    Actions/
    Services/
    Events/
    Repositories/
```

**Key point:** Don't touch code that doesn't need it. Tenant domain migrates because you're working on it. Pages and Media stay as-is until you build features for them.

---

### Phase 4: Ongoing — Migrate When Working On Features

**Weeks 6+:** Each time you work on a domain/feature:
1. Migrate that domain to DDD structure
2. Apply patterns
3. Add events/commands
4. Ship the feature

**Never refactor code you're not currently working on.**

---

## Technical Debt Tracking

Update [CURRENT_STATUS.md](CURRENT_STATUS.md) with migration progress:

```markdown
## Architecture Migration

### Status: In Progress (Hybrid Approach)

**Current Phase:** Phase 2 - Theme Customizer + Patterns

**Domains Migrated:**
- [ ] Theme (in progress)
- [ ] Tenant (queued)
- [ ] Page (future)
- [ ] Media (future)
- [ ] User (future)

**Code Quality Tools:**
- [ ] PHPStan level 8
- [ ] Prettier + ESLint
- [ ] Pre-commit hooks
- [ ] Database indexing

**Migration Criteria:**
- Only migrate when building features for that domain
- Set pattern template in first domain (Theme)
- Reuse template for subsequent domains
```

---

## Comparison: Three Approaches

| Aspect | Refactor Now | Keep Current | Hybrid (Choose This) |
|--------|---|---|---|
| **Time to Theme Customizer** | Week 4 | Week 2 | Week 2-3 |
| **Code quality after 6 months** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **Risk of bugs** | High | Low | Very Low |
| **Team learning** | Theoretical | Chaotic | Practical |
| **Consistency** | High | Low | High |
| **Flexibility** | Low | High | High |
| **Business value** | Delayed | Continuous | Continuous |
| **Recommended** | ❌ | ❌ | ✅ |

---

## Immediate Action Items

### Week 1: Code Quality Foundation

**Day 1-2: Backend Quality**
```bash
# Install tools
composer require --dev phpstan/phpstan larastan/larastan
composer require --dev laravel/pint

# Configure
# phpstan.neon
includes:
    - vendor/larastan/larastan/extension.neon
parameters:
    level: 8
    paths:
        - app
    excludePaths:
        - app/Providers

# Run initial check
vendor/bin/phpstan analyse

# Add to composer.json scripts
"lint": "./vendor/bin/pint",
"lint:check": "./vendor/bin/pint --test",
"analyze": "./vendor/bin/phpstan analyse"
```

**Day 2-3: Frontend Quality**
```bash
# Install tools
npm install --save-dev prettier eslint-config-prettier
npm install --save-dev husky lint-staged

# Configure .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}

# Configure .eslintrc.json - add prettier config
{
  "extends": [
    "eslint:recommended",
    "prettier"
  ]
}

# Setup Husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"

# Configure lint-staged in package.json
"lint-staged": {
  "*.php": ["./vendor/bin/pint"],
  "*.{ts,tsx}": ["prettier --write", "eslint --fix"]
}

# Add to package.json scripts
"format": "prettier --write \"resources/js/**/*.{ts,tsx}\"",
"lint": "eslint resources/js --fix"
```

**Day 3: Database Optimization**
```php
// database/migrations/add_indexes.php
Schema::table('pages', function (Blueprint $table) {
    $table->index(['tenant_id', 'status']);
    $table->index(['tenant_id', 'created_at']);
    $table->index('slug');
});

Schema::table('activity_log', function (Blueprint $table) {
    $table->index(['subject_type', 'subject_id']);
    $table->index(['causer_type', 'causer_id']);
    $table->index('created_at');
});

Schema::table('themes', function (Blueprint $table) {
    $table->index(['tenant_id', 'is_active']);
    $table->index('created_at');
});
```

**Day 4-5: Health Check & Documentation**
```php
// app/Http/Controllers/HealthController.php
class HealthController extends Controller
{
    public function check(): JsonResponse
    {
        $checks = [
            'database' => $this->checkDatabase(),
            'redis' => $this->checkRedis(),
            'storage' => $this->checkStorage(),
        ];
        
        $healthy = collect($checks)->every(fn($c) => $c['status'] === 'ok');
        
        return response()->json([
            'status' => $healthy ? 'healthy' : 'unhealthy',
            'checks' => $checks,
            'timestamp' => now()->toIso8601String(),
        ], $healthy ? 200 : 503);
    }
}

// routes/api.php
Route::get('/health', [HealthController::class, 'check']);
```

---

### Weeks 2-3: Theme Customizer + Patterns

**When building Theme Customizer:**

1. **Create Domain Structure** (30 min)
   ```bash
   mkdir -p app/Domains/Theme/{Models,Actions,Services,Events,Repositories,Contracts,Exceptions}
   ```

2. **Move/Create Theme Files** (1-2 hours)
   - Move Theme model → `app/Domains/Theme/Models/Theme.php`
   - Create ThemeSettings model (new)
   - Create repositories with caching

3. **Create Domain Events** (30 min)
   ```php
   // app/Domains/Theme/Events/ThemeUpdated.php
   class ThemeUpdated {
       public function __construct(
           public Theme $theme,
           public User $user
       ) {}
   }
   ```

4. **Build Frontend Feature** (3-4 hours)
   ```
   features/themes/
     components/ThemesContainer.tsx  (logic + data)
     components/ThemesView.tsx       (presentation)
     components/ThemeCustomizer.tsx
     hooks/useThemeCustomizer.ts     (domain-specific)
     services/themeApi.ts
   ```

5. **Add Listeners** (30 min)
   - LogThemeUpdate
   - ClearThemeCache
   - NotifyAdmins

---

### Week 4+: Establish Pattern, Reuse

Once Theme is complete:
- Document what you did (patterns applied)
- Use as template for Tenant migration
- Reuse template for all future domains

---

## When to Stop Following This Plan

**Override this plan if:**

1. **Major refactoring becomes critical** - If bugs emerge from current structure, stop and refactor
2. **Patterns don't fit** - If DDD structure doesn't work for a domain, adjust
3. **Team consensus shifts** - If team strongly prefers different patterns, switch
4. **Performance crisis** - If caching/optimization becomes critical, prioritize

**Otherwise, stick to the plan:** Phase, build, migrate incrementally, ship continuously.

---

## What NOT to Do

### ❌ Don't:
- Refactor entire codebase at once
- Apply patterns to code you're not working on
- Create perfect structure before writing code
- Wait for full DDD before shipping features
- Refactor Pages/Media/Users while building Theme
- Stop feature work for 3+ weeks

### ✅ Do:
- Apply patterns to code you're currently writing
- Learn patterns through real implementation
- Ship features regularly
- Migrate domains as you work on them
- Track progress in technical debt list
- Involve team in pattern decisions

---

## Success Criteria

After Phase 1 (1-2 weeks):
- ✅ Code quality tools in CI/CD
- ✅ Pre-commit hooks preventing issues
- ✅ Team running linters locally
- ✅ Database indexes added

After Phase 2 (3-4 weeks):
- ✅ Theme Customizer feature shipped
- ✅ Theme domain in DDD structure
- ✅ Patterns proven and documented
- ✅ Team understands pattern template

After Phase 3+ (ongoing):
- ✅ Each domain migrated as it's worked on
- ✅ Consistent patterns across codebase
- ✅ Features shipped regularly
- ✅ Technical debt tracked

After 6 months:
- ✅ Most domains migrated
- ✅ Codebase cleaner than today
- ✅ Team proficient in patterns
- ✅ No "big refactor" moment needed

---

## Risk Mitigation

### Risk: Inconsistent Patterns During Migration

**Mitigation:**
- First domain (Theme) sets strict template
- Second domain (Tenant) validates template
- Code review checklist for pattern compliance
- Documentation of each pattern used

### Risk: Mixing Old and New Code

**Mitigation:**
- Namespaced domains (`app/Domains/Theme/` separate from old code)
- Gradual elimination of duplicate services
- Don't rush migrations, do them when building

### Risk: Team Doesn't Understand Patterns

**Mitigation:**
- Code together on Theme domain (pair programming)
- Pattern documentation in [DESIGN_PATTERNS_AND_BEST_PRACTICES.md](DESIGN_PATTERNS_AND_BEST_PRACTICES.md)
- Slack/meeting discussions as patterns emerge
- Code review comments explaining why patterns used

---

## Timeline at a Glance

```
Week 1:   Code Quality Tools (2-3 hours)
          ├─ PHPStan + Prettier + Husky
          ├─ Pre-commit hooks
          └─ Database indexes

Weeks 2-3: Theme Customizer + DDD Structure
          ├─ Build feature
          ├─ Apply patterns
          └─ Document pattern template

Weeks 4-5: Tenant Domain Migration
          ├─ Migrate Tenant
          ├─ Verify template works
          └─ Refine if needed

Weeks 6+:  Ongoing Incremental Migration
          ├─ Migrate as you work
          ├─ Ship features
          └─ Improve incrementally
```

---

## References

See these documents for detailed pattern guidance:

- **[DESIGN_PATTERNS_AND_BEST_PRACTICES.md](DESIGN_PATTERNS_AND_BEST_PRACTICES.md)** - All 30 patterns explained
- **[PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)** - Current structure
- **[THEME_SYSTEM_ARCHITECTURE.md](THEME_SYSTEM_ARCHITECTURE.md)** - Theme implementation details
- **[DEVELOPMENT_PRINCIPLES.md](DEVELOPMENT_PRINCIPLES.md)** - Core principles

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Jan 22, 2026 | Hybrid approach (build + patterns) | Ship features + improve architecture simultaneously |
| Jan 22, 2026 | Start with Theme domain | Clear, well-defined, sets template |
| Jan 22, 2026 | Code quality tools first | Non-breaking, improves all future code |
| Jan 22, 2026 | Incremental migration | Reduce refactor risk, learn from real code |

---

**Last Updated:** January 22, 2026  
**Next Review:** End of Phase 1 (Week 2, 2026)  
**Maintainers:** Development Team
