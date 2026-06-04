# AGENTS.md

Status: canonical root entrypoint
Audience: all AI agents and human operators
Last verified: 2026-06-04

This is the only root-level AI discovery document for ByteForge.

## Deterministic Bootstrap Flow

Every AI agent must start here, then read exactly the canonical bootstrap document:

```text
.opencode/DEVELOPMENT_DOCS/bootstrap/AI_BOOTSTRAP.md
```

`AGENT_START.md` is retained only as a compatibility redirect. It is not the
canonical entrypoint and must not be used for current project state.

## Authority Model

- Code is implementation truth.
- SQLite is runtime/project state truth.
- Markdown is behavioral and policy truth.

When these layers conflict:

1. Code wins for implemented behavior.
2. SQLite wins for runtime/project state.
3. Markdown wins for behavioral rules, policy, workflow contracts, and schemas.

## Mandatory Bootstrap Reads

All agents:

1. `AGENTS.md`
2. `.opencode/DEVELOPMENT_DOCS/bootstrap/AI_BOOTSTRAP.md`

Orchestrators additionally read:

3. `.opencode/DEVELOPMENT_DOCS/bootstrap/AI_ORCHESTRATOR_EXECUTOR_WORKFLOW.md`
4. `.opencode/DEVELOPMENT_DOCS/execution/STATE_DB_GUIDE.md` when using runtime state
5. `.opencode/DEVELOPMENT_DOCS/execution/OPENCODE_BROKER.md` when dispatching through OpenCode

Executors additionally read:

3. The assigned execution packet
4. Additive task-specific docs listed in `doc_allow_list`

Executors do not read broad status, roadmap, plan, archive, or reference docs
unless the packet explicitly allows them.

## doc_allow_list Semantics

`doc_allow_list` is additive.

It never replaces the mandatory bootstrap set. It grants permission to read
additional task-specific Markdown after the bootstrap set and packet have been
read.

## Command Surface Policy

Agents must use approved command aliases for orchestration state and broker
operations.

Allowed orchestration command surface:

```bash
npm run opencode:*
```

Agents must not:

- execute orchestration PHP scripts directly
- run `php -r` state queries
- open or mutate SQLite directly
- bypass package.json command aliases for state, routing, packet, artifact, or broker operations

Exceptions are allowed only when a task packet explicitly marks the work as local
tooling/bootstrap maintenance and names the exact files or scripts that may be
inspected or changed.

## SQLite-First Runtime State

For current status, roadmap state, active tasks, packet metadata, execution
history, routing decisions, and performance metrics, use SQLite through the
command surface.

Common commands:

```bash
npm run opencode:state:context -- --packet-id <packet-id> --limit 5
npm run opencode:task:list
npm run opencode:task:show -- --task-id <task-id>
npm run opencode:state:build-packet -- --task-id <task-id>
npm run opencode:state:report
npm run opencode:state:route-list
```

## Orchestrator Default

If `delegate_to_executor=true` or `task_class` is `feature`, `bugfix`, or
`refactor`, the orchestrator must dispatch an executor unless an explicit
exception is documented in the packet or workflow policy.

## Executor Default

Executors perform only the assigned packet. They must not redefine scope, mark
SQLite tasks complete, or perform broad project discovery outside the packet and
additive `doc_allow_list`.
