# Execution Packet Template

Use this template for every executor handoff.

Policy:

- SQLite `tasks` rows are the authoritative source for a task's scope, acceptance criteria, verification commands, file targets, stop conditions, and routing metadata.
- Packet YAML files are the current executor handoff format. They should eventually be generated from SQLite task state via `buildPacketFromTask()` / `build-packet --task-id <id>`.
- During the migration, keep manually authored packet YAML synchronized with SQLite task state. In case of divergence on scope or criteria, SQLite `tasks` rows are the ground truth.
- Commit both SQLite state and packet YAML to git so handoff format parity is traceable.

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
  task_class: feature # docs|minor|feature|critical|git_plumbing
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
  - "AGENTS.md"
  - ".opencode/DEVELOPMENT_DOCS/AGENT_START.md"
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
