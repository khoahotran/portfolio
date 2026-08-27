#!/usr/bin/env bash
# Runs the full db-event-replay-benchmark matrix and writes
# benchmarks/db-event-replay-benchmark/results.json.
#
# Matrix matches the lab's UI exactly (src/pages/experiments/DbEventReplayBenchmarkPage.tsx):
# event counts {10000, 50000, 100000} x databases {postgres, firestore} — 6 runs total. Each
# database is seeded fresh for the aggregate before its fetch-and-fold phase is timed; seeding
# itself is not part of the measured number.
#
# Usage: ./run.sh   (from this directory; requires Docker + Docker Compose)
set -euo pipefail
cd "$(dirname "$0")"

echo "== starting postgres + firestore emulator =="
docker compose up -d postgres firestore
docker compose ps

echo "== building harness image =="
docker compose build go-harness

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

for events in 10000 50000 100000; do
  for db in postgres firestore; do
    echo ""
    echo "== $db :: events=$events (seeding) =="
    docker compose run --rm go-harness -mode=seed -db="$db" -events="$events"

    echo "== $db :: events=$events (measuring) =="
    out=$(docker compose run --rm go-harness -mode=measure -db="$db" -events="$events")
    echo "$out"
    append_result "$out"
  done
done

echo ""
echo "== done — results written to $RESULTS_FILE =="
docker compose down -v
