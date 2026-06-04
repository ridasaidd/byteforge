# Execution Packet Template

Status: canonical packet schema
Audience: orchestrator + executor + broker
Last verified: 2026-06-04

Use this template for every executor handoff.

## Policy

- SQLite `tasks` rows are authoritative for task scope, acceptance criteria,
  verification commands, file targets, stop conditions, lifecycle state, and
  routing metadata.
- Packet YAML files are the current OpenCode executor handoff format.
- Packets should be generated from SQLite task state with:

  ```bash
  npm run opencode:state:build-packet -- --task-id <task-id>
  ```

- During migration, manually authored packet YAML must be synchronized with
  SQLite task state.
- If packet YAML and SQLite diverge on task/runtime state, SQLite wins.
- Markdown packet schema remains the behavioral/schema authority.
- Executors must not mark SQLite tasks complete.

## doc_allow_list Semantics

`doc_allow_list` is additive.

It does not replace the mandatory bootstrap set:

1. `AGENTS.md`
2. `.opencode/DEVELOPMENT_DOCS/bootstrap/AI_BOOTSTRAP.md`
3. assigned execution packet

Only after reading those may the executor read files listed in `doc_allow_list`.

Do not include mandatory bootstrap files in `doc_allow_list`; they are implicit.

## Command Surface Policy

Any orchestration state, packet, routing, artifact, or broker operation must use:

```bash
npm run opencode:*
```

Do not call orchestration PHP scripts directly, use `php -r` for state queries,
open SQLite directly, or bypass package.json aliases unless the packet explicitly
authorizes command-surface/bootstrap tooling maintenance.

## Template

```yaml
schema_version: 1
task_ref:
  packet_id: EP-XXX
  phase: PHASEXX
  attempt: 1
  executor_model: deepseek-v4-pro-high
  parent_packet_id: null
summary: "One-sentence task statement"
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
    - "Allowed work"
  out:
    - "Explicitly disallowed work"
doc_allow_list:
  - ".opencode/DEVELOPMENT_DOCS/path/to/domain-doc.md"
code_targets:
  - "path/to/file"
acceptance_criteria:
  - id: AC-1
    text: "Concrete expected behavior"
verification:
  commands:
    - "npm run test:run -- path/to/spec"
stop_conditions:
  - "Missing required env var"
  - "Contradictory doc guidance"
```

## Delegation Rule

If `delegate_to_executor=true`, or if `task_class` is `feature`, `bugfix`, or
`refactor`, the orchestrator must dispatch an executor unless an explicit
exception exists in the workflow policy or packet scope.

## Completion Rule

Executor success means the packet was completed from the executor perspective.
It does not complete the SQLite task. The orchestrator must review the output and
then complete the task through the approved command surface.
