# ByteForge Documentation Index

Status: canonical
Audience: human + AI agent
Last verified: 2026-05-29

This folder documents the current ByteForge product, the active implementation
plan, and the stable reference material needed to work safely in the codebase.

## What ByteForge Is

ByteForge is a multi-tenant Laravel + React CMS with:

- central and tenant dashboard applications,
- a Puck-based visual page builder and theme system,
- tenant-scoped media, navigation, pages, settings, and RBAC,
- analytics, payments, and booking subsystems,
- public storefront runtime on tenant domains.

Current canonical status is maintained in [CURRENT_STATUS.md](state/CURRENT_STATUS.md), with
phase-by-phase progress summarized in [PHASE_STATUS_MATRIX.md](state/PHASE_STATUS_MATRIX.md).

## Read In This Order

If you are an AI agent or a new contributor, read these first:

1. [AGENT_START.md](bootstrap/AGENT_START.md)
2. [CURRENT_STATUS.md](state/CURRENT_STATUS.md)
3. [TESTING.md](policy/TESTING.md)
4. [PROJECT_ARCHITECTURE.md](reference/PROJECT_ARCHITECTURE.md)
5. [SECURITY_PLAYBOOK.md](policy/SECURITY_PLAYBOOK.md)

## Canonical Documents

These documents are intended to be authoritative and should be kept in sync
before updating supporting or historical material.

- [AGENT_START.md](bootstrap/AGENT_START.md)
- [CURRENT_STATUS.md](state/CURRENT_STATUS.md)
- [PHASE_STATUS_MATRIX.md](state/PHASE_STATUS_MATRIX.md)
- [ROADMAP.md](state/ROADMAP.md)
- [PROJECT_ARCHITECTURE.md](reference/PROJECT_ARCHITECTURE.md)
- [TESTING.md](policy/TESTING.md)
- [SECURITY_PLAYBOOK.md](policy/SECURITY_PLAYBOOK.md)

## Regular Reference Documents

These are not the first docs to read, but they are important recurring
references while implementing changes.

- [DEVELOPMENT_PRINCIPLES.md](policy/DEVELOPMENT_PRINCIPLES.md)
- [DESIGN_PATTERNS_AND_BEST_PRACTICES.md](reference/DESIGN_PATTERNS_AND_BEST_PRACTICES.md)
- [AI_COLLABORATION_GUIDE.md](policy/AI_COLLABORATION_GUIDE.md)
- [AI_ORCHESTRATOR_EXECUTOR_WORKFLOW.md](bootstrap/AI_ORCHESTRATOR_EXECUTOR_WORKFLOW.md)
- [reference/AUTH_STRATEGY.md](reference/AUTH_STRATEGY.md)
- [reference/API_DOCUMENTATION.md](reference/API_DOCUMENTATION.md)
- [plans/BOOKING_SECURITY_FINDINGS.md](plans/BOOKING_SECURITY_FINDINGS.md)

## Active Implementation Plans

These are current or near-future work tracks. They should reflect the actual
code state, not just older planning assumptions.

- [plans/AUTH_HTTPONLY_MIGRATION_PLAN.md](plans/AUTH_HTTPONLY_MIGRATION_PLAN.md)
- [plans/PHASE17_ESTIMATES_AND_QUOTES_ADDON.md](plans/PHASE17_ESTIMATES_AND_QUOTES_ADDON.md)
- [plans/PHASE19_SYSTEM_SURFACES.md](plans/PHASE19_SYSTEM_SURFACES.md)
- [plans/PHASE20_CUSTOMER_ACCOUNTS_AND_SSO_ARCHITECTURE.md](plans/PHASE20_CUSTOMER_ACCOUNTS_AND_SSO_ARCHITECTURE.md)

## Supporting Reference Material

- [reference/THEME_SYSTEM_ARCHITECTURE.md](reference/THEME_SYSTEM_ARCHITECTURE.md)
- [reference/ACTIVITY_LOGGING_COVERAGE.md](reference/ACTIVITY_LOGGING_COVERAGE.md)
- [reference/COOKIE_CONSENT_GDPR_AUDIT_AND_PLAN.md](reference/COOKIE_CONSENT_GDPR_AUDIT_AND_PLAN.md)
- [TASK_INSTRUCTIONS/README.md](TASK_INSTRUCTIONS/README.md)

## Document Lifecycle

Use this lifecycle so phase tracking stays clean and searchable:

1. Active planning lives in [plans/](plans/) and must align with [CURRENT_STATUS.md](state/CURRENT_STATUS.md) and [ROADMAP.md](state/ROADMAP.md).
2. Canonical truth lives in the canonical docs list above, especially [CURRENT_STATUS.md](state/CURRENT_STATUS.md) and [PHASE_STATUS_MATRIX.md](state/PHASE_STATUS_MATRIX.md).
3. Completed phase narratives should be archived under [archive/completed-phases/](archive/completed-phases/).
4. Legacy top-level phase docs in this folder are historical references unless explicitly listed as active plans.

## Legacy Top-Level Phase Docs

