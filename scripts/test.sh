#!/usr/bin/env bash
# Runs every tests/**/*.test.mjs (or those matching $1) under JavaScriptCore (macOS) or Node.
# Usage: scripts/test.sh [path-substring]
# Exit code is non-zero if any test fails or any module fails to load.
set -uo pipefail
cd "$(dirname "$0")/.."
JSC="${JSC:-/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc}"
FILTER="${1:-}"
ENTRY="tests/.all.$$.mjs"
trap 'rm -f "$ENTRY"' EXIT

{
  while IFS= read -r f; do
    [[ -n "$FILTER" && "$f" != *"$FILTER"* ]] && continue
    echo "import './${f#tests/}';"
  done < <(find tests -name '*.test.mjs' | LC_ALL=C sort)
  echo "import { runAll } from './harness.mjs';"
  echo "runAll();"
} > "$ENTRY"

if [[ -x "$JSC" ]]; then
  OUT="$("$JSC" -m "$ENTRY" 2>&1)"; CODE=$?
elif command -v node >/dev/null 2>&1; then
  OUT="$(node "$ENTRY" 2>&1)"; CODE=$?
else
  echo "No JavaScript runtime found (need macOS jsc or node)" >&2; exit 2
fi
echo "$OUT"
if [[ $CODE -ne 0 ]]; then echo "TEST RUN FAILED (exit $CODE)"; exit 1; fi
if ! echo "$OUT" | grep -q '^RESULT: PASS'; then echo "TEST RUN FAILED (no PASS marker)"; exit 1; fi
exit 0
