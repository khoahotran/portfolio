#!/usr/bin/env bash
# Runs the full go-vs-ts-concurrency benchmark matrix and writes
# benchmarks/go-vs-ts-concurrency/results.json.
#
# Matrix matches the lab's UI exactly (src/pages/experiments/GoVsTsConcurrencyPage.tsx): task counts
# {1000, 10000, 50000} for both languages — 6 runs total.
#
# Usage: ./run.sh   (from this directory; requires Docker + Docker Compose)
set -euo pipefail
cd "$(dirname "$0")"

echo "== building harness images =="
docker compose build go-harness node-harness

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

for tasks in 1000 10000 50000; do
  echo ""
  echo "== go :: tasks=$tasks =="
  go_out=$(docker compose run --rm go-harness -tasks "$tasks")
  echo "$go_out"
  append_result "$go_out"

  echo ""
  echo "== node :: tasks=$tasks =="
  node_out=$(docker compose run --rm node-harness --tasks "$tasks")
  echo "$node_out"
  append_result "$node_out"
done

echo ""
echo "== done — results written to $RESULTS_FILE =="
