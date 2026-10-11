#!/bin/bash
# PostToolUse hook: lint JS/TS files after Claude edits them.
# Exit 2 feeds ESLint errors back to Claude so it can fix them.

file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
  *.js|*.mjs|*.ts|*.tsx) ;;
  *) exit 0 ;;
esac

cd "$CLAUDE_PROJECT_DIR" || exit 0
[ -x node_modules/.bin/eslint ] || exit 0

if ! out=$(node_modules/.bin/eslint --no-warn-ignored "$file" 2>&1); then
  echo "$out" >&2
  exit 2
fi
