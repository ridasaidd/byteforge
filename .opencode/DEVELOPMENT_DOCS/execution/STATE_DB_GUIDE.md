# OpenCode State DB Guide

Status: canonical
Audience: orchestrator + executor operators
Last verified: 2026-05-29

This guide defines how to use the local SQLite state database for authoritative
runtime state (tasks, plans, reference docs, runs, routing, execution state) while
treating markdown bootstrap docs as the authority for behavioral rules, workflow
contracts, and conventions.

## Why This Exists

SQLite reduces token use only when prompts use compact query output instead of
pasting full historical docs and artifacts.

## Authority Split: Markdown vs SQLite

- **Markdown bootstrap docs** (`.opencode/DEVELOPMENT_DOCS/**`): Canonical for behavioral rules, workflow contracts, delegation policies, return schemas, system conventions, and architecture descriptions.
- **SQLite state database** (`.opencode/runtime/opencode-state.sqlite`): Canonical for runtime project state — tasks, phase plans, reference docs, runs, routing, and execution state.
- If they diverge on task/plan/ref content, SQLite wins. If they diverge on behavioral rules, markdown wins.

## Commands

Initialize schema:

npm run opencode:state:init

Ingest packet metadata:

npm run opencode:state:ingest-packet -- --packet .opencode/DEVELOPMENT_DOCS/execution/packet.yaml

Ingest latest artifact:

npm run opencode:state:ingest-latest

Query compact context:

npm run opencode:state:context -- --packet-id EP-002 --limit 5

Query performance report aggregates:

npm run opencode:state:report

Filter report to one task class:

npm run opencode:state:report -- --task-class minor

Manage task routing overrides:

npm run opencode:state:route-upsert -- --task-class minor --risk-level low --provider opencode-go --model deepseek-v4-flash --variant cheap

npm run opencode:state:route-list

Backfill historical artifact metrics into runs:

npm run opencode:state:backfill

Backfill only one packet:

npm run opencode:state:backfill -- --packet-id EP-003

Generate periodic routing calibration recommendations (manual):

npm run opencode:state:calibrate -- --min-runs 3

Apply recommendations to task_routing:

npm run opencode:state:calibrate -- --min-runs 3 --apply

Run full state acceptance verification:

npm run opencode:state:verify

Override packet and packet-id when needed:

bash scripts/opencode/state-verify.sh --packet .opencode/DEVELOPMENT_DOCS/execution/packet.yaml --packet-id EP-003 --limit 3

Bulk-ingest plans, reference docs, and packets:

npm run opencode:state:ingest-all

### Task State Commands

Create a task from the authoritative SQLite task state:

npm run opencode:state:task:create -- --task-id EP-004 --phase PHASE19 --summary "Task summary"

List all tasks:

npm run opencode:state:task:list

Show a specific task:

npm run opencode:state:task:show -- --task-id EP-004

Mark a task complete:

npm run opencode:state:task:complete -- --task-id EP-004

Block a task:

npm run opencode:state:task:block -- --task-id EP-004 --reason "Blocked reason"

Unblock a task:

npm run opencode:state:task:unblock -- --task-id EP-004

Ingest a packet YAML file into task state:

npm run opencode:state:task:ingest-packet -- --packet .opencode/DEVELOPMENT_DOCS/execution/packet.yaml

Generate a packet YAML from SQLite task state (replaces manual YAML authoring):

npm run opencode:state:build-packet -- --task-id EP-004

### Plan and Reference Doc Commands

List ingested phase plans:

npm run opencode:state:plan:list

Show an ingested plan:

npm run opencode:state:plan:show -- --plan-key PHASE19

Ingest a single plan:

npm run opencode:state:plan:ingest -- --plan-key PHASE19 --title "Phase 19" --file .opencode/DEVELOPMENT_DOCS/plans/PHASE19_SYSTEM_SURFACES.md

List ingested reference docs:

npm run opencode:state:ref:list

Show an ingested reference doc:

npm run opencode:state:ref:show -- --doc-key TESTING

Ingest a single reference doc:

npm run opencode:state:ref:ingest -- --doc-key TESTING --title "Testing Guide" --file .opencode/DEVELOPMENT_DOCS/TESTING.md

## Compact Context Query Flow (Token-Efficient Orchestration)

### Why compact context

Pasting full markdown docs and prior run artifacts into prompts wastes tokens.
The `context` command returns a structured JSON summary — packet metadata, run
statistics, and the most recent runs — that fits in a fraction of the tokens of
full artifact text.

### Typical flow

1. **Before dispatching a new executor run**, the orchestrator pulls compact
   context for the target packet ID:
   ```
   npm run opencode:state:context -- --packet-id EP-003 --limit 3
   ```
