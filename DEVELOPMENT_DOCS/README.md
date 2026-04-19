# ByteForge Documentation Index

Status: canonical
Audience: human + AI agent
Last verified: 2026-04-19

This folder documents the current ByteForge product, the active implementation
plan, and the stable reference material needed to work safely in the codebase.

## What ByteForge Is

ByteForge is a multi-tenant Laravel + React CMS with:

- central and tenant dashboard applications,
- a Puck-based visual page builder and theme system,
- tenant-scoped media, navigation, pages, settings, and RBAC,
- analytics, payments, and booking subsystems,
- public storefront runtime on tenant domains.

As of 2026-04-19, Phases 9 through 14 are implemented on `main`. Phase 15
(guest authentication) is still future work.

## Read In This Order

If you are an AI agent or a new contributor, read these first:

1. [AGENT_START.md](AGENT_START.md)
2. [CURRENT_STATUS.md](CURRENT_STATUS.md)
3. [TESTING.md](TESTING.md)
4. [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)
5. [SECURITY_PLAYBOOK.md](SECURITY_PLAYBOOK.md)

## Canonical Documents

These documents are intended to be authoritative and should be kept in sync
before updating supporting or historical material.

- [AGENT_START.md](AGENT_START.md)
- [CURRENT_STATUS.md](CURRENT_STATUS.md)
- [ROADMAP.md](ROADMAP.md)
- [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)
- [TESTING.md](TESTING.md)
- [SECURITY_PLAYBOOK.md](SECURITY_PLAYBOOK.md)

## Regular Reference Documents

These are not the first docs to read, but they are important recurring
references while implementing changes.

- [DEVELOPMENT_PRINCIPLES.md](DEVELOPMENT_PRINCIPLES.md)
- [DESIGN_PATTERNS_AND_BEST_PRACTICES.md](DESIGN_PATTERNS_AND_BEST_PRACTICES.md)
- [AI_COLLABORATION_GUIDE.md](AI_COLLABORATION_GUIDE.md)
- [reference/AUTH_STRATEGY.md](reference/AUTH_STRATEGY.md)
- [reference/API_DOCUMENTATION.md](reference/API_DOCUMENTATION.md)
- [plans/BOOKING_SECURITY_FINDINGS.md](plans/BOOKING_SECURITY_FINDINGS.md)

## Active Implementation Plans

These are current or near-future work tracks. They should reflect the actual
code state, not just older planning assumptions.

- [plans/AUTH_HTTPONLY_MIGRATION_PLAN.md](plans/AUTH_HTTPONLY_MIGRATION_PLAN.md)
- [plans/PHASE13_BOOKING_SYSTEM.md](plans/PHASE13_BOOKING_SYSTEM.md)
- [plans/PHASE14_PAYMENT_BOOKING_INTEGRATION.md](plans/PHASE14_PAYMENT_BOOKING_INTEGRATION.md)
- [plans/PHASE15_GUEST_AUTH.md](plans/PHASE15_GUEST_AUTH.md)

## Supporting Reference Material

- [reference/THEME_SYSTEM_ARCHITECTURE.md](reference/THEME_SYSTEM_ARCHITECTURE.md)
- [reference/ACTIVITY_LOGGING_COVERAGE.md](reference/ACTIVITY_LOGGING_COVERAGE.md)
- [reference/COOKIE_CONSENT_GDPR_AUDIT_AND_PLAN.md](reference/COOKIE_CONSENT_GDPR_AUDIT_AND_PLAN.md)
- [PHASE12_TENANT_RUNTIME_READINESS.md](PHASE12_TENANT_RUNTIME_READINESS.md)

## Historical Material

Anything under [archive/](archive/) should be treated as historical unless it is
explicitly referenced by a canonical or active plan document.

## Document Precedence

If two documents disagree, trust them in this order:

1. [AGENT_START.md](AGENT_START.md)
2. [CURRENT_STATUS.md](CURRENT_STATUS.md)
3. [ROADMAP.md](ROADMAP.md)
4. The relevant active phase or domain plan
5. Supporting references
6. Historical material in [archive/](archive/)

## By Task

Use this map instead of guessing.

- Current truth and next work: [CURRENT_STATUS.md](CURRENT_STATUS.md)
- Future sequencing: [ROADMAP.md](ROADMAP.md)
- Safe verification commands: [TESTING.md](TESTING.md)
- Security-sensitive changes: [SECURITY_PLAYBOOK.md](SECURITY_PLAYBOOK.md)
- Auth and session work: [plans/AUTH_HTTPONLY_MIGRATION_PLAN.md](plans/AUTH_HTTPONLY_MIGRATION_PLAN.md), [reference/AUTH_STRATEGY.md](reference/AUTH_STRATEGY.md), [plans/PHASE15_GUEST_AUTH.md](plans/PHASE15_GUEST_AUTH.md)
- Booking work: [plans/PHASE13_BOOKING_SYSTEM.md](plans/PHASE13_BOOKING_SYSTEM.md), [plans/PHASE14_PAYMENT_BOOKING_INTEGRATION.md](plans/PHASE14_PAYMENT_BOOKING_INTEGRATION.md), [plans/BOOKING_SECURITY_FINDINGS.md](plans/BOOKING_SECURITY_FINDINGS.md)
- Architecture and patterns: [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md), [DESIGN_PATTERNS_AND_BEST_PRACTICES.md](DESIGN_PATTERNS_AND_BEST_PRACTICES.md)

## Maintenance Rules

When work changes the real system state:

1. Update [CURRENT_STATUS.md](CURRENT_STATUS.md).
2. Update [ROADMAP.md](ROADMAP.md) if sequencing changed.
3. Update the relevant active phase or security doc.
4. Update this index only if authority, scope, or doc categories changed.

When a plan is fully implemented and no longer drives work, archive it or mark
it explicitly as historical at the top.
