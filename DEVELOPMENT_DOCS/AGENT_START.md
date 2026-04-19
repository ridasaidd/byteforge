# Agent Start

Status: canonical
Audience: AI agent
Last verified: 2026-04-19

This is the fastest safe entry point for AI agents working in ByteForge.

## Current Truth

- primary branch: `main`
- implemented on `main`: Phases 9 through 14
- not implemented yet: Phase 15 guest authentication
- auth storage migration is still planned, not shipped
- shared input normalization now exists via `app/Actions/Api/NormalizeInputFieldsAction.php`
- current reuse points: booking customer fields, payment human-text fields, and auth name/email fields
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

The shared input normalization layer now exists. The next likely work is to
expand it deliberately to other suitable human-input fields, then continue with
auth/session foundation work and guest authentication.