2. The returned JSON has three top-level keys:
    - `packet` — the packet row (`packet_id`, `phase`, `task_class`,
      `risk_level`, `summary`, `last_attempt`, `updated_at`). Null if no
      packet metadata has been ingested yet.
    - `stats` — aggregate counts: `total_runs`, `success_runs`, `failed_runs`.
    - `recent_runs` — array of the most recent N run entries, each with
      `packet_id`, `attempt`, `model`, `status`, `failure_type`,
      `artifact_path`, `created_at`, and optional token/cost/duration fields
      when available from the artifact.
3. Embed the compact JSON (or a minimal summary derived from it) in the
   orchestrator prompt preamble — this replaces pasting full run logs,
   artifact text, or markdown docs. Place it at the top of the prompt before
   the execution packet, like:
   ```
   Recent context for EP-003:
   {"stats":{"total_runs":2,"success_runs":0,"failed_runs":2},"recent_runs":[{"status":"failed:environment_blocker","attempt":2},{"status":"success","attempt":1}]}
   ```
4. The executor receives only the summary — it sees how many prior attempts
   exist and whether the last outcome was success or failure, without reading
   full markdown doc text or raw artifact JSON. The compact form uses ~150
   tokens vs ~1500+ for full artifact text.

### Orchestrator Prompt Example

Given this compact context output:

```json
{
  "packet": {
    "packet_id": "EP-003",
    "phase": "PHASE19",
    "task_class": "minor",
    "risk_level": "low",
    "summary": "Harden and complete the SQLite orchestration state workflow",
    "last_attempt": 2,
    "updated_at": "2026-05-29T12:00:00+00:00"
  },
  "stats": { "total_runs": 3, "success_runs": 1, "failed_runs": 2 },
  "recent_runs": [
      {"packet_id": "EP-003", "attempt": 2, "model": "deepseek-v4-flash", "status": "failed:environment_blocker", "failure_type": "environment_blocker", "artifact_path": ".opencode/runtime/runs/...EP-003.json", "created_at": "2026-05-29T11:55:00+00:00"},
      {"packet_id": "EP-003", "attempt": 1, "model": "deepseek-v4-flash", "status": "success", "failure_type": null, "artifact_path": ".opencode/runtime/runs/...EP-003.json", "created_at": "2026-05-29T11:50:00+00:00"}
  ]
}
```

The orchestrator embeds only the compact context in its prompt rather than
pasting the full artifact JSON or run log:

```
Recent context for EP-003 (from context command):
total_runs=3, last_attempt=2, last_status=failed:environment_blocker

Packet: EP-003, phase=PHASE19, task_class=minor, risk_level=low

This is a retry of attempt 2. The previous run failed with
environment_blocker. No new artifact was produced — the failure
was recorded by record-failure.
```

### Stale Artifact Protection

Two layers prevent stale success artifacts from being returned:

1. **`run-auto` failure recording** — When `run-auto` detects a run that failed
   without producing a new artifact (non-zero exit, same `.latest` before and
   after), it automatically calls `record-failure`, which writes a minimal
   failure artifact and updates the `.latest` pointer. This ensures the failure
   is visible in every subsequent `context` query.

2. **`latestArtifactPath` packet-ID filter** — When `ingest-latest` is called
   with `--packet-id`, the function scans all artifacts in the runs directory
   matching that packet ID rather than trusting `.latest` alone. Matching
   artifacts are sorted: **failures first** (newest failure), then **successes**
   (newest success). The first entry is returned and `.latest` is updated only
   if the chosen path differs. This guarantees that even if `.latest` was left
   pointing to a stale success, a subsequent packet-scoped query will pick the
   most recent failure instead.

Note: `ingest-artifact --artifact <path>` does not use the packet-ID filter
because it ingests an explicit artifact path. To benefit from stale-success
protection during ingest, use `ingest-latest --packet-id <id>` instead.

**Why this matters:** Without stale-protection, a failed run that crashes before
producing an artifact would leave `.latest` pointing to a prior success. A
subsequent `ingest-latest` without the packet-ID filter might re-ingest that
stale success, masking the failure from state. The combination of
`record-failure` (layer 1) and the packet-scoped sort (layer 2) ensures a
failure is never hidden by a stale success artifact.

### Embedding in Orchestrator Prompts

The compact context output from the `context` command is designed to be embedded
directly into orchestrator prompt preambles. The `db_path` key is informational
and should be stripped before embedding.

**Step-by-step flow:**

1. Pull compact context for the target packet:
   ```bash
   npm run opencode:state:context -- --packet-id EP-003 --limit 3
   ```
2. Extract the `packet`, `stats`, and `recent_runs` keys. Omit `db_path`.
3. Embed as a single compact JSON line in the orchestrator preamble:

   ```
   Recent context for EP-003:
   {"stats":{"total_runs":3,"success_runs":1,"failed_runs":2},"recent_runs":[{"status":"failed:environment_blocker","attempt":2},{"status":"success","attempt":1}]}
   ```

**Token savings (measured):**