These files are kept for historical context and migration rationale. Do not treat
them as active implementation plans unless a canonical doc explicitly says so.

- [PHASE7_FONT_SYSTEM.md](archive/completed-phases/PHASE7_FONT_SYSTEM.md)
- [PHASE7_FONT_SYSTEM_COMPLETE.md](archive/completed-phases/PHASE7_FONT_SYSTEM_COMPLETE.md)
- [PHASE8_PAGE_SYSTEM_REFACTOR.md](archive/completed-phases/PHASE8_PAGE_SYSTEM_REFACTOR.md)
- [PHASE12_TENANT_RUNTIME_READINESS.md](archive/completed-phases/PHASE12_TENANT_RUNTIME_READINESS.md)
- [PHASE13_BOOKING_SYSTEM.md](archive/completed-phases/PHASE13_BOOKING_SYSTEM.md)

## Historical Material

Anything under [archive/](archive/) should be treated as historical unless it is
explicitly referenced by a canonical or active plan document.

## Document Precedence

If two documents disagree, trust them in this order:

1. [AGENT_START.md](bootstrap/AGENT_START.md)
2. [CURRENT_STATUS.md](state/CURRENT_STATUS.md)
3. [ROADMAP.md](state/ROADMAP.md)
4. The relevant active phase or domain plan
5. Supporting references
6. Historical material in [archive/](archive/)

## By Task

Use this map instead of guessing.

- Current truth and next work: [CURRENT_STATUS.md](state/CURRENT_STATUS.md)
- Phase-by-phase status (done vs left): [PHASE_STATUS_MATRIX.md](state/PHASE_STATUS_MATRIX.md)
- Future sequencing: [ROADMAP.md](state/ROADMAP.md)
- Safe verification commands: [TESTING.md](policy/TESTING.md)
- Security-sensitive changes: [SECURITY_PLAYBOOK.md](policy/SECURITY_PLAYBOOK.md)
- Orchestrator/executor handoff rules: [AI_ORCHESTRATOR_EXECUTOR_WORKFLOW.md](bootstrap/AI_ORCHESTRATOR_EXECUTOR_WORKFLOW.md), [execution/EXECUTION_PACKET_TEMPLATE.md](execution/EXECUTION_PACKET_TEMPLATE.md)
- Auth and session work: [plans/AUTH_HTTPONLY_MIGRATION_PLAN.md](plans/AUTH_HTTPONLY_MIGRATION_PLAN.md), [reference/AUTH_STRATEGY.md](reference/AUTH_STRATEGY.md), [plans/PHASE15_GUEST_AUTH.md](plans/PHASE15_GUEST_AUTH.md)
- Booking work: [plans/PHASE13_BOOKING_SYSTEM.md](plans/PHASE13_BOOKING_SYSTEM.md), [plans/PHASE14_PAYMENT_BOOKING_INTEGRATION.md](plans/PHASE14_PAYMENT_BOOKING_INTEGRATION.md), [plans/BOOKING_SECURITY_FINDINGS.md](plans/BOOKING_SECURITY_FINDINGS.md)
- Architecture and patterns: [PROJECT_ARCHITECTURE.md](reference/PROJECT_ARCHITECTURE.md), [DESIGN_PATTERNS_AND_BEST_PRACTICES.md](reference/DESIGN_PATTERNS_AND_BEST_PRACTICES.md)
- Task runbooks: [TASK_INSTRUCTIONS/README.md](TASK_INSTRUCTIONS/README.md), [TASK_INSTRUCTIONS/REMOVE_STATIC_TEXT_SYSTEM_SURFACES_EXCEPT_STAFF_LOGIN.md](TASK_INSTRUCTIONS/REMOVE_STATIC_TEXT_SYSTEM_SURFACES_EXCEPT_STAFF_LOGIN.md), [TASK_INSTRUCTIONS/REMOVE_TEXT_CONTROLS_AND_ADD_PANEL_SLOT_SYSTEM_SURFACES.md](TASK_INSTRUCTIONS/REMOVE_TEXT_CONTROLS_AND_ADD_PANEL_SLOT_SYSTEM_SURFACES.md)
- Legacy historical context: [PHASE7_FONT_SYSTEM.md](archive/completed-phases/PHASE7_FONT_SYSTEM.md), [PHASE8_PAGE_SYSTEM_REFACTOR.md](archive/completed-phases/PHASE8_PAGE_SYSTEM_REFACTOR.md), [PHASE12_TENANT_RUNTIME_READINESS.md](archive/completed-phases/PHASE12_TENANT_RUNTIME_READINESS.md), [PHASE13_BOOKING_SYSTEM.md](archive/completed-phases/PHASE13_BOOKING_SYSTEM.md)

## Maintenance Rules

When work changes the real system state:

1. Update [CURRENT_STATUS.md](state/CURRENT_STATUS.md).
2. Update [ROADMAP.md](state/ROADMAP.md) if sequencing changed.
3. Update the relevant active phase or security doc.
4. Update this index only if authority, scope, or doc categories changed.

When a plan is fully implemented and no longer drives work, archive it or mark
it explicitly as historical at the top.
