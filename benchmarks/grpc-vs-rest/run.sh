#!/usr/bin/env bash
# Runs the full grpc-vs-rest benchmark matrix and writes
# benchmarks/grpc-vs-rest/results.json.
#
# Matrix: client concurrency {10, 25, 50} x mode {single, list} x target {grpc, rest},
# 30 requests per client goroutine — 12 runs total. "single" fetches one User record per request;
# "list" fetches 100. Both targets share one server process and one deterministic data generator
# (internal/gen), so the only variable between grpc and rest runs is the protocol.
#
# Usage: ./run.sh   (from this directory; requires Docker + Docker Compose)
set -euo pipefail
cd "$(dirname "$0")"

echo "== building harness image =="
docker compose build server

echo "== starting server =="
docker compose up -d server
timeout=60
until docker compose exec server wget -q -O - http://localhost:8080/users/1 > /dev/null 2>&1; do
  timeout=$((timeout - 2))
  if [ "$timeout" -le 0 ]; then
    echo "server did not become healthy in time" >&2
    docker compose logs server
    exit 1
  fi
  sleep 2
done

RESULTS_FILE="results.json"
echo "[]" > "$RESULTS_FILE"

declare -a CLIENT_COUNTS=(10 25 50)
declare -a MODES=("single" "list")

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
    echo "== grpc :: mode=$mode clients=$clients =="
    grpc_out=$(docker compose run --rm client -target grpc -mode "$mode" -host server -clients "$clients" -requests 30 -count 100)
    echo "$grpc_out"
    append_result "$grpc_out"

    echo ""
    echo "== rest :: mode=$mode clients=$clients =="
    rest_out=$(docker compose run --rm client -target rest -mode "$mode" -host server -clients "$clients" -requests 30 -count 100)
    echo "$rest_out"
    append_result "$rest_out"
  done
done

echo ""
echo "== done — results written to $RESULTS_FILE =="
docker compose down -v
