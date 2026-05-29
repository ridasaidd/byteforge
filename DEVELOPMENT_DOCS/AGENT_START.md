# Agent Start

Status: canonical
Audience: AI agent
Last verified: 2026-05-29

This is the fastest safe entry point for AI agents working in ByteForge.

## Current Truth

- primary branch: `main`
- implemented on `main`: Phases 9 through 15
- implemented on `main`: the shipped Phase 19 system-surface slices for tenant login and guest portal
- Phase 19 product boundary: tenant login may be tenant-branded and system-surface customizable, but staff register/forgot-password/reset-password flows are not a product requirement; those placeholder keys are reserved for future guest/customer-account work, not tenant staff self-service auth
- current Phase 19 direction: keep staff login as a minimal branded utility surface; guest-facing system surfaces reuse a curated shared Puck block subset, and the remaining follow-on work is public-shell chrome where appropriate plus add-on-gated guest-portal widgets
- the system-surface runtime was hardened to avoid module-initialization cycles that could break tenant `/login` mounting in the browser bundle
- auth storage migration is in progress with the hybrid in-memory access token plus HttpOnly refresh-cookie model already in use
- staff password changes now revoke outstanding refresh sessions and clear the current refresh cookie
- staff logout now revokes the current bearer token as well as the current refresh session, including tenant routes where membership middleware refreshes the user model
- the shared frontend auth client now has focused unit coverage for silent refresh retry, refresh deduplication, and failed-refresh token cleanup
- browser-level auth coverage now includes reload-based session restore checks for central and tenant dashboards
- shared input normalization now exists via `app/Actions/Api/NormalizeInputFieldsAction.php`
- current reuse points: booking customer fields, booking CMS resource/service text fields and cancellation notes, tenant user-management create name/email fields, tenant settings site title/description fields, shared media-folder name/description fields, shared media upload metadata text fields, central theme metadata fields, central page-template name/description fields, central and tenant theme-part name fields, central and tenant page title fields, central and tenant navigation name fields, central and tenant layout name fields, payment human-text fields, auth name/email fields, central admin user/tenant/settings/support-access fields, and tenant CMS quote request/draft text fields
- the rollout is still partial and should remain field-family driven rather than global

## Read Order

1. [CURRENT_STATUS.md](CURRENT_STATUS.md)
2. [TESTING.md](TESTING.md)
3. [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)
4. [SECURITY_PLAYBOOK.md](SECURITY_PLAYBOOK.md)

Then read the relevant domain plan or reference doc for the task.

## Document Precedence

If docs conflict, trust them in this order:

1. this file
2. [CURRENT_STATUS.md](CURRENT_STATUS.md)
3. [ROADMAP.md](ROADMAP.md)
4. the relevant active phase or domain plan
5. supporting reference docs
6. anything in [archive/](archive/)

## Regular References

Read these regularly while working:

- [TESTING.md](TESTING.md)
- [SECURITY_PLAYBOOK.md](SECURITY_PLAYBOOK.md)
- [DESIGN_PATTERNS_AND_BEST_PRACTICES.md](DESIGN_PATTERNS_AND_BEST_PRACTICES.md)
- [AI_COLLABORATION_GUIDE.md](AI_COLLABORATION_GUIDE.md)
- [AI_ORCHESTRATOR_EXECUTOR_WORKFLOW.md](AI_ORCHESTRATOR_EXECUTOR_WORKFLOW.md)

## Orchestrator Executor Minimal Read Set

When operating in orchestrator/executor mode, executors should read only:

1. this file
2. [CURRENT_STATUS.md](CURRENT_STATUS.md)
3. the assigned execution packet based on [execution/EXECUTION_PACKET_TEMPLATE.md](execution/EXECUTION_PACKET_TEMPLATE.md)

Then read only the domain docs explicitly allow-listed in that packet.

## Sensitive Areas

Be especially careful around:

- tenancy boundaries
- auth/session storage and refresh flows
- payment provider callbacks and signatures
- booking holds, status transitions, and management tokens
- public-input normalization and output escaping

## Default Verification Strategy

- run focused tests for the touched area first
- use [TESTING.md](TESTING.md) for domain-appropriate commands
- prefer regression tests when fixing bugs or hardening security behavior

## Comments Policy For Agents

Do not add broad explanatory comments across the codebase just to help future
agents navigate. That creates a second drifting layer of truth.

Add comments only where they protect a non-obvious invariant, such as:

- security boundaries
- tenant scoping assumptions
- payment or booking status rules
- deliberately asymmetric normalization or escaping behavior
- surprising framework interactions that are easy to undo accidentally

Prefer canonical docs for system-level guidance and short, targeted comments for
local invariants.

## Next Likely Work

The strongest next likely work is the guest-facing follow-on for Phase 19, with the shipped tenant-login slice now stable and verified:

- keep staff login as a lightly branded fixed surface rather than a major CMS investment
- evolve guest-facing system surfaces beyond root-prop-only shells by reusing a curated subset of the shared Puck block library where route contracts remain safe
- let guest-facing destination surfaces inherit tenant public header/footer chrome where appropriate
- add real guest-portal widget zones with add-on-gated widgets such as bookings and quotes
- keep transient auth handoff routes, such as the guest magic-link callback, minimal and route-owned
- preserve the lazy, cycle-safe system-surface config pattern if more shared Puck reuse is added later
