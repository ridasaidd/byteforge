# AI Collaboration Guide

> **Last Updated:** December 17, 2025  
> **Purpose:** Structured collaboration protocol for AI-human development

---

## Core Principles

### Project Phase: DEVELOPMENT 🚧
- **No legacy support needed**: We can break things, change APIs, refactor freely
- **No backwards compatibility**: If something is wrong, fix it properly
- **No migration paths**: Just change it directly
- **Move fast**: Don't over-engineer for future scenarios that may never happen

### Always Do ✅
- **Ask before assuming**: 2-3 clarifying questions for ambiguous requests
- **Start small**: Minimal working solutions, iterate based on feedback
- **Reference docs**: Check `CURRENT_STATUS.md` and `PUCK_IMPLEMENTATION_CHECKLIST.md`
- **State assumptions**: Make default choices explicit
- **Verify context**: Read relevant code before editing
- **Test proposals**: Offer 2-3 implementation options when appropriate
- **Check installed packages first**: Run `grep package.json` before building custom solutions
- **Use existing tools**: clsx, cva, tailwind-merge, etc. are there for a reason
- **Read documentation**: Fetch docs from official sources when unsure
- **Check source code**: Use `github_repo` tool to read actual implementations
- **Suggest proven packages**: Recommend battle-tested solutions over custom code

### Never Do ❌
- **Assume requirements**: Always clarify ambiguous requests
- **Over-engineer**: Avoid "perfect" solutions, focus on working code
- **Change scope**: Stick to current task unless explicitly requested
- **Skip testing**: Always consider testing implications
- **Agree blindly**: Validate suggestions against project standards
- **Reinvent the wheel**: Don't build what npm/composer packages already solve
- **Guess at APIs**: Read the docs or source code instead

---

## Response Format

For complex tasks, structure responses as:

```
🎯 SCOPE
- What we're building
- Why (business value)
- Success criteria

🤔 QUESTIONS (if needed)
- 2-3 specific clarifications
- Stated assumptions

📋 APPROACH
- Files to modify
- Implementation strategy
- Testing plan

⚡ ACTION
[Proceed with implementation]
```

For simple tasks, skip the ceremony and just do it.

---

## Project Context

**Current State:** See `DEVELOPMENT_DOCS/CURRENT_STATUS.md`

**Active Work:**
- 70% Puck Page Builder complete
- Pages list UI needed
- Performance optimizations optional

**Tech Stack:**
- Backend: Laravel 11, PHP 8.3, Multi-tenancy (Stancl)
- Frontend: React 18, TypeScript, TailwindCSS, React Query
- Page Builder: Puck (@measured/puck)
- Deployment: VPS (byteforge.se)

---

## Code Standards

**PHP/Laravel:**
- PSR-12 formatting
- Type hints for all parameters and returns
- Comprehensive PHPDoc
- Feature tests for new functionality

**React/TypeScript:**
- Strict TypeScript mode
- Functional components with hooks
- Atomic design principles (atoms → molecules → organisms)
- JSDoc for complex functions

**General:**
- Meaningful variable/function names
- Comments for "why", not "what"
- DRY principle but avoid premature abstraction
- Security first (validation, sanitization, authorization)

---

## Common Workflows

### Adding a New Feature
1. Check `CURRENT_STATUS.md` for conflicts
2. Read existing related code
3. Create minimal implementation
4. Add tests
5. Update relevant documentation
6. Request feedback

### Fixing a Bug
1. Understand the issue (ask questions if unclear)
2. Locate root cause
3. Fix with minimal changes
4. Add test to prevent regression
5. Verify no side effects

### Refactoring
1. Get explicit approval first
2. Maintain existing behavior
3. Refactor incrementally
4. Keep tests passing
5. Document changes

---

## Decision Matrix

| Situation | Action |
|-----------|--------|
| Requirements unclear | Ask 2-3 specific questions |
| Multiple solutions possible | Present 2-3 options with trade-offs |
| Breaking change needed | Just do it - we're in development |
| New dependency needed | Check if similar already installed, justify with clear benefit |
| Architecture change | Reference existing patterns, get approval |
| Scope creep detected | Redirect to current goals, suggest future task |
| Unsure about API/library | Read docs or source code first, don't guess |
| Building something common | Search for existing npm/composer packages first |
| Legacy/backwards compat | Not needed - we're in development, change it directly |

---

## Quality Gates

**Before Submitting Code:**
- ✅ Code compiles/runs without errors
- ✅ Follows project conventions
- ✅ Has appropriate comments
- ✅ Considers security implications
- ✅ No obvious performance issues
- ✅ Tested (manually at minimum)

**Before Marking Complete:**
- ✅ Original request fully addressed
- ✅ No regressions introduced
- ✅ Documentation updated if needed
- ✅ Next steps identified (if any)

---

## Communication Guidelines

**Be Direct:**
- Skip fluff like "I'll use the X tool" - just use it
- Avoid unnecessary introductions
- Get to the point quickly

**Be Precise:**
- Exact file paths with line numbers
- Specific error messages
- Clear reproduction steps

**Be Helpful:**
- Explain *why*, not just *how*
- Anticipate follow-up questions
- Suggest related improvements (without implementing them)

---

## Emergency Protocols

**When Stuck:**
1. State exactly what's blocking progress
2. Show what you've tried
3. Ask specific question
4. Propose workaround if possible

**When Requirements Change:**
1. Acknowledge the change
2. Assess impact on current work
3. Suggest approach (continue, pivot, or restart)
4. Wait for approval

**When Standards Conflict:**
1. Point out the conflict
2. Present options with pros/cons
3. Recommend approach based on project goals
4. Get decision from human

---

## Success Metrics

**Quality:**
- Zero ambiguous implementations
- All code tested and documented
- No regressions
- Standards consistently followed

**Efficiency:**
- Fast iteration cycles
- Clear communication
- Predictable delivery
- Minimal back-and-forth

**Collaboration:**
- Human feels empowered, not dependent
- AI provides value without overstepping
- Shared understanding of goals
- Continuous improvement

---

## Quick Reference

**Key Files:**
- Status: `DEVELOPMENT_DOCS/CURRENT_STATUS.md`
- Checklist: `DEVELOPMENT_DOCS/PUCK_IMPLEMENTATION_CHECKLIST.md`
- Roadmap: `DEVELOPMENT_DOCS/ROADMAP.md`
- API Docs: `DEVELOPMENT_DOCS/API_DOCUMENTATION.md`

**Code Locations:**
- Puck components: `resources/js/shared/puck/components/`
- API services: `resources/js/shared/services/api/`
- Backend controllers: `app/Http/Controllers/Api/`
- Services: `app/Services/`

**Available Tools (check package.json for more):**
- Class utilities: `clsx`, `tailwind-merge`, `class-variance-authority`
- State: `@tanstack/react-query`, `zustand`
- Forms: `react-hook-form`, `zod`
- UI: `@radix-ui/*`, `lucide-react`

**Research Before Building:**
- `github_repo` tool: Read source code of any package
- `fetch_webpage` tool: Read official documentation
- `grep package.json`: Check what's already installed

---

**Remember:** The goal is productive collaboration, not perfect process. Adapt this guide as needed, focus on outcomes over ceremony, and always prioritize clear communication.
