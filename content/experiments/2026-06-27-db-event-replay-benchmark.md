---
title: "Benchmark: Event Replay in PostgreSQL vs Firestore"
date: "2026-06-27"
tags: ["benchmark", "event-sourcing", "postgresql", "firestore", "system-design"]
related: ["research/adr-firestore-vs-postgresql-event-sourcing", "projects/core-banking"]
series: "The Benchmark Rewrites"
seriesOrder: 2
summary: "An interactive benchmark comparing the time it takes to replay tens of thousands of immutable events into a Read Projection."
---

In an Event Sourced architecture, the current state of an entity (like an Account Balance) is not stored directly. Instead, it is computed on the fly by querying an append-only Event Store and folding all historical events (e.g., `MoneyDeposited`, `MoneyWithdrawn`) in sequence.

If an account has a long history, replaying events can become a performance bottleneck. The choice of underlying database for your Event Store heavily dictates your maximum replay speed.

### Methodology

- **Task:** Query N events for a single Aggregate ID and sequentially fold them in memory to compute a final state.
- **PostgreSQL:** Events stored in a single `events` table with a B-Tree index on `(aggregate_id, version)`. Queried using `SELECT event_type, amount FROM events WHERE aggregate_id = ? ORDER BY version ASC`, streamed and folded row by row.
- **Firestore:** Events stored as documents in an `/aggregates/{id}/events/` subcollection. Queried with the Go Firestore client's `OrderBy("version", Asc).Documents(ctx)`, iterated and folded the same way.
- **Environment:** PostgreSQL 16 and the official Firestore emulator, both on the same Docker Compose network as the Go harness. Not a real Cloud Firestore instance — see the caveat below for why that matters less than it sounds.

> [!NOTE]
> **What this comparison is and isn't.** The harness is real and committed:
> [`benchmarks/db-event-replay-benchmark/`](https://github.com/khoahotran/portfolio/tree/main/benchmarks/db-event-replay-benchmark)
> in the portfolio repository — a Docker Compose stack (PostgreSQL + the official Firestore
> emulator) plus a `run.sh` that reproduces every number below. It's still lopsided by design — one
> indexed range scan against N individual document reads — which is exactly the architectural point,
> not a like-for-like database benchmark. Firestore is not slow at what it's designed for; it's
> being asked to do the one thing a document store is worst at. And it's the emulator, not
> production Firestore — the *relative* shape of the result (Firestore's cost scaling with document
> count, Postgres's not) is what a document store vs. a range scan actually looks like; the
> *absolute* milliseconds are "measured against the emulator," not a production SLA.

### Key Observations

Firestore is an incredible database for rapid prototyping and real-time syncing, but it is fundamentally a Document Database optimized for single-document lookups. Retrieving tens of thousands of distinct documents incurs a real per-document read cost that a single range query doesn't pay.

PostgreSQL, being a relational database with tight binary wire protocols, excels at sequential range scans. It can stream thousands of rows into memory in a fraction of the time it takes Firestore.

| Events | PostgreSQL | Firestore (emulator) | Ratio |
| ---: | ---: | ---: | ---: |
| 10,000 | 26.6 ms | 800.9 ms | 30.1x |
| 50,000 | 103.9 ms | 2,033.3 ms | 19.6x |
| 100,000 | 142.2 ms | 4,148.5 ms | 29.2x |

An earlier version of this article, whose harness no longer exists, put the gap around 7-8x at
every event count. The real, measured gap is 3-4x larger, and it doesn't stay flat — Firestore's
cost grows with the number of documents read in a way Postgres's single indexed scan simply
doesn't, because Postgres pays a per-query cost and Firestore pays a per-document one.

If you are building an Event Sourced system and expect long-lived aggregates, a relational database (or a dedicated engine like EventStoreDB) is strictly superior to a Document DB.

<a href="/labs/db-event-replay-benchmark" class="lab-cta">
  View Interactive Benchmark
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
</a>
