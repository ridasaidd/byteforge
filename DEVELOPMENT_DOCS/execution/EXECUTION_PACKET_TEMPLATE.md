# Execution Packet Template

Use this template for every executor handoff.

Policy:

- Packet YAML is canonical for one run's scope and acceptance criteria.
- SQLite rows are derived operational records from packet + artifacts.
- Never treat DB rows as a replacement for packet content in git.

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
scope:
  in:
    - "Allowed work"
  out:
    - "Explicitly disallowed work"
doc_allow_list:
  - "AGENTS.md"
  - "DEVELOPMENT_DOCS/AGENT_START.md"
  - "DEVELOPMENT_DOCS/path/to/domain-doc.md"
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
