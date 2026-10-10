#!/usr/bin/env bash
# Serves the static site locally on http://localhost:8080 (no build step).
cd "$(dirname "$0")/.."
exec python3 -m http.server "${PORT:-8080}" --bind 127.0.0.1
