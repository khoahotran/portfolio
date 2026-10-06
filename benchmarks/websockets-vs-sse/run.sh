#!/usr/bin/env bash
# Runs the full websockets-vs-sse benchmark matrix and writes
# benchmarks/websockets-vs-sse/results.json.
#
# Matrix matches the lab's UI (src/pages/experiments/WebSocketsVsSsePage.tsx): connection counts
# {100, 1000, 5000} x transports {ws, sse} — 6 runs total. The server is restarted fresh before
# each run (not just each transport) because peak RSS (VmHWM) is monotonic non-decreasing over a
# process's lifetime — reusing one server process across connection counts would have every run
# after the first report the *previous* run's peak, not its own.
#
# Usage: ./run.sh   (from this directory; requires Docker + Docker Compose)
set -euo pipefail
cd "$(dirname "$0")"

echo "== building harness image =="
docker compose build server client

RESULTS_FILE="results.json"
echo "[]" > "$RESULTS_FILE"

append_result() {
  local json="$1"
  python3 - "$RESULTS_FILE" "$json" <<'PYEOF'
import json, sys
path, new_line = sys.argv[1], sys.argv[2]
with open(path) as f:
    data = json.load(f)
data.append(json.loads(new_line))
with open(path, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PYEOF
}

for mode in ws sse; do
  for conns in 100 1000 5000; do
    echo ""
    echo "== $mode :: connections=$conns =="

    docker compose rm -f -s server >/dev/null 2>&1 || true
    docker compose up -d server

    out=$(docker compose run --rm client -role=client -mode="$mode" -conns="$conns" -host=server:8090 -holdSeconds=3)
    echo "$out"
    append_result "$out"

    docker compose rm -f -s server >/dev/null 2>&1 || true
  done
done

echo ""
echo "== done — results written to $RESULTS_FILE =="
docker compose down -v 2>/dev/null || true
