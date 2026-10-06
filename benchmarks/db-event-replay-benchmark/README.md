# db-event-replay-benchmark harness

Backs [`/labs/db-event-replay-benchmark`](https://khoahotran.github.io/portfolio/labs/db-event-replay-benchmark)
and the [DB Event Replay Benchmark](https://khoahotran.github.io/portfolio/experiments/db-event-replay-benchmark)
article. Written to close the same gap as `../redis-vs-bullmq/`: the lab's numbers came from a run
whose harness had been lost, so the figures couldn't be checked. This one can be.

## What it measures

The time to fetch and fold every event for a single Event-Sourced aggregate into a final
projection — PostgreSQL via one indexed range-scanned query, Firestore via reading every document in
a subcollection, which is how a document store necessarily models a growing event list.

- **PostgreSQL** — an `events` table with a composite `(aggregate_id, version)` primary key (which
  Postgres backs with a B-Tree index) and an explicit secondary index of the same shape. Measured
  query: `SELECT event_type, amount FROM events WHERE aggregate_id = $1 ORDER BY version ASC`,
  streamed and folded into a running balance as rows arrive.
- **Firestore** — events as documents under `/aggregates/{id}/events/`, matching the schema the
  article already described. Measured query: the Firestore Go client's `OrderBy("version",
  Asc).Documents(ctx)`, iterated and folded exactly the same way.

Both are seeded first (unmeasured — Postgres via `COPY`, Firestore via `BulkWriter`, each database's
own fast path for bulk writes) with the same synthetic event stream, so both fold to the identical
final balance. The harness asserts this implicitly: `eventsProcessed` and `finalBalance` are printed
for every run, and they match across databases at every event count in the committed `results.json`
— the strongest sanity check available that both paths are folding the same data.

## Reproducing it

Requires Docker and Docker Compose. Uses the official [Firestore
emulator](https://cloud.google.com/firestore/docs/emulator) (`google/cloud-sdk:emulators`) — no
GCP project or credentials needed.

```bash
cd benchmarks/db-event-replay-benchmark
./run.sh
```

Builds the harness image, seeds and measures both databases at 10,000 / 50,000 / 100,000 events, and
writes `results.json` — the exact file the interactive lab imports (a copy lives at
`src/pages/experiments/db-event-replay-benchmark-results.json`; keep the two in sync after a
re-run). Firestore seeding at 100,000 documents takes roughly 30 seconds; the rest of the matrix is
fast. Total runtime is a few minutes.

To run one combination manually:

```bash
docker compose up -d postgres firestore
docker compose build go-harness

docker compose run --rm go-harness -mode=seed    -db=postgres  -events=100000
docker compose run --rm go-harness -mode=measure -db=postgres  -events=100000
docker compose run --rm go-harness -mode=seed    -db=firestore -events=100000
docker compose run --rm go-harness -mode=measure -db=firestore -events=100000
```

## What the real numbers show — and why they don't match the old ones

An earlier version of this benchmark claimed roughly a 7-8x gap at every event count (based on a
harness that no longer exists). The real, measured gap is much larger and grows with event count:

| Events | PostgreSQL | Firestore | Ratio |
| ---: | ---: | ---: | ---: |
| 10,000 | 26.6 ms | 800.9 ms | 30.1x |
| 50,000 | 103.9 ms | 2,033.3 ms | 19.6x |
| 100,000 | 142.2 ms | 4,148.5 ms | 29.2x |

Nothing here contradicts the article's own honest framing: this is not a fair fight, and the article
says so. Postgres executes one indexed range scan and streams the result set over a single
connection. Firestore, asked to read every document in a subcollection, pays a real per-document
read cost — the SDK issues what is functionally N individual document fetches, not one range query —
so its cost scales with document count in a way Postgres's single scan does not. That's a genuine,
structural property of a document store being asked to do what a relational range scan is built for,
not a Firestore configuration problem this harness could tune away.

## Honesty about the environment

Run against the official Firestore *emulator*, not a real Cloud Firestore instance — the emulator is
Google's own tool for exactly this kind of local, reproducible testing, but its performance
characteristics (no real network latency to a Google data center, no regional replication) are not
identical to production Firestore. The *relative* shape of the result — Firestore's cost growing
with document count while Postgres's does not — is the architectural property this benchmark is
actually demonstrating, and that property holds regardless of emulator-vs-production; the *absolute*
millisecond figures should be read as "measured against the emulator on this host," not as a
production SLA.
