# AI Bootstrap

Status: canonical
Audience: all AI agents and human operators
Last verified: 2026-06-04

This is the canonical ByteForge AI bootstrap document.

Its purpose is to make agent behavior deterministic, keep token use low, enforce
SQLite-first orchestration, preserve OpenCode broker compatibility, and remain
compatible with future GPT/Codex orchestrators and open-weight executors.

## Core Authority Model

ByteForge uses three authority layers:

1. **Code = implementation truth**
   - Runtime behavior, available command aliases, schemas enforced in code, test
     fixtures, and actual application behavior are determined by the repository.
2. **SQLite = runtime/project state truth**
   - Current status, active tasks, phase state, plan/ref snapshots, packet
     metadata, runs, routing, execution history, token/cost data, and completion
     state live in `.opencode/runtime/opencode-state.sqlite`.
3. **Markdown = behavioral and policy truth**
   - Bootstrap rules, role contracts, command policy, packet schemas, testing
     policy, security policy, architecture invariants, and human runbooks live in
     Markdown.

When layers conflict, use the layer responsible for that category.

## Bootstrap Discovery Rules

All AI discovery starts at `AGENTS.md`.

After `AGENTS.md`, read this document.

Do not treat any other Markdown file as an entrypoint unless this document says
so. In particular, `AGENT_START.md` is a compatibility redirect only.

## Mandatory Bootstrap Set

### All agents

1. `AGENTS.md`
2. `.opencode/DEVELOPMENT_DOCS/AI_BOOTSTRAP.md`

### Orchestrators

In addition to the all-agent set:

3. `.opencode/DEVELOPMENT_DOCS/AI_ORCHESTRATOR_EXECUTOR_WORKFLOW.md`
4. `.opencode/DEVELOPMENT_DOCS/execution/STATE_DB_GUIDE.md` when querying runtime state
5. `.opencode/DEVELOPMENT_DOCS/execution/OPENCODE_BROKER.md` when dispatching or reviewing broker runs

### Executors

In addition to the all-agent set:

3. Assigned execution packet
4. Additive docs in `doc_allow_list`

Executors must not read broad status, roadmap, architecture, archive, plan, or
reference documents unless the packet explicitly allow-lists them.

## Optional Task-Specific Reads

Task-specific reads are allowed only after the mandatory bootstrap set.

Allowed sources:

- files in `doc_allow_list`
- files named by `code_targets`
- verification command outputs requested by the packet
- compact SQLite context supplied by the orchestrator or explicitly requested by the packet

`doc_allow_list` is additive. It does not replace the mandatory bootstrap set.

## Command Surface Policy

Agents must use approved command aliases for orchestration state, packet,
routing, artifact, and broker operations.

Approved command surface:

```bash
npm run opencode:*
```

Agents must not:

- execute orchestration PHP scripts directly
- run `php -r` state queries
- open SQLite with `sqlite3`
- mutate `.opencode/runtime/opencode-state.sqlite` directly
- bypass package.json command aliases for state, routing, packet, artifact, or broker operations

### Exceptions

Exceptions are allowed only when all of the following are true:

1. The task is explicitly about maintaining the command surface, broker, state
   tooling, or bootstrap documents.
2. The packet scope names the exact files or scripts allowed for inspection or
   modification.
3. The agent still uses `npm run opencode:*` commands for validation when those
   commands exist.
4. Any direct script or database access is reported as an exception in the final
   executor/orchestrator evidence.

## Markdown vs SQLite vs Code Matrix

