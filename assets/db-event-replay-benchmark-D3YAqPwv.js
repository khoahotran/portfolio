const e=`---
title: "Benchmark: Event Replay in PostgreSQL vs Firestore"
date: "2026-06-27"
tags: ["benchmark", "event-sourcing", "postgresql", "firestore", "database"]
summary: "An interactive benchmark comparing the time it takes to replay tens of thousands of immutable events into a Read Projection."
reading_time: "5 min"
---

In an Event Sourced architecture, the current state of an entity (like an Account Balance) is not stored directly. Instead, it is computed on the fly by querying an append-only Event Store and folding all historical events (e.g., \`MoneyDeposited\`, \`MoneyWithdrawn\`) in sequence.

If an account has a long history, replaying events can become a performance bottleneck. The choice of underlying database for your Event Store heavily dictates your maximum replay speed.

### Methodology

- **Task:** Query N events for a single Aggregate ID and sequentially fold them in memory to compute a final state.
- **PostgreSQL:** Events stored in a single \`events\` table with a B-Tree index on \`(aggregate_id, version)\`. Queried using a standard \`SELECT * FROM events WHERE aggregate_id = ? ORDER BY version ASC\`.
- **Firestore:** Events stored as documents in an \`/aggregates/{id}/events/\` subcollection. Queried using the standard Firebase Admin SDK.
- **Environment:** Both databases were populated with 100,000 mock events. The Go application ran on GCP, geographically close to both databases.

### Key Observations

Firestore is an incredible database for rapid prototyping and real-time syncing, but it is fundamentally a Document Database optimized for single-document lookups. Retrieving 50,000 distinct documents incurs massive network overhead and JSON deserialization penalties.

PostgreSQL, being a relational database with tight binary wire protocols, excels at sequential range scans. It can stream thousands of rows into memory in a fraction of the time it takes Firestore. 

If you are building an Event Sourced system and expect long-lived aggregates, a relational database (or a dedicated engine like EventStoreDB) is strictly superior to a Document DB.

<a href="/experiments/db-event-replay-benchmark" class="not-prose inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 hover:shadow-md transition-all mt-4 mb-8">
  View Interactive Benchmark
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
</a>
`;export{e as default};
