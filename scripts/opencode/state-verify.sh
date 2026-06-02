#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STATE_PHP="$PROJECT_ROOT/scripts/opencode/state.php"
RUNS_DIR="$PROJECT_ROOT/storage/opencode-runs"
LATEST_PTR="$RUNS_DIR/.latest"

usage() {
  cat >&2 <<'EOF'
Usage: bash scripts/opencode/state-verify.sh --packet <file> [--packet-id <id>] [--limit <n>]

Runs SQLite state acceptance checks:
  1) init command
  2) ingest-packet command
  3) context command
  4) stale-success protection simulation for ingest-latest --packet-id
EOF
  exit 1
}

packet_path=""
packet_id=""
limit="3"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --packet)
      packet_path="${2:-}"
      shift 2
      ;;
    --packet-id)
      packet_id="${2:-}"
      shift 2
      ;;
    --limit)
      limit="${2:-}"
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

if [[ -z "$packet_path" ]]; then
  usage
fi

if [[ "$packet_path" != /* ]]; then
  packet_path="$PROJECT_ROOT/$packet_path"
fi

if [[ ! -f "$packet_path" ]]; then
  echo "error: packet not found: $packet_path" >&2
  exit 1
fi

if [[ -z "$packet_id" ]]; then
  packet_id="$(sed -n 's/^\s*packet_id:\s*//p' "$packet_path" | head -n 1 | tr -d '"' | tr -d "'" | xargs)"
fi

if [[ -z "$packet_id" ]]; then
  echo "error: unable to determine packet id; pass --packet-id" >&2
  exit 1
fi

echo "[1/5] state:init"
php "$STATE_PHP" init >/dev/null

echo "[2/5] state:ingest-packet"
php "$STATE_PHP" ingest-packet --packet "$packet_path" >/dev/null

echo "[3/5] state:context"
php "$STATE_PHP" context --packet-id "$packet_id" --limit "$limit" >/dev/null

echo "[4/5] stale-success protection"
mkdir -p "$RUNS_DIR"
orig_ptr=""
if [[ -f "$LATEST_PTR" ]]; then
  orig_ptr="$(cat "$LATEST_PTR")"
fi

suffix="$(date +%s)-$$"
sim_packet_id="VERIFY-AC2-$suffix"
fail_file="$RUNS_DIR/2099-01-01T00-00-00+00-00-$sim_packet_id-fail.json"
ok_file="$RUNS_DIR/2099-01-01T00-00-01+00-00-$sim_packet_id-success.json"

cleanup() {
  rm -f "$fail_file" "$ok_file"
  if [[ -n "$orig_ptr" ]]; then
    printf "%s\n" "$orig_ptr" > "$LATEST_PTR"
  else
    rm -f "$LATEST_PTR"
  fi
}
trap cleanup EXIT

cat > "$fail_file" <<JSON
{
  "ok": false,
  "sessionID": null,
  "transport": "v1",
  "packetID": "$sim_packet_id",
  "assistantText": "schema_version: 1\nstatus: failed\nfailure_type: environment_blocker\ntask_ref:\n  packet_id: $sim_packet_id\n  phase: PHASE19\n  attempt: 1\n  executor_model: deepseek-v4-flash"
}
JSON

cat > "$ok_file" <<JSON
{
  "ok": true,
  "sessionID": "ses_demo",
  "transport": "v1",
  "packetID": "$sim_packet_id",
  "assistantText": "schema_version: 1\nstatus: success\ntask_ref:\n  packet_id: $sim_packet_id\n  phase: PHASE19\n  attempt: 2\n  executor_model: deepseek-v4-flash"
}
JSON

printf "%s\n" "$ok_file" > "$LATEST_PTR"
result_json="$(php "$STATE_PHP" ingest-latest --packet-id "$sim_packet_id")"

status_value="$(printf "%s" "$result_json" | php -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["status"] ?? "";')"
artifact_value="$(printf "%s" "$result_json" | php -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["artifact_path"] ?? "";')"

if [[ "$status_value" != "failed:environment_blocker" ]]; then
  echo "error: AC-2 failed; expected failed:environment_blocker, got: $status_value" >&2
  exit 1
fi

if [[ "$artifact_value" != "$fail_file" ]]; then
  echo "error: AC-2 failed; expected artifact $fail_file, got: $artifact_value" >&2
  exit 1
fi

echo "[5/5] record-failure artifact metadata preservation"
rec_packet_id="VERIFY-AC2-META-$suffix"
meta_json="$(php "$STATE_PHP" record-failure --packet-id "$rec_packet_id" --attempt 1 --model deepseek-v4-flash --provider opencode-go --variant cheap --failure-type environment_blocker --phase PHASE19 --task-class minor --packet-path "$packet_path" 2>&1)"

meta_artifact="$(printf "%s" "$meta_json" | php -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["artifact_path"] ?? "";')"
if [[ -z "$meta_artifact" || ! -f "$meta_artifact" ]]; then
  echo "error: AC-2 metadata test failed; no artifact created" >&2
  exit 1
fi

decoded="$(cat "$meta_artifact")"
packet_path_in_artifact="$(printf "%s" "$decoded" | php -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["packetPath"] ?? "";')"
provider_in_artifact="$(printf "%s" "$decoded" | php -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["provider"] ?? "";')"
model_in_artifact="$(printf "%s" "$decoded" | php -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["model"] ?? "";')"
variant_in_artifact="$(printf "%s" "$decoded" | php -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["variant"] ?? "";')"

if [[ "$packet_path_in_artifact" != "$packet_path" ]]; then
  echo "error: AC-2 metadata test failed; packetPath mismatch: expected $packet_path, got $packet_path_in_artifact" >&2
  exit 1
fi
if [[ "$provider_in_artifact" != "opencode-go" ]]; then
  echo "error: AC-2 metadata test failed; provider mismatch" >&2
  exit 1
fi
if [[ "$model_in_artifact" != "deepseek-v4-flash" ]]; then
  echo "error: AC-2 metadata test failed; model mismatch" >&2
  exit 1
fi
if [[ "$variant_in_artifact" != "cheap" ]]; then
  echo "error: AC-2 metadata test failed; variant mismatch" >&2
  exit 1
fi

reingest_json="$(php "$STATE_PHP" ingest-artifact --artifact "$meta_artifact" 2>&1)"
reingest_status="$(printf "%s" "$reingest_json" | php -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["status"] ?? "";')"
if [[ "$reingest_status" != "failed:environment_blocker" ]]; then
  echo "error: AC-2 metadata test failed; re-ingestion status mismatch: $reingest_status" >&2
  exit 1
fi

rm -f "$meta_artifact"

echo "state verify passed for packet_id=$packet_id"