| Category | Authority | Notes |
|---|---|---|
| Implemented behavior | Code | Tests and source files define what exists. |
| Current status | SQLite | Markdown must not duplicate current truth. |
| Roadmap state | SQLite | Markdown plans may be ingested or referenced, but SQLite marks active/current state. |
| Active tasks | SQLite | `tasks` is authoritative. |
| Acceptance criteria | SQLite | Packet YAML mirrors SQLite during migration. |
| Scope in/out | SQLite | Packet YAML mirrors SQLite during migration. |
| Verification commands | SQLite | Markdown testing docs define policy, not per-task truth. |
| Architecture rules | Markdown | Code may reveal implementation drift; update docs or code after review. |
| Security policy | Markdown | Security-sensitive implementation remains code truth. |
| Testing policy | Markdown | Actual commands are code/package truth. |
| Execution history | SQLite | Runs/artifacts are summarized through state commands. |
| Routing decisions | SQLite | Use auditable route commands. |
| Performance metrics | SQLite | Use reports from `runs`. |
| Packet schema | Markdown | Generated/validated by code where implemented. |
| Broker behavior | Code + Markdown | Code implements; Markdown documents runbook and policy. |
| Comments policy | Markdown | Local comments only protect non-obvious invariants. |

## Orchestrator Responsibilities

Orchestrators own:

- bootstrap verification
- SQLite-first task discovery
- scope and acceptance criteria refinement
- deciding whether Gate 0 clarification is required
- creating or generating packets
- dispatching executors through the broker
- reviewing actual diffs, files, artifacts, and verification output
- final accept/reject decisions
- marking tasks complete only after review, through the approved command surface

Orchestrators must query runtime state through approved commands, usually:

```bash
npm run opencode:state:context -- --packet-id <packet-id> --limit 5
npm run opencode:state:task:show -- --task-id <task-id>
```

### Mandatory Delegation Rule

The orchestrator must dispatch an executor when either condition is true:

- `delegate_to_executor=true`
- `task_class` is `feature`, `bugfix`, or `refactor`

Allowed exceptions:

- missing credentials or unavailable broker
- explicit human override
- packet class `git_plumbing`
- tiny preflight/status check within the workflow budget
- bootstrap/tooling maintenance packet that explicitly authorizes orchestrator-local edits

All exceptions must be documented in the orchestrator evidence.

## Executor Responsibilities

Executors own one packet only.

Executors may:

- read the mandatory bootstrap set
- read the assigned packet
- read additive docs in `doc_allow_list`
- inspect and edit files inside `code_targets` or scope
- run verification commands named in the packet
- report success or failure using the required schema

Executors must not:

- redefine scope
- expand `doc_allow_list`
- read archives unless explicitly allow-listed
- mark tasks complete
- change routing policy
- mutate SQLite directly
- bypass `npm run opencode:*` for orchestration state
- perform unrelated cleanup

## Bootstrap Verification

At the start of orchestrator work, verify:

1. `AGENTS.md` identifies this file as the canonical bootstrap document.
2. The packet or task has a unique `packet_id` / `task_id`.
3. Runtime state was queried from SQLite if prior state matters.
4. `doc_allow_list` is treated as additive.
5. Delegation rules are evaluated before implementation begins.

## Document Classification Model

Use these classifications for `.opencode/DEVELOPMENT_DOCS/**`:

- `bootstrap_policy`: deterministic agent behavior and mandatory startup rules
- `runtime_state`: current status, task state, phase state, routing state, execution state
- `active_plan`: human-authored active plan; mirror or ingest into SQLite
- `reference_doc`: stable policy, architecture, testing, or security reference
- `archive`: historical material not active unless explicitly referenced
- `audit_report`: review output or migration report
- `obsolete`: retained only for compatibility or historical reasons

Recommended actions:

- `bootstrap_policy`: keep in Markdown
- `runtime_state`: migrate to SQLite; remove from bootstrap Markdown
- `active_plan`: keep human-readable Markdown and mirror/ingest to SQLite
- `reference_doc`: keep in Markdown and optionally ingest searchable snapshot to SQLite
- `archive`: keep in archive; do not read unless allow-listed
- `audit_report`: keep in Markdown or archive; do not use as runtime truth
- `obsolete`: keep only as redirect or archive marker

## Sensitive Areas

Be especially careful around:

- tenancy boundaries
- auth/session storage and refresh flows
- payment provider callbacks and signatures
- booking holds, status transitions, and management tokens
- public-input normalization and output escaping

## Comments Policy

Do not add broad explanatory comments across the codebase for future agents.

Add comments only where they protect a non-obvious invariant, such as security
boundaries, tenant scoping, payment/booking rules, asymmetric normalization or
escaping, or surprising framework interactions.
