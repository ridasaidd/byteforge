# OpenCode Broker Quickstart

Status: canonical
Audience: orchestrator operator
Last verified: 2026-05-29

This runbook documents the local packet broker scripts for OpenCode API execution.

## Prerequisites

Set credentials in your shell for the current terminal session:

- OPENCODE_USER
- OPENCODE_PASS
- OPENCODE_BASE_URL (optional, defaults to http://100.80.45.13:4096)
- OPENCODE_RUN_PACKET_TIMEOUT_SEC (optional, defaults to 180)
- OPENCODE_RUN_AUTO_LOCK_STALE_MS (optional, defaults to 900000)

Example:

export OPENCODE_USER='your-user'
export OPENCODE_PASS='your-pass'
export OPENCODE_BASE_URL='http://100.80.45.13:4096'

## Health Check

npm run opencode:health

## List Available Models

npm run opencode:models

## Event Stream Monitor (Filtered)

Default safe monitor (hides `message.part.delta` noise):

npm run opencode:event

Filter to one session:

npm run opencode:event -- --session ses_abc123

Only show specific event types:

npm run opencode:event -- --include session.created,session.updated,message.completed

Show raw payload JSON lines:

npm run opencode:event -- --raw

Show deltas too (normally hidden in safe preset):

npm run opencode:event -- --show-delta

Stop automatically after N printed events:

npm run opencode:event -- --max 50

## One-Command Runner (run-packet + parse-result)

npm run opencode:run-loop -- --packet DEVELOPMENT_DOCS/execution/packet.yaml --mode v1

Runs run-packet then parse-result in one command. Prints the deterministic route
outcome as the last output line. Exits 0 on "success" and non-zero on any "failed:*"
outcome.

Optional flags are forwarded to run-packet: --session, --title, --mode, --agent,
--provider, --model.

Safety guards:

- `run-loop.sh` enforces a wall-clock timeout for `run-packet.mjs` via `timeout`
	when available. This prevents stuck requests from running indefinitely.
- `run-auto.mjs` uses a packet-scoped lock file in
	`storage/opencode-runs/.locks/<packet_id>.lock` to prevent concurrent runs for
	the same packet from fanning out into duplicate model traffic.

## Auto Dispatcher (Token-Efficient Routing)

npm run opencode:run-auto -- --packet DEVELOPMENT_DOCS/execution/packet.yaml --mode v1

This command reads `execution_policy` from the packet, chooses a model profile,
then runs `opencode:run-loop` with provider/model overrides.

If a lock is already active for the same packet, `run-auto` exits with code `2`
and does not start a second run.

Routing defaults:

- `task_class=docs|minor` + `risk_level=low` -> cheap profile
- `task_class=feature` or medium risk -> medium profile
- `task_class=critical` or `risk_level=high` -> high profile
- `task_class=git_plumbing` -> skip executor route (local git path)

Profile model env overrides (optional):

- `OPENCODE_MODEL_CHEAP_PROVIDER`, `OPENCODE_MODEL_CHEAP`
- `OPENCODE_MODEL_MEDIUM_PROVIDER`, `OPENCODE_MODEL_MEDIUM`
- `OPENCODE_MODEL_HIGH_PROVIDER`, `OPENCODE_MODEL_HIGH`

Inspect dispatcher decision only:

npm run opencode:dispatch -- --packet DEVELOPMENT_DOCS/execution/packet.yaml

## SQLite State Cache (Token Reduction)

Initialize DB once:

```bash
npm run opencode:state:init
```

Ingest packet metadata (manual, optional because `run-auto` does this automatically):

```bash
npm run opencode:state:ingest-packet -- --packet DEVELOPMENT_DOCS/execution/packet.yaml
```

Ingest latest artifact result (manual, optional because `run-auto` does this automatically):

```bash
npm run opencode:state:ingest-latest [--packet-id EP-002]
```

With `--packet-id`, only matching artifacts are considered. Stale success
artifacts from other packets are not returned.

Record a failed run:

```bash
npm run opencode:state:record-failure -- --packet-id EP-003 --failure-type environment_blocker [--attempt 1] [--model deepseek-v4-flash]
```

This is called automatically by `run-auto.mjs` when the run-loop exits non-zero
without producing a new artifact. When `--artifact-path` is omitted, a minimal
failure artifact is written to `storage/opencode-runs` and the `.latest` pointer
is updated. This prevents a stale success from an older run from being picked up
by `ingest-latest` or `context`.

Query compact context for orchestrator prompts (token-efficient orchestration):

```bash
npm run opencode:state:context -- --packet-id EP-002 --limit 5
```

Query performance aggregates from runs history:

```bash
npm run opencode:state:report
```

Filter report by task class:

```bash
npm run opencode:state:report -- --task-class minor
```

Manage task routing overrides:

```bash
npm run opencode:state:route-upsert -- --task-class minor --risk-level low --provider opencode-go --model deepseek-v4-flash --variant cheap
npm run opencode:state:route-list
```

Enforcement policy:

- Orchestrator retries must use `opencode:state:context` (compact JSON), not pasted full artifact history.
- Routing changes should be done through `opencode:state:route-upsert` (or `opencode:state:calibrate -- --apply`) so decisions are auditable.
- Keep markdown docs canonical for requirements and plans; SQLite is operational memory.

Use this compact JSON context in prompts instead of pasting full historical
markdown. The output includes:
- `packet` — packet metadata
- `stats` — total/success/failure run counts
- `recent_runs` — last N runs with `status`, `attempt`, `model`, `failure_type`

Embed the compact context directly in orchestrator prompts to give executors
run-history awareness without burning tokens on full artifact text.

The orchestrator prompt fragment should include the compact context JSON as a
brief preamble, not the full artifact YAML or raw log output. For example:

> Recent context for EP-003: {"stats":{"total_runs":3,"success_runs":1,"failed_runs":2},"recent_runs":[{"status":"failed:environment_blocker","attempt":2},{"status":"success","attempt":1}]}

Keep markdown docs as canonical source-of-truth in git.

See `DEVELOPMENT_DOCS/execution/STATE_DB_GUIDE.md` for detailed context output
schema, prompt formatting recommendations, and the orchestrator prompt example.

## Optional Git Finalizer Step

After a successful executor+audit result, run local git plumbing in one command:

npm run opencode:run-auto -- --packet DEVELOPMENT_DOCS/execution/packet.yaml --finalize-git --commit-message "chore: apply EP-002 output" --files scripts/opencode/run-loop.sh,package.json

Or stage all:

npm run opencode:run-auto -- --packet DEVELOPMENT_DOCS/execution/packet.yaml --finalize-git --commit-message "chore: apply EP-002 output" --all

Add `--push` to push immediately after commit.

## Run One Execution Packet

npm run opencode:run-packet -- --packet DEVELOPMENT_DOCS/execution/packet.yaml --mode v1

## Get Latest Artifact Path

npm run opencode:last-artifact

## Parse Latest Result For Routing

npm run opencode:parse-result

Expected output values:

- success
- failed:<failure_type>
- failed:invalid_schema

Optional flags:

- --artifact <path>     parse a specific artifact instead of latest
- --json                emit detailed JSON for debugging

Run-packet optional flags:

- --session <ses_id>     reuse an existing session
- --title <title>        title used when creating a new session
- --mode v1|auto|v2      transport selection (default is v1; auto tries v2 then falls back to v1)
- --agent <name>         force agent for prompt call
- --provider <id>        provider ID override
- --model <id>           model ID override

Artifacts are written to:

storage/opencode-runs/

Each artifact includes:

- packet path and packet id
- session id
- selected transport (v2 or v1)
- assistant text
- raw API response

## Behavior Notes

- The script prefers /api/session/{id}/prompt and /api/session/{id}/wait.
- If v2 is unavailable (for example 503 ServiceUnavailableError), it falls back to /session/{id}/message.
- Current upstream behavior for this project environment returns 503 for `v2.session.prompt` and `v2.session.wait`; use `--mode v1` by default until v2 is marked available.
- Prompt body is packet-centric and instructs the executor to return only the required schema YAML.
- Result parsing uses PHP + Symfony YAML parser through Composer autoload.
- Result parsing enforces required executor schema fields (`schema_version`, `status`, `task_ref.*`, and `failure_type` when failed).
- Outputs that are not schema-compliant YAML are treated as `failed:invalid_schema` for deterministic rerouting.
- Auto dispatcher keeps token cost lower by selecting the smallest profile that matches packet risk.
- SQLite state cache keeps token cost lower by giving compact run history and status summaries.
