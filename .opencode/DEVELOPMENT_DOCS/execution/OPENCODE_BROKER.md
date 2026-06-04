# OpenCode Broker Quickstart

Status: canonical broker runbook
Audience: orchestrator operator
Last verified: 2026-06-04

This runbook documents the local packet broker scripts for OpenCode API
execution. It preserves compatibility with the existing packet YAML handoff while
ByteForge moves toward SQLite-generated packets.

## Bootstrap Requirement

Before using the broker, agents must read:

1. `AGENTS.md`
2. `.opencode/DEVELOPMENT_DOCS/bootstrap/AI_BOOTSTRAP.md`
3. `.opencode/DEVELOPMENT_DOCS/bootstrap/AI_ORCHESTRATOR_EXECUTOR_WORKFLOW.md`

This broker runbook is required only for orchestrators/operators dispatching or
reviewing OpenCode runs.

## Command Surface Policy

Use package command aliases only:

```bash
npm run opencode:*
```

Do not call broker/state PHP or Node scripts directly unless a
bootstrap/tooling-maintenance packet explicitly authorizes it.

## Prerequisites

Set credentials in your shell for the current terminal session:

- `OPENCODE_USER`
- `OPENCODE_PASS`
- `OPENCODE_BASE_URL` optional, defaults to `http://100.80.45.13:4096`
- `OPENCODE_RUN_PACKET_TIMEOUT_SEC` optional, defaults to `180`
- `OPENCODE_RUN_AUTO_LOCK_STALE_MS` optional, defaults to `900000`

Example:

```bash
export OPENCODE_USER='your-user'
export OPENCODE_PASS='your-pass'
export OPENCODE_BASE_URL='http://100.80.45.13:4096'
```

## Health and Model Commands

```bash
npm run opencode:health
npm run opencode:models
```

## Recommended SQLite-First Dispatch Flow

1. Inspect task state:

   ```bash
   npm run opencode:task:show -- --task-id <task-id>
   ```

2. Generate packet from SQLite when possible:

   ```bash
   npm run opencode:state:build-packet -- --task-id <task-id>
   ```

3. Pull compact context before retry/dispatch when prior state matters:

   ```bash
   npm run opencode:state:context -- --packet-id <packet-id> --limit 5
   ```

4. Dispatch through `run-auto`:

   ```bash
   npm run opencode:run-auto -- --packet .opencode/runtime/packets/packet.yaml --mode v1
   ```

5. Review actual artifacts, diffs, files, and verification output.

6. Only after review, mark the task complete through the state command:

   ```bash
   npm run opencode:task:complete -- --task-id <task-id>
   ```

Executors must not mark tasks complete.

## One-Command Runner

```bash
npm run opencode:run-loop -- --packet .opencode/runtime/packets/packet.yaml --mode v1
```

`run-loop` runs `run-packet` then `parse-result`. It prints the deterministic
route outcome as the last output line and exits non-zero on failed outcomes.

## Auto Dispatcher

```bash
npm run opencode:run-auto -- --packet .opencode/runtime/packets/packet.yaml --mode v1
```

`run-auto` reads `execution_policy`, chooses a model profile, runs the packet, and
ingests packet/run state.

Routing defaults:

- `task_class=docs|minor` + `risk_level=low` -> cheap profile
- `task_class=feature|bugfix|refactor` or medium risk -> medium profile
- `task_class=critical` or high risk -> high profile
- `task_class=git_plumbing` -> local git path, not executor route

Inspect dispatcher decision only:

```bash
npm run opencode:dispatch -- --packet .opencode/runtime/packets/packet.yaml
```

## Mandatory Delegation Compatibility

If a packet has `delegate_to_executor=true`, or `task_class` is `feature`,
`bugfix`, or `refactor`, the orchestrator must dispatch an executor unless the
workflow policy documents an explicit exception.

## Gate 0 Clarification Short-Circuit

If a packet or orchestrator response is marked `status: clarify`, the broker must
stop before executor dispatch.

Behavior:

- print the clarification packet
- do not call `dispatch` or `run-loop`
- do not create an executor artifact
- keep the clarification packet available for audit/resume

Operational safeguards:

- clarify mode exits non-zero by default through `OPENCODE_CLARIFY_EXIT_CODE=2`
- if the clarification `packet_id` already exists in SQLite state, `run-auto`
  skips packet ingest to avoid mutating historical metadata
- create a new execution packet from answers; do not convert clarify packets into
  pseudo-pending packets

## Compact Context and Stale-Success Protection

Use compact context instead of pasted artifact history:

```bash
npm run opencode:state:context -- --packet-id EP-002 --limit 5
```

`run-auto` records failures when no new artifact is produced. Packet-scoped
`ingest-latest --packet-id` sorts failures first so stale successes do not mask
new failures.

## Artifact Commands

```bash
npm run opencode:last-artifact
npm run opencode:parse-result
npm run opencode:parse-result -- --json
```

Expected parse results:

- `success`
- `failed:<failure_type>`
- `failed:invalid_schema`

Artifacts are written to:

```text
.opencode/runtime/runs/
```

Each artifact includes packet path, packet ID, session ID, selected transport,
assistant text, and raw API response.

## Event Stream Monitor

Default safe monitor:

```bash
npm run opencode:event
```

Filter to one session:

```bash
npm run opencode:event -- --session <session_id>
```

Useful filtered stream:

```bash
OPENCODE_EVENT_BASE_URL=http://100.80.45.13:4096 npm run opencode:event -- --session <session_id> --include session.updated,session.diff,message.completed
```

## Optional Git Finalizer

After successful executor output and orchestrator audit:

```bash
npm run opencode:run-auto -- --packet .opencode/runtime/packets/packet.yaml --finalize-git --commit-message "chore: apply EP-002 output" --files path/a,path/b
```

Or stage all:

```bash
npm run opencode:run-auto -- --packet .opencode/runtime/packets/packet.yaml --finalize-git --commit-message "chore: apply EP-002 output" --all
```

Add `--push` only when intentionally pushing.

## Broker Validation Suite

Quick daily run, no executor token call:

```bash
npm run opencode:broker-verify
```

Full run, includes one low-cost executor-path call:

```bash
npm run opencode:broker-verify:full
```

The suite should verify:

- OpenCode health
- SQLite state init and acceptance verification
- dispatch routing for local_git and executor packets
- Gate 0 clarify short-circuit behavior
- local_git run-auto short-circuit behavior
- compact state context retrieval
- bootstrap points to `AI_BOOTSTRAP.md`
- command-surface policy is present

## Behavior Notes

- Prefer `--mode v1` until v2 is marked available.
- Prompt body is packet-centric and instructs the executor to return schema YAML.
- Result parsing enforces required executor schema fields.
- Non-schema output is `failed:invalid_schema` for deterministic rerouting.
- Auto dispatcher keeps token cost lower by selecting the smallest matching profile.
- SQLite keeps token cost lower through compact run history and state summaries.

Packet Source Rules

Generated task packets:
  .opencode/runtime/packets/

Validation fixtures:
  .opencode/DEVELOPMENT_DOCS/execution/
  .opencode/DEVELOPMENT_DOCS/execution/broker-validation/

Broker tooling must support both locations.
