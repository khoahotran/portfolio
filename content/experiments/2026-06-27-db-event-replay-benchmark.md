---
title: "Benchmark: Event Replay in PostgreSQL vs Firestore"
date: "2026-06-27"
tags: ["benchmark", "event-sourcing", "postgresql", "firestore", "database"]
related: ["research/adr-firestore-vs-postgresql-event-sourcing", "projects/core-banking"]
summary: "An interactive benchmark comparing the time it takes to replay tens of thousands of immutable events into a Read Projection."
---

In an Event Sourced architecture, the current state of an entity (like an Account Balance) is not stored directly. Instead, it is computed on the fly by querying an append-only Event Store and folding all historical events (e.g., `MoneyDeposited`, `MoneyWithdrawn`) in sequence.

If an account has a long history, replaying events can become a performance bottleneck. The choice of underlying database for your Event Store heavily dictates your maximum replay speed.

### Methodology

- **Task:** Query N events for a single Aggregate ID and sequentially fold them in memory to compute a final state.
- **PostgreSQL:** Events stored in a single `events` table with a B-Tree index on `(aggregate_id, version)`. Queried using a standard `SELECT * FROM events WHERE aggregate_id = ? ORDER BY version ASC`.
- **Firestore:** Events stored as documents in an `/aggregates/{id}/events/` subcollection. Queried using the standard Firebase Admin SDK.
- **Environment:** Both databases were populated with 100,000 mock events. The Go application ran on GCP, geographically close to both databases.

> [!NOTE]
> **What this comparison is and isn't.** The harness is not published in this repository, so this
> run isn't currently reproducible. The comparison is also lopsided on purpose — one sequential
> range scan against 100,000 individual document reads — which is exactly the architectural point,
> but it is not a like-for-like database benchmark. Firestore is not slow at what it is designed
> for; it is being asked to do the one thing a document store is worst at.

### Key Observations

Firestore is an incredible database for rapid prototyping and real-time syncing, but it is fundamentally a Document Database optimized for single-document lookups. Retrieving 50,000 distinct documents incurs massive network overhead and JSON deserialization penalties.

PostgreSQL, being a relational database with tight binary wire protocols, excels at sequential range scans. It can stream thousands of rows into memory in a fraction of the time it takes Firestore. 

If you are building an Event Sourced system and expect long-lived aggregates, a relational database (or a dedicated engine like EventStoreDB) is strictly superior to a Document DB.

<a href="/labs/db-event-replay-benchmark" class="lab-cta">
  View Interactive Benchmark
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
</a>