| Content | Approx. tokens |
|---|---|
| Full artifact JSON (raw API response) | ~2,500–4,000 |
| Full artifact assistantText (YAML result) | ~1,200–1,800 |
| Compact context (stats + recent_runs only) | ~120–180 |

**When to include the `packet` block:**

```json
{"packet_id":"EP-003","phase":"PHASE19","task_class":"minor","risk_level":"low","summary":"Harden...","last_attempt":2,"updated_at":"2026-05-29T12:00:00+00:00"}
```

Include the `packet` block (~120 tokens) only when the executor needs packet
metadata (task class, risk level, summary) for routing-awareness. For simple
retries, `stats` + `recent_runs` alone is sufficient.

### Recommended Prompt Strategy

1. Pull compact context from SQLite for current packet ID.
2. Include only `stats` + `recent_runs` (omit `db_path`; include `packet` block
   only when executor needs routing-awareness metadata).
3. Include doc references and hashes, not full doc text, unless changed.
4. Escalate context size only when execution repeatedly fails.
5. When context shows repeated failures, include only the most recent failed
   run's `failure_type` and `issues_json` — not the full artifact YAML.
6. Embed the compact JSON directly (or a minimal summary) in the orchestrator
   prompt preamble — for example:
   ```
   Recent context for EP-003: {"stats":{"total_runs":3,"success_runs":1,"failed_runs":2},"recent_runs":[{"status":"failed:environment_blocker","attempt":2},{"status":"success","attempt":1}]}
   ```
   This burns ~150 tokens vs ~1500+ for full artifact text.

## What To Store In SQLite

`tasks` table is the authoritative source for task definitions:

1. Identity: `task_id`, `phase`, `summary`
2. Scope: `scope_in`, `scope_out`, `file_targets`
3. Criteria: `acceptance_criteria`, `verification`, `doc_allow_list`, `stop_conditions`
4. Routing: `task_class`, `risk_level`, `executor_model`, `delegate_to_executor`
5. Lifecycle: `attempt`, `completed`, `completed_at`, `blocked`, `blocked_reason`, `priority`

`phase_plans` table stores ingested phase plan content:

1. `plan_key`, `title`, `content`, `status`

`reference_docs` table stores ingested reference documentation content:

1. `doc_key`, `title`, `content`

`packets` table should keep packet metadata and latest attempt counters:

1. `packet_id`, `phase`, `task_class`, `risk_level`, `summary`
2. `last_attempt`, `updated_at`

`runs` table should keep per-execution evidence for routing decisions:

1. Identity: `run_id`, `packet_id`, `phase`, `task_class`, `attempt`
2. Routing/model choice: `provider`, `model`, `variant`
3. Outcome: `status`, `failure_type`, `issues_json`
4. Cost/perf: `input_tokens`, `output_tokens`, `cost`, `duration_ms`
5. Traceability: `artifact_path`, `session_id`, `transport`, `created_at`

This supports the feedback loop:

`task_routing decision -> runs outcome evidence -> routing update`

`task_routing` can remain config-backed for now (for example dispatch defaults and
env overrides). The `runs` evidence layer is now available to tune routing with
real project outcomes.

## Token Spending Tracking

`report` now includes token and cost summary fields from the `runs` table:

1. `total_input_tokens`
2. `total_output_tokens`
3. `total_tokens`
4. `total_cost`
5. `avg_cost`
6. `avg_duration_ms`

Use this as your spending dashboard baseline:

```bash
npm run opencode:state:report
```

And focus by task class when tuning routing:

```bash
npm run opencode:state:report -- --task-class minor
```

## Operating Model (Default Mode)

Use this split:

1. **SQLite** (`.opencode/runtime/opencode-state.sqlite`) is the authoritative runtime state for tasks, phase plans, reference docs, runs, routing, and execution state.
2. **Markdown bootstrap docs** (`.opencode/DEVELOPMENT_DOCS/**`) are canonical for behavioral rules, workflow contracts, and conventions.

Daily flow:

1. Keep task state and execution state in SQLite as the primary project truth.
2. Use packet YAML files as the executor handoff format; generate them from SQLite task state via `build-packet --task-id <id>` when possible.
3. Run broker execution (`opencode:run-auto`) to ingest packet metadata and run artifacts.
4. Before retries, pull compact context from SQLite (`opencode:state:context`) and include only summary JSON in prompts.
5. If a run fails without a new artifact, rely on `record-failure` fallback so context reflects the failure immediately.
6. Bulk-ingest all plan/ref/packet content with `opencode:state:ingest-all`.
7. Periodically run `opencode:state:verify` to ensure stale-success protection and command health remain intact.

When markdown docs take precedence:

1. Behavioral rules, workflow contracts, schemas, and conventions live in markdown; SQLite does not override these.
2. If SQLite task content and a manually authored packet YAML diverge on scope or criteria, SQLite is authoritative for the task definition.

## Notes

- `opencode:run-auto` automatically ingests packet metadata and latest artifact.
- `task_class=git_plumbing` should route to local finalizer, not executor models.
