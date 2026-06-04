# ByteForge SQLite-First Bootstrap Architecture Report

Status: audit_report
Audience: human operator + bootstrap maintainer
Last verified: 2026-06-04

## A. Updated Architecture

ByteForge should use a three-layer authority model:

1. Code is implementation truth.
2. SQLite is runtime/project state truth.
3. Markdown is behavioral and policy truth.

The new deterministic bootstrap flow is:

1. `AGENTS.md`
2. `.opencode/DEVELOPMENT_DOCS/AI_BOOTSTRAP.md`
3. role-specific docs
4. packet
5. additive `doc_allow_list` docs

`AGENT_START.md` becomes a compatibility redirect, not the effective entrypoint.

## B. Document Ownership Model

| Document | Classification | Owner | Action |
|---|---|---|---|
| `AGENTS.md` | bootstrap_policy | bootstrap architect | keep Markdown, root entrypoint |
| `AI_BOOTSTRAP.md` | bootstrap_policy | bootstrap architect | new canonical bootstrap |
| `AGENT_START.md` | obsolete | bootstrap architect | keep as redirect |
| `AI_ORCHESTRATOR_EXECUTOR_WORKFLOW.md` | bootstrap_policy | workflow owner | keep Markdown |
| `execution/EXECUTION_PACKET_TEMPLATE.md` | bootstrap_policy | workflow owner | keep Markdown |
| `execution/STATE_DB_GUIDE.md` | reference_doc | state owner | keep Markdown; command-surface policy |
| `execution/OPENCODE_BROKER.md` | reference_doc | broker owner | keep Markdown; runbook |
| `CURRENT_STATUS.md` | runtime_state | state owner | migrate to SQLite; keep human mirror if needed |
| `PHASE_STATUS_MATRIX.md` | runtime_state | state owner | migrate to SQLite |
| `ROADMAP.md` | active_plan/runtime_state | product owner | mirror/ingest to SQLite |
| `plans/*.md` | active_plan | product/architecture owner | keep Markdown; ingest to SQLite |
| `reference/*.md` | reference_doc | domain owner | keep Markdown; optionally ingest snapshot |
| `archive/**` | archive | maintainer | keep archived; never read unless allow-listed |
| audit/review docs | audit_report | reviewer | keep or archive; not runtime truth |

## C. Bootstrap Hierarchy

Mandatory for all agents:

1. `AGENTS.md`
2. `.opencode/DEVELOPMENT_DOCS/AI_BOOTSTRAP.md`

Mandatory for orchestrators:

3. `.opencode/DEVELOPMENT_DOCS/AI_ORCHESTRATOR_EXECUTOR_WORKFLOW.md`
4. `STATE_DB_GUIDE.md` when querying runtime state
5. `OPENCODE_BROKER.md` when dispatching/reviewing broker runs

Mandatory for executors:

3. assigned packet
4. additive docs from `doc_allow_list`

## D. Markdown vs SQLite Matrix

| Category | Code | SQLite | Markdown |
|---|---|---|---|
| Implemented behavior | authoritative | no | explanatory only |
| Current status | no | authoritative | not in bootstrap |
| Roadmap state | no | authoritative for current state | human plan only |
| Active tasks | no | authoritative | no |
| Acceptance criteria | no | authoritative | packet schema only |
| Scope | no | authoritative | packet schema only |
| Architecture rules | implementation check | no | authoritative policy |
| Security policy | implementation check | no | authoritative policy |
| Testing policy | command availability | no | authoritative policy |
| Execution history | artifacts/code write | authoritative | no |
| Routing decisions | dispatcher implements | authoritative/auditable | policy only |
| Performance metrics | artifact source | authoritative | no |

## E. Migration Recommendations

1. Remove runtime truth from bootstrap docs.
2. Make `AI_BOOTSTRAP.md` the canonical bootstrap policy.
3. Keep `AGENT_START.md` only as a redirect.
4. Clarify `doc_allow_list` as additive everywhere.
5. Add command-surface-only policy to all relevant docs.
6. Enforce mandatory delegation for `delegate_to_executor=true` and
   `feature|bugfix|refactor` task classes.
7. Keep packet YAML for OpenCode compatibility, but generate from SQLite where possible.
8. Move current status, phase status, active tasks, and roadmap runtime state into SQLite.
9. Keep Markdown plans/reference docs as human-readable source material and ingest/mirror them.
10. Extend broker validation to check bootstrap determinism and command-surface policy.

## F. Proposed File Modifications

Modified/new artifacts produced:

- `AGENTS.md`
- `.opencode/DEVELOPMENT_DOCS/AI_BOOTSTRAP.md`
- `.opencode/DEVELOPMENT_DOCS/AGENT_START.md`
- `.opencode/DEVELOPMENT_DOCS/AI_ORCHESTRATOR_EXECUTOR_WORKFLOW.md`
- `.opencode/DEVELOPMENT_DOCS/execution/EXECUTION_PACKET_TEMPLATE.md`
- `.opencode/DEVELOPMENT_DOCS/execution/STATE_DB_GUIDE.md`
- `.opencode/DEVELOPMENT_DOCS/execution/OPENCODE_BROKER.md`

No files should be deleted. Historical files should be archived or redirected.
