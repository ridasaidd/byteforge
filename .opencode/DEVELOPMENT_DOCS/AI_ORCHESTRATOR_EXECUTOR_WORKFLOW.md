# AI Orchestrator Executor Workflow

Status: canonical
Audience: AI agent + human operator
Last verified: 2026-05-29

This document defines how ByteForge work is split between an orchestrator model
and executor models, with strict packet schemas to reduce token waste and avoid
stateful chat dependency.

## Goals

- keep executor context narrow and task-bound
- keep orchestrator decisions explicit and repeatable
- make retries stateless through packet IDs and attempt numbers
- avoid rereading broad docs for every executor run

## Gate 0: Preflight Clarification

Before generating an execution packet, the orchestrator must first decide whether the human prompt is specific enough to safely route.

If the prompt does not identify target files, a clear architectural surface, or concrete acceptance criteria, the orchestrator must not emit an execution packet. It must emit exactly one clarification packet instead.

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

- Clarification packets are consumed by the local broker, not by the executor.
- Keep clarification to at most 3 questions.
- Use clarification to resolve ambiguity, not to restate the whole prompt.

## Roles

### Orchestrator

- owns scope, routing, sequencing, and final acceptance
- compresses project context into a single execution packet
- chooses next action when executor returns a failure schema
- decides whether partial work is safe to keep or should be discarded
- performs only minimal preflight checks before delegation

### Executor

- performs one packet only
- does not expand scope without explicit orchestrator approval
- returns success or failure using the required schema
- provides test evidence tied to acceptance criteria

## Default Delegation Contract (Cost Mode)

Unless blocked by missing credentials, tool outage, or explicit user override,
the orchestrator should delegate implementation and triage work to the executor
using a packet.

Default triggers for delegation:

- task requires edits in one or more files
- task requires comparing current code with historical changes or stash content
- task requires more than two file reads to answer safely
- task requires targeted validation commands after edits

Default tasks the orchestrator may do directly:

- quick health checks
- branch and status checks
- reading one or two small files to prepare packet scope
- final accept/reject audit of executor output

Token budget guidance for orchestrator preflight:

- keep preflight to smallest context that can produce a safe packet
- prefer SQLite compact context (`opencode:state:context`) over artifact text
- do not perform deep code analysis in orchestrator when executor can do it

## Required Minimal Read Set

Executors must read only:

1. `AGENTS.md`
2. `.opencode/DEVELOPMENT_DOCS/AGENT_START.md`
3. current execution packet

Only after that, read the domain doc(s) listed in the packet.

Do not read `.opencode/DEVELOPMENT_DOCS/archive/**` unless the packet explicitly allows
it.

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
  task_class: feature # docs|minor|feature|critical|git_plumbing
  risk_level: medium # low|medium|high
  finalize_git: false
scope:
  in:
    - "What is allowed"
  out:
    - "What is not allowed"
doc_allow_list:
  - ".opencode/DEVELOPMENT_DOCS/plans/PHASE19_SYSTEM_SURFACES.md"
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
  dependency_gap
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
    category: code|infra|permissions|missing_context|tooling
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

Use this default routing table after failures.

- `requirement_mismatch`: clarify acceptance criteria and reissue packet
- `test_failure`: require focused fix attempt if safe to keep; otherwise reset
- `environment_blocker`: unblock environment, then rerun same packet
- `ambiguity_in_spec`: make one explicit product decision, reissue packet
- `unsafe_change_risk`: reject risky diff, issue narrower packet
- `dependency_gap`: approve dependency change or choose alternate implementation

## Token Discipline Rules

- one packet per executor run
- no broad repo-wide rereads by executors
- no open-ended failure prose; schema only
- orchestrator sends deltas on retries, not full context repeats
- max two next-best actions in failure returns, smallest first
- default to executor delegation for non-trivial work; keep orchestrator preflight minimal

## Canonical vs SQLite Policy

- Markdown docs and execution packets in git are canonical product/process truth.
- SQLite state is an operational cache used for compact context, run evidence, and routing calibration.
- Do not move normative requirements, acceptance criteria text, or roadmap decisions into SQLite-only storage.
- If SQLite rows and markdown docs diverge, markdown docs win and state should be re-ingested from packet/artifacts.

## Operational Runbook

- Local OpenCode packet broker usage is documented in
  `.opencode/DEVELOPMENT_DOCS/execution/OPENCODE_BROKER.md`.
- SQLite state-cache usage is documented in
  `.opencode/DEVELOPMENT_DOCS/execution/STATE_DB_GUIDE.md`.
- Recommended execution path:
  - `opencode:dispatch` to choose profile
  - `opencode:run-auto` to execute packet with selected model
  - orchestrator audit
  - optional local `opencode:git-finalize` for git plumbing
