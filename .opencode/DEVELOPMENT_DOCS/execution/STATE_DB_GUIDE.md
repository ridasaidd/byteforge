# OpenCode State DB Guide

Status: canonical state runbook
Audience: orchestrator + executor operators
Last verified: 2026-06-04

This guide defines how to use the local SQLite state database for authoritative
runtime/project state while Markdown remains authoritative for behavioral rules,
workflow contracts, schemas, and conventions.

## Authority Model

- Code is implementation truth.
- SQLite is runtime/project state truth.
- Markdown is behavioral and policy truth.

SQLite database:

```text
.opencode/runtime/opencode-state.sqlite
```

## Command Surface Requirement

Agents must use approved npm aliases for state operations:

```bash
npm run opencode:state:*
```

Agents must not:

- execute `scripts/opencode/state.php` directly
- run `php -r` state queries
- open the database with `sqlite3`
- mutate SQLite directly
- bypass package.json command aliases

Exceptions require explicit packet authorization for state-tooling maintenance
and must be reported in execution evidence.

## What SQLite Owns

SQLite is authoritative for:

- current project status
- roadmap/phase state
- active tasks
- task scope
- acceptance criteria
- verification commands
- file targets
- stop conditions
- packet metadata
- execution attempts
- run history
- artifact references
- routing decisions
- model/provider choices
- token/cost/duration metrics
- blocked/completed task lifecycle
- ingested plan and reference snapshots

Markdown must not duplicate current runtime truth in bootstrap documents.

## What Markdown Owns

Markdown is authoritative for:

- bootstrap behavior
- orchestrator/executor role contracts
- command-surface policy
- packet and result schemas
- testing policy
- security policy
- architecture invariants
- broker runbooks
- comments policy

## Core Commands

Initialize schema:

```bash
npm run opencode:state:init
```

Verify state tooling:

```bash
npm run opencode:state:verify
```

Bulk-ingest plans, reference docs, and packets:

```bash
npm run opencode:state:ingest-all
```

Query compact context:

```bash
npm run opencode:state:context -- --packet-id EP-002 --limit 5
```

Query performance aggregates:

```bash
npm run opencode:state:report
npm run opencode:state:report -- --task-class minor
```

## Task State Commands

```bash
npm run opencode:task:create -- --task-id EP-004 --phase PHASE19 --summary "Task summary"
npm run opencode:task:list
npm run opencode:task:show -- --task-id EP-004
npm run opencode:task:complete -- --task-id EP-004
npm run opencode:task:block -- --task-id EP-004 --reason "Blocked reason"
npm run opencode:task:unblock -- --task-id EP-004
npm run opencode:task:ingest-packet -- --packet .opencode/runtime/packets/packet.yaml
```

Only orchestrators may mark tasks complete, and only after reviewing executor
outputs, diffs, files, artifacts, and verification evidence.

## Packet Commands

Generate a packet YAML from SQLite task state:

```bash
npm run opencode:state:build-packet -- --task-id EP-004
```

Ingest packet metadata:

```bash
npm run opencode:state:ingest-packet -- --packet .opencode/runtime/packets/packet.yaml
```

During migration, packet YAML remains the OpenCode executor handoff format. If
packet YAML and SQLite task state diverge on scope or criteria, SQLite wins.

## Plan and Reference Doc Commands

```bash
npm run opencode:state:plan:list
npm run opencode:state:plan:show -- --plan-key PHASE19
npm run opencode:state:plan:ingest -- --plan-key PHASE19 --title "Phase 19" --file .opencode/DEVELOPMENT_DOCS/plans/PHASE19_SYSTEM_SURFACES.md
npm run opencode:state:ref:list
npm run opencode:state:ref:show -- --doc-key TESTING
npm run opencode:state:ref:ingest -- --doc-key TESTING --title "Testing Guide" --file .opencode/DEVELOPMENT_DOCS/policy/TESTING.md
```

Active plans may remain human-readable Markdown, but active plan state and
runtime task truth should be mirrored or ingested into SQLite.

## Routing Commands

