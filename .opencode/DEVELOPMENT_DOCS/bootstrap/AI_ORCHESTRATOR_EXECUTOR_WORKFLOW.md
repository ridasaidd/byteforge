# AI Orchestrator Executor Workflow

Status: canonical workflow policy
Audience: AI agent + human operator
Last verified: 2026-06-04

This document defines how ByteForge work is split between orchestrator models and
executor models while preserving SQLite-first runtime state and OpenCode broker
compatibility.

## Goals

- deterministic bootstrap behavior
- narrow executor context
- explicit orchestrator decisions
- stateless retries through packet IDs and attempts
- low token use through SQLite compact context
- compatibility with GPT/Codex orchestrators and open-weight executors

## Mandatory Bootstrap

Before using this workflow, agents must read:

1. `AGENTS.md`
2. `.opencode/DEVELOPMENT_DOCS/AI_BOOTSTRAP.md`

Orchestrators then read this document.

Executors read this document only if their packet or orchestrator prompt includes
it in the bootstrap context. Executors must still follow the schemas in their
assigned packet.

## Gate 0: Preflight Clarification

Before generating an execution packet, the orchestrator must decide whether the
human prompt or SQLite task state is specific enough to route safely.

If target files, architectural surface, scope, or acceptance criteria are missing
or contradictory, the orchestrator must not dispatch an executor. It must emit
exactly one clarification packet.

### Clarification Packet Schema

```yaml
schema_version: 1
status: clarify
task_ref:
  packet_id: EP-001
  phase: PHASE19
  attempt: 1
gaps_identified:
  - "Short description of what is missing or ambiguous."
clarifying_questions:
  - "Direct, high-impact question to resolve the gap."
```

Rules:

- Clarification packets are consumed by the local broker, not by executors.
- Ask at most 3 questions.
- Use clarification only to resolve routing-blocking ambiguity.
- Do not reuse a completed packet ID for new work.

## Roles

### Orchestrator

The orchestrator owns:

- bootstrap verification
- SQLite-first task discovery
- scope, sequencing, and routing
- Gate 0 clarification
- packet creation or generation
- executor dispatch
- retry decisions
- reviewing actual outputs, artifacts, diffs, file contents, and verification output
- final acceptance
- task completion through approved command-surface commands

The orchestrator must not perform deep implementation when delegation is required.

### Executor

The executor owns:

- one assigned packet
- implementation inside packet scope
- focused reads from the mandatory bootstrap set, packet, `doc_allow_list`, and code targets
- verification commands named by the packet
- schema-compliant success/failure reporting

The executor must not:

- mark tasks complete
- redefine scope
- expand `doc_allow_list`
- change routing policy
- read archives unless explicitly allow-listed
- mutate SQLite directly
- bypass command-surface rules

## Command Surface Policy

All orchestration state, packet, routing, artifact, and broker operations must use
approved npm aliases:

```bash
npm run opencode:*
```

Agents must not execute orchestration PHP scripts directly, run `php -r` state
queries, open SQLite directly, or bypass package.json aliases.

Exceptions require explicit packet authorization for bootstrap/tooling
maintenance and must be reported in execution evidence.

## SQLite-First Task Discovery

Orchestrators must prefer SQLite over Markdown for runtime/project state.

Use compact context before retries or dispatch when prior state matters:

```bash
npm run opencode:state:context -- --packet-id <packet-id> --limit 5
```

Use task commands for task definitions:

```bash
npm run opencode:state:task:show -- --task-id <task-id>
npm run opencode:state:build-packet -- --task-id <task-id>
```

Do not reconstruct current status or active task state from Markdown.

## Default Delegation Contract

Unless blocked by missing credentials, broker outage, explicit human override,
`git_plumbing`, or a packet-authorized tooling/bootstrap exception, the
orchestrator must dispatch an executor when:

- `delegate_to_executor=true`, or
- `task_class` is `feature`, `bugfix`, or `refactor`.

The orchestrator should also delegate when the task requires:

- edits in one or more files
- comparing current code with historical changes or stash content
- more than two file reads to answer safely
- targeted validation commands after edits
- workflow validation of broker/state/packet/executor behavior

The orchestrator may do directly:

- quick health checks
- branch/status checks
- reading up to two small files for packet preparation
- final review/audit of executor output
- explicit local git plumbing

## Orchestrator Preflight Budget

Default budget before delegation:

- max file reads: 2
- max diff inspections: 1
- no deep code analysis unless packet explicitly allows it
- use compact SQLite context instead of pasted artifacts

If the budget is insufficient, generate a narrower packet instead of continuing
in the orchestrator.

## Required Executor Read Set

Executors must read only:

1. `AGENTS.md`
2. `.opencode/DEVELOPMENT_DOCS/AI_BOOTSTRAP.md`
3. current execution packet
4. files in `doc_allow_list`
5. relevant files in `code_targets`

`doc_allow_list` is additive. It does not replace the mandatory bootstrap set.

Do not read `.opencode/DEVELOPMENT_DOCS/archive/**` unless explicitly listed.

