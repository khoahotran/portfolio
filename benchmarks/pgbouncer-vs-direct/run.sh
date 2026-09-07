#!/usr/bin/env bash
# Runs the full pgbouncer-vs-direct benchmark matrix and writes
# benchmarks/pgbouncer-vs-direct/results.json.
#
# Matrix: client concurrency {10, 25, 50} x mode {churn, persistent} x target {direct, pgbouncer},
# 30 queries per client goroutine — 12 runs total. Concurrency is capped at 50 (not pushed toward
# Postgres's own max_connections=100 default) so a direct-target run never risks a connection
# refusal that would silently turn into a missing data point instead of a comparable number.
#
# Usage: ./run.sh   (from this directory; requires Docker + Docker Compose)
set -euo pipefail
cd "$(dirname "$0")"

echo "== starting postgres + pgbouncer =="
docker compose up -d postgres pgbouncer
docker compose exec postgres pg_isready -U postgres > /dev/null

echo "== building harness image =="
docker compose build go-harness

RESULTS_FILE="results.json"
echo "[]" > "$RESULTS_FILE"

declare -a CLIENT_COUNTS=(10 25 50)
declare -a MODES=("churn" "persistent")

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

for mode in "${MODES[@]}"; do
  for clients in "${CLIENT_COUNTS[@]}"; do
    echo ""
    echo "== direct :: mode=$mode clients=$clients =="
    direct_out=$(docker compose run --rm go-harness -target direct -host postgres -port 5432 -mode "$mode" -clients "$clients" -queries 30)
    echo "$direct_out"
    append_result "$direct_out"

    echo ""
    echo "== pgbouncer :: mode=$mode clients=$clients =="
    pgb_out=$(docker compose run --rm go-harness -target pgbouncer -host pgbouncer -port 6432 -mode "$mode" -clients "$clients" -queries 30)
    echo "$pgb_out"
    append_result "$pgb_out"
  done
done

echo ""
echo "== done — results written to $RESULTS_FILE =="
docker compose down -v