```bash
npm run opencode:state:route-list
npm run opencode:state:route-upsert -- --task-class minor --risk-level low --provider opencode-go --model deepseek-v4-flash --variant cheap
npm run opencode:state:calibrate -- --min-runs 3
npm run opencode:state:calibrate -- --min-runs 3 --apply
```

Routing changes must be auditable through state commands.

## Artifact and Run Commands

Ingest latest artifact:

```bash
npm run opencode:state:ingest-latest [--packet-id EP-002]
```

Record a failed run:

```bash
npm run opencode:state:record-failure -- --packet-id EP-003 --failure-type environment_blocker [--attempt 1] [--model deepseek-v4-flash]
```

Backfill historical artifact metrics:

```bash
npm run opencode:state:backfill
npm run opencode:state:backfill -- --packet-id EP-003
```

## Compact Context Query Flow

SQLite reduces token use only when prompts use compact query output instead of
pasting full historical docs and artifacts.

Before dispatching a retry or when prior state matters:

```bash
npm run opencode:state:context -- --packet-id EP-003 --limit 3
```

The orchestrator should embed only compact `packet`, `stats`, and `recent_runs`
content. Omit `db_path`.

Example prompt fragment:

```text
Recent context for EP-003:
{"stats":{"total_runs":3,"success_runs":1,"failed_runs":2},"recent_runs":[{"status":"failed:environment_blocker","attempt":2},{"status":"success","attempt":1}]}
```

Do not paste full artifact JSON or historical run logs unless escalation requires
it.

## Stale Artifact Protection

Two layers prevent stale successes from masking failures:

1. `run-auto` records a minimal failure artifact when a run fails without
   producing a new artifact.
2. `ingest-latest --packet-id` scans packet-matching artifacts and sorts failures
   first, then successes.

Use packet-scoped ingest/context commands when reviewing retries.

## SQLite Table Ownership

### `tasks`

Authoritative for:

- `task_id`, `phase`, `summary`
- `scope_in`, `scope_out`, `file_targets`
- `acceptance_criteria`, `verification`, `doc_allow_list`, `stop_conditions`
- `task_class`, `risk_level`, `executor_model`, `delegate_to_executor`
- `attempt`, `completed`, `completed_at`, `blocked`, `blocked_reason`, `priority`

### `phase_plans`

Stores ingested plan content:

- `plan_key`, `title`, `content`, `status`

### `reference_docs`

Stores ingested reference snapshots:

- `doc_key`, `title`, `content`

### `packets`

Stores packet metadata:

- `packet_id`, `phase`, `task_class`, `risk_level`, `summary`
- `last_attempt`, `updated_at`

### `runs`

Stores execution evidence:

- `run_id`, `packet_id`, `phase`, `task_class`, `attempt`
- `provider`, `model`, `variant`
- `status`, `failure_type`, `issues_json`
- `input_tokens`, `output_tokens`, `cost`, `duration_ms`
- `artifact_path`, `session_id`, `transport`, `created_at`

## Daily Operating Model

1. Keep runtime state in SQLite.
2. Generate packets from SQLite when possible.
3. Use packet YAML as the OpenCode handoff format.
4. Dispatch with broker commands.
5. Ingest artifacts automatically through `run-auto` or manually through state commands.
6. Use compact context for retries.
7. Periodically run state verification and reports.

## Document Classification Recommendations

| Class | Markdown action | SQLite action |
|---|---|---|
| bootstrap_policy | keep in Markdown | do not treat as runtime state |
| runtime_state | remove from bootstrap Markdown | migrate to SQLite |
| active_plan | keep human-readable copy | mirror/ingest to SQLite |
| reference_doc | keep in Markdown | optionally ingest snapshot |
| archive | keep in archive | do not ingest unless needed |
| audit_report | keep or archive | ingest only if needed for search/history |
| obsolete | redirect or archive | do not use as authority |

Packet Storage

Generated packet artifacts are runtime state and should be written under:

.opencode/runtime/packets/

Examples:
.opencode/runtime/packets/EP-003.yaml
.opencode/runtime/packets/EP-008.yaml

Compatibility packet fixtures and broker-validation packets remain under:

.opencode/DEVELOPMENT_DOCS/execution/

These tracked fixtures are used for validation, testing, onboarding, and fresh-clone operation.
