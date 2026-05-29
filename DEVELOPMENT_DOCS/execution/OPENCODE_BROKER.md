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

Example:

export OPENCODE_USER='your-user'
export OPENCODE_PASS='your-pass'
export OPENCODE_BASE_URL='http://100.80.45.13:4096'

## Health Check

npm run opencode:health

## List Available Models

npm run opencode:models

## One-Command Runner (run-packet + parse-result)

npm run opencode:run-loop -- --packet DEVELOPMENT_DOCS/execution/packet.yaml --mode auto

Runs run-packet then parse-result in one command. Prints the deterministic route
outcome as the last output line. Exits 0 on "success" and non-zero on any "failed:*"
outcome.

Optional flags are forwarded to run-packet: --session, --title, --mode, --agent,
--provider, --model.

## Run One Execution Packet

npm run opencode:run-packet -- --packet DEVELOPMENT_DOCS/execution/packet.yaml --mode auto

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
- --mode auto|v2|v1      transport selection (auto tries v2 then falls back to v1)
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
- Prompt body is packet-centric and instructs the executor to return only the required schema YAML.
- Result parsing uses PHP + Symfony YAML parser through Composer autoload.
- Result parsing enforces required executor schema fields (`schema_version`, `status`, `task_ref.*`, and `failure_type` when failed).
- Outputs that are not schema-compliant YAML are treated as `failed:invalid_schema` for deterministic rerouting.
