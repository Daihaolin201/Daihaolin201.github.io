#!/bin/sh
# Fresh local server for tests-e2e: builds nothing, serves ./dist with the Worker and empty storage.
# Usage: tests-e2e/dev.sh [port]   (needs tests-e2e/.dev.vars, see README)
cd "$(dirname "$0")/.." || exit 1
PORT="${1:-8787}"
STATE="${TMPDIR:-/tmp}/dl-site-e2e-state"
rm -rf "$STATE"
exec env WRANGLER_SEND_METRICS=false node_modules/.bin/wrangler dev -c tests-e2e/wrangler.dev.jsonc --local --ip 127.0.0.1 --port "$PORT" --persist-to "$STATE"
