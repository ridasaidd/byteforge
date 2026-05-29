#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage: npm run opencode:run-loop -- --packet <file> [--session <ses_id>] [--title <title>] [--mode auto|v2|v1] [--agent <name>] [--provider <id>] [--model <id>]

Runs an execution packet against the OpenCode API, then parses the result and prints
a deterministic route outcome. Exits 0 on "success" and non-zero on "failed:*".

Environment variables:
  OPENCODE_USER (required)
  OPENCODE_PASS (required)
  OPENCODE_BASE_URL (optional, defaults to http://100.80.45.13:4096)
EOF
  exit 1
}

has_packet=0
for arg in "$@"; do
  if [[ "$arg" == "--packet" ]]; then
    has_packet=1
    break
  fi
done

if [[ $has_packet -eq 0 ]]; then
  usage
fi

if [[ -z "${OPENCODE_USER:-}" ]]; then
  echo "error: Missing required environment variable: OPENCODE_USER" >&2
  exit 1
fi

if [[ -z "${OPENCODE_PASS:-}" ]]; then
  echo "error: Missing required environment variable: OPENCODE_PASS" >&2
  exit 1
fi

echo "--- Running packet ---" >&2
node "$PROJECT_ROOT/scripts/opencode/run-packet.mjs" "$@"
run_exit=$?

if [[ $run_exit -ne 0 ]]; then
  echo "error: run-packet failed with exit code $run_exit" >&2
  exit $run_exit
fi

echo "" >&2
echo "--- Parsing result ---" >&2
route_outcome="$(php "$PROJECT_ROOT/scripts/opencode/parse-result.php" 2>&1)"
parse_exit=$?

if [[ $parse_exit -ne 0 ]]; then
  echo "$route_outcome" >&2
  exit $parse_exit
fi

echo "" >&2
echo "--- Route outcome ---"
echo "$route_outcome"

if [[ "$route_outcome" == "success" ]]; then
  exit 0
fi

exit 1
