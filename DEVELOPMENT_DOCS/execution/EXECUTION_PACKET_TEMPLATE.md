# Execution Packet Template

Use this template for every executor handoff.

```yaml
schema_version: 1
task_ref:
  packet_id: EP-XXX
  phase: PHASEXX
  attempt: 1
  executor_model: deepseek-v4-pro-high
  parent_packet_id: null
summary: "One-sentence task statement"
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
