#!/usr/bin/env bash
# Runs the full redis-vs-bullmq benchmark matrix and writes benchmarks/redis-vs-bullmq/results.json.
#
# Matrix matches the lab's UI exactly (src/pages/experiments/RedisVsBullMQPage.tsx): payload sizes
# {1KB, 10KB, 100KB} x workers {1, 5}, for both engines — 12 runs total. Job count per payload size
# is fixed per size (not per run) so throughput comparisons within a payload size are apples-to-apples;
# it's lower for 100KB purely to keep total runtime reasonable, not to favor either engine.
#
# Usage: ./run.sh   (from this directory; requires Docker + Docker Compose)
set -euo pipefail
cd "$(dirname "$0")"

echo "== starting redis =="
docker compose up -d redis
docker compose exec redis redis-cli ping > /dev/null

echo "== building harness images =="
docker compose build go-harness node-harness

RESULTS_FILE="results.json"
echo "[]" > "$RESULTS_FILE"

declare -a PAYLOADS=("1024:1KB:3000" "10240:10KB:3000" "102400:100KB:1000")
declare -a WORKER_COUNTS=(1 5)

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

for entry in "${PAYLOADS[@]}"; do
  IFS=':' read -r bytes label jobs <<< "$entry"
  for workers in "${WORKER_COUNTS[@]}"; do
    echo ""
    echo "== redis-streams :: payload=$label workers=$workers jobs=$jobs =="
    go_out=$(docker compose run --rm go-harness -redis-addr redis:6379 -payload "$bytes" -workers "$workers" -jobs "$jobs")
    echo "$go_out"
    labeled=$(echo "$go_out" | python3 -c "import json,sys; d=json.load(sys.stdin); d['payloadLabel']='$label'; print(json.dumps(d))")
    append_result "$labeled"

    echo ""
    echo "== bullmq :: payload=$label workers=$workers jobs=$jobs =="
    node_out=$(docker compose run --rm node-harness --redis-host redis --redis-port 6379 --payload "$bytes" --workers "$workers" --jobs "$jobs")
    echo "$node_out"
    labeled=$(echo "$node_out" | python3 -c "import json,sys; d=json.load(sys.stdin); d['payloadLabel']='$label'; print(json.dumps(d))")
    append_result "$labeled"
  done
done

echo ""
echo "== done — results written to $RESULTS_FILE =="
docker compose down -v