## Execution Packet Schema

Each task starts with exactly one execution packet after Gate 0 passes.

```yaml
schema_version: 1
task_ref:
  packet_id: EP-001
  phase: PHASE19
  attempt: 1
  executor_model: deepseek-v4-pro-high
  parent_packet_id: null
summary: "One-sentence task summary"
execution_policy:
  task_class: feature # docs|minor|feature|bugfix|refactor|critical|git_plumbing
  risk_level: medium # low|medium|high
  finalize_git: false
  delegate_to_executor: true
  orchestrator_preflight_budget:
    max_file_reads: 2
    max_diff_inspections: 1
    allow_deep_analysis: false
scope:
  in:
    - "What is allowed"
  out:
    - "What is not allowed"
doc_allow_list:
  - ".opencode/DEVELOPMENT_DOCS/path/to/domain-doc.md"
code_targets:
  - "path/to/file"
acceptance_criteria:
  - id: AC-1
    text: "Concrete expected outcome"
verification:
  commands:
    - "Exact test command"
stop_conditions:
  - "Condition that requires escalation"
```

## Executor Return Schema Success

```yaml
schema_version: 1
status: success
task_ref:
  packet_id: EP-001
  phase: PHASE19
  attempt: 1
  executor_model: deepseek-v4-pro-high
acceptance_criteria_check:
  - id: AC-1
    result: pass
    evidence: "Short evidence"
changes:
  files_touched:
    - path: "path/to/file"
      change: "Short description"
execution_evidence:
  commands_run:
    - "command"
  tests_run:
    - name: "test name"
      result: pass
      key_output: "single key line"
risks:
  - "Any residual risk, or 'none'"
completion_note: "Executor does not mark SQLite tasks complete; orchestrator must review and complete."
```

## Executor Return Schema Failure

```yaml
schema_version: 1
status: failed
task_ref:
  packet_id: EP-001
  phase: PHASE19
  attempt: 1
  executor_model: deepseek-v4-pro-high
failure_type: one_of[
  requirement_mismatch,
  test_failure,
  environment_blocker,
  ambiguity_in_spec,
  unsafe_change_risk,
  dependency_gap,
  command_surface_blocker,
  scope_violation_risk
]
summary: "1-2 sentence plain failure summary"
acceptance_criteria_check:
  - id: AC-1
    result: pass|fail|not_attempted
    evidence: "Short evidence"
what_was_done:
  files_touched:
    - path: "path/to/file"
      change: "Short description"
  commands_run:
    - "command"
  tests_run:
    - name: "test name"
      result: pass|fail|blocked
      key_output: "single key line"
blockers:
  - blocker: "Concrete blocker"
    category: code|infra|permissions|missing_context|tooling|command_surface
    reproducible: true|false
    proof: "error line or symptom"
risk_assessment:
  attempted_fix_is_safe_to_keep: true|false
  why: "Short reason"
next_best_actions:
  - option_id: A
    action: "Smallest viable next action"
    owner: orchestrator|executor
    expected_cost: low|medium|high
  - option_id: B
    action: "Fallback action"
    owner: orchestrator|executor
    expected_cost: low|medium|high
replan_request:
  needed_from_orchestrator:
    - "Missing decision/constraint"
  proposed_updated_scope:
    - "Narrowed scope proposal"
```

## Orchestrator Decision Policy

Use this routing table after executor failure:

- `requirement_mismatch`: clarify acceptance criteria and reissue packet
- `test_failure`: require focused fix attempt if safe to keep; otherwise reset
- `environment_blocker`: unblock environment, then rerun same packet
- `ambiguity_in_spec`: make one explicit product decision, reissue packet
- `unsafe_change_risk`: reject risky diff, issue narrower packet
- `dependency_gap`: approve dependency change or choose alternate implementation
- `command_surface_blocker`: fix or document command-surface gap before retry
- `scope_violation_risk`: narrow packet and explicitly restate boundaries

## Review Policy

The orchestrator must review actual outputs, artifacts, diffs, file contents, and
verification output.

Executor summaries are not sufficient evidence.

Approval must be based on acceptance criteria, resulting files, and verification
output. Environment blockers are not implementation failures by themselves.

Only the orchestrator may mark tasks complete, and only through the approved
command surface.

## Token Discipline Rules

- one packet per executor run
- no broad repo-wide rereads by executors
- no open-ended failure prose; schema only
- orchestrator sends deltas on retries, not full context repeats
- max two next-best actions in failure returns, smallest first
- compact SQLite context replaces full artifact history
- include doc references and hashes when possible instead of full doc text

## Operational Runbook Links

- Broker usage: `.opencode/DEVELOPMENT_DOCS/execution/OPENCODE_BROKER.md`
- SQLite state usage: `.opencode/DEVELOPMENT_DOCS/execution/STATE_DB_GUIDE.md`
- Packet template: `.opencode/DEVELOPMENT_DOCS/execution/EXECUTION_PACKET_TEMPLATE.md`
