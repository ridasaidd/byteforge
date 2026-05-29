#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
Usage: bash scripts/opencode/git-finalize.sh --message <commit message> (--all | --files <csv>) [--push]

Options:
  --message <text>   commit message (required)
  --all              stage all changes
  --files <csv>      stage only comma-separated files
  --push             push current branch after commit
EOF
  exit 1
}

commit_message=""
stage_all=0
push_after=0
files_csv=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --message)
      shift
      commit_message="${1:-}"
      ;;
    --all)
      stage_all=1
      ;;
    --files)
      shift
      files_csv="${1:-}"
      ;;
    --push)
      push_after=1
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      ;;
  esac
  shift || true
done

if [[ -z "$commit_message" ]]; then
  echo "--message is required" >&2
  usage
fi

if [[ $stage_all -eq 0 && -z "$files_csv" ]]; then
  echo "Use --all or --files" >&2
  usage
fi

if [[ $stage_all -eq 1 && -n "$files_csv" ]]; then
  echo "Use either --all or --files, not both" >&2
  usage
fi

if [[ $stage_all -eq 1 ]]; then
  git add -A
else
  IFS=',' read -r -a files <<< "$files_csv"
  if [[ ${#files[@]} -eq 0 ]]; then
    echo "--files must not be empty" >&2
    exit 1
  fi
  git add -- "${files[@]}"
fi

if [[ -z "$(git diff --cached --name-only)" ]]; then
  echo "No staged changes to commit" >&2
  exit 1
fi

git commit -m "$commit_message"

if [[ $push_after -eq 1 ]]; then
  git push
fi

printf 'Git finalize complete\n'
