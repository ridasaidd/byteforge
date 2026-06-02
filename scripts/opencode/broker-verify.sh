#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

PACKET_DIR="$PROJECT_ROOT/DEVELOPMENT_DOCS/execution/broker-validation"
LOCAL_GIT_PACKET="$PACKET_DIR/packet-broker-local-git.yaml"
CLARIFY_PACKET="$PACKET_DIR/packet-broker-clarify.yaml"
SUCCESS_PACKET="$PACKET_DIR/packet-broker-success.yaml"

FULL=0
MODE="v1"
RUN_AUTO_LAST_EXIT=0

# Keep validation runs resilient to leftover packet locks from prior sessions.
export OPENCODE_RUN_AUTO_LOCK_STALE_MS="${OPENCODE_RUN_AUTO_LOCK_STALE_MS:-30000}"

usage() {
  cat >&2 <<'EOF'
Usage: bash scripts/opencode/broker-verify.sh [--full] [--mode v1|auto|v2]

Default run (quick):
  - opencode health
  - sqlite state init + verify
  - dispatch route checks (local_git + docs)
  - clarify gate short-circuit check (no executor run)
  - local_git run-auto short-circuit check (no executor run)

--full adds one low-cost executor success-path run using:
  DEVELOPMENT_DOCS/execution/broker-validation/packet-broker-success.yaml
EOF
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --full)
      FULL=1
      shift
      ;;
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "error: unknown arg: $1" >&2
      usage
      ;;
  esac
done

for required in "$LOCAL_GIT_PACKET" "$CLARIFY_PACKET" "$SUCCESS_PACKET"; do
  [[ -f "$required" ]] || { echo "error: missing packet: $required" >&2; exit 1; }
done

json_field() {
  local key="$1"
  php -r '$j=json_decode(stream_get_contents(STDIN),true); $k=$argv[1]; $v=$j[$k] ?? null; if (is_bool($v)) { echo $v ? "1" : "0"; } elseif (is_scalar($v)) { echo (string) $v; }' "$key"
}

run_auto_with_lock_retry() {
  local packet_path="$1"
  local mode="$2"
  local output_path="${3:-/tmp/opencode-run-auto.out}"
  local expected_exit="${4:-0}"
  local max_attempts=4
  local attempt=1

  while (( attempt <= max_attempts )); do
    if (
      cd "$PROJECT_ROOT"
      npm run -s opencode:run-auto -- --packet "$packet_path" --mode "$mode" >"$output_path"
    ); then
      run_exit=0
    else
      run_exit=$?
    fi

    RUN_AUTO_LAST_EXIT="$run_exit"

    if [[ "$run_exit" -eq "$expected_exit" ]]; then
      return 0
    fi

    if [[ "$run_exit" -eq 2 && "$expected_exit" -ne 2 && "$attempt" -lt "$max_attempts" ]]; then
      echo "run-auto lock busy for $(basename "$packet_path") (attempt $attempt/$max_attempts); retrying..."
      sleep 2
      ((attempt++))
      continue
    fi

    cat "$output_path" >&2 || true
    return 1
  done

  return 1
}

echo "[1/8] OpenCode health check"
(
  cd "$PROJECT_ROOT"
  npm run -s opencode:health
)

echo "[2/8] SQLite state initialization + acceptance verification"
(
  cd "$PROJECT_ROOT"
  npm run -s opencode:state:init >/dev/null
  npm run -s opencode:state:verify -- --packet "$SUCCESS_PACKET"
)

echo "[3/8] Dispatch check: local_git packet"
local_dispatch_json="$(cd "$PROJECT_ROOT" && npm run -s opencode:dispatch -- --packet "$LOCAL_GIT_PACKET")"
local_route="$(printf '%s' "$local_dispatch_json" | json_field route)"
[[ "$local_route" == "local_git" ]] || {
  echo "error: expected local_git route, got: $local_route" >&2
  exit 1
}

echo "[4/8] Dispatch check: success packet should route to executor"
success_dispatch_json="$(cd "$PROJECT_ROOT" && npm run -s opencode:dispatch -- --packet "$SUCCESS_PACKET")"
success_route="$(printf '%s' "$success_dispatch_json" | json_field route)"
[[ "$success_route" == "executor" ]] || {
  echo "error: expected executor route, got: $success_route" >&2
  exit 1
}

echo "[5/8] Gate 0 clarify short-circuit check"
expected_clarify_exit="${OPENCODE_CLARIFY_EXIT_CODE:-2}"
run_auto_with_lock_retry "$CLARIFY_PACKET" "$MODE" "/tmp/opencode-clarify-check.out" "$expected_clarify_exit"
clarify_exit="$RUN_AUTO_LAST_EXIT"
if [[ "$clarify_exit" != "$expected_clarify_exit" ]]; then
  echo "error: clarify packet exit mismatch; expected $expected_clarify_exit got $clarify_exit" >&2
  cat /tmp/opencode-clarify-check.out >&2 || true
  exit 1
fi

echo "[6/8] local_git run-auto short-circuit check"
run_auto_with_lock_retry "$LOCAL_GIT_PACKET" "$MODE" "/tmp/opencode-local-git-check.out"

echo "[7/8] Compact context smoke for local_git and clarify packets"
(
  cd "$PROJECT_ROOT"
  npm run -s opencode:state:context -- --packet-id EP-BROKER-LOCAL-GIT --limit 2 >/dev/null
  npm run -s opencode:state:context -- --packet-id EP-BROKER-CLARIFY --limit 2 >/dev/null
)

if [[ "$FULL" -eq 1 ]]; then
  echo "[8/8] Full mode: low-cost executor-path run"
  run_auto_with_lock_retry "$SUCCESS_PACKET" "$MODE" "/tmp/opencode-success-check.out"
  (
    cd "$PROJECT_ROOT"
    npm run -s opencode:state:context -- --packet-id EP-BROKER-SUCCESS --limit 2
  )
else
  echo "[8/8] Quick mode complete (no executor token call performed)"
  echo "tip: rerun with --full to validate one end-to-end executor success path"
fi

echo "broker verify passed"
