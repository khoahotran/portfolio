const e=`---
title: "ADR: Firestore vs PostgreSQL for Event Sourcing in Core Banking"
date: "2026-06-28"
tags: ["adr", "event-sourcing", "firestore", "postgresql", "architecture"]
summary: "An Architecture Decision Record detailing why Firestore was chosen over PostgreSQL as the primary EventStore for the Event-Driven Core Banking platform."
reading_time: "6 min"
---

## Context and Problem Statement

When building the Event-Driven Core Banking system in Go, the core architectural pattern chosen was **Event Sourcing**. In this pattern, state is not stored as mutable rows (e.g., \`UPDATE accounts SET balance = balance - 100\`). Instead, state is derived from an append-only log of immutable events (e.g., \`INSERT INTO events (type, payload) VALUES ('AccountDebited', '100')\`).

The system requires an **EventStore** to persist these events. The EventStore has three absolute requirements:
1. **Append-Only:** Events cannot be modified or deleted.
2. **Optimistic Concurrency Control (OCC):** To prevent race conditions, the store must support versioning (e.g., rejecting an append if the aggregate version has advanced).
3. **Change Data Capture (CDC) / Event Streaming:** We need a way to notify Saga Orchestrators, Projection Workers, and Fraud Engines the millisecond a new event is appended.

The two candidates evaluated were **PostgreSQL** and **Google Cloud Firestore**.

## Considered Options

### Option 1: PostgreSQL

A traditional relational database. The EventStore would be a single, massive \`events\` table.

**Pros:**
- Complete control over constraints and indexing.
- Familiarity and ubiquity.
- OCC is trivial using \`UNIQUE (aggregate_id, version)\`.

**Cons:**
- **CDC Complexity:** To get real-time event streaming, we would need to run Debezium hooked into the Postgres WAL (Write-Ahead Log), publishing to Kafka. This introduces three massive pieces of infrastructure (Postgres, Debezium, Kafka) just to stream events.
- **Horizontal Scaling:** While append-heavy workloads are fine, managing a massive, ever-growing single \`events\` table requires partitioning strategies and operational overhead.

### Option 2: Google Cloud Firestore

A fully managed NoSQL document database. Each event is a document in an \`events\` collection.

**Pros:**
- **Native Real-Time Streaming:** Firestore's \`SnapshotListeners\` (or Cloud Functions/Eventarc) provide native, out-of-the-box change data capture. Workers can subscribe to the \`events\` collection and instantly receive pushes when new documents are appended. No Debezium or Kafka required.
- **Serverless & Managed:** Zero infrastructure to manage. It scales horizontally automatically.
- **Transactions:** Supports multi-document ACID transactions, enabling OCC.

**Cons:**
- **No Unique Constraints:** Firestore does not have a native \`UNIQUE(aggregate_id, version)\` constraint. We have to implement OCC manually using Firestore Transactions.
- **Write Limits:** Firestore has a soft limit of 1 write per second per document. (This is a non-issue since we append *new* documents, not update the same document).

## Decision Outcome

**Decision:** We chose **Option 2: Google Cloud Firestore**.

### Rationale

The deciding factor was **Change Data Capture (CDC) simplicity**. 

In an Event-Driven Architecture, appending the event is only 50% of the job. The other 50% is instantly reacting to that event to update read projections, trigger Sagas, or run fraud analysis.

With PostgreSQL, achieving reliable, sub-second CDC requires deploying Debezium and Kafka. For a solo engineer or a small team prototyping a core banking system, the operational burden of maintaining Zookeeper, Kafka brokers, and Kafka Connect (Debezium) is disproportionately high.

Firestore provides this CDC mechanism natively via its SDK \`Watch\` API or Cloud Functions. By choosing Firestore, we eliminated the need for a message broker entirely, simplifying the architecture dramatically while maintaining real-time event distribution.

### Mitigating the Lack of Unique Constraints

To satisfy the OCC requirement without unique constraints, we implemented a Firestore Transaction for every append operation:

\`\`\`go
// Simplified Go OCC implementation for Firestore
err := client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
    // 1. Read current aggregate metadata to get current version
    doc, err := tx.Get(aggregateRef)
    currentVersion := doc.Data()["version"].(int)
    
    // 2. Check if the version we expect matches the actual version
    if expectedVersion != currentVersion {
        return ErrConcurrencyConflict
    }
    
    // 3. Append the new event document
    tx.Create(eventsRef.NewDoc(), newEventData)
    
    // 4. Update aggregate metadata with new version
    tx.Update(aggregateRef, []firestore.Update{
        {Path: "version", Value: currentVersion + 1},
    })
    
    return nil
})
\`\`\`
This guarantees that two concurrent requests attempting to append \`version 5\` to the same account will result in one succeeding and the other failing with a concurrency conflict, maintaining consistency.

## Consequences

- The architecture requires significantly less infrastructure (no Kafka, no Debezium).
- Development speed increased because event publishers and consumers just use the Firestore SDK.
- We trade standard SQL tooling for NoSQL documents, but since the EventStore is an append-only log, query complexity is naturally low (mostly \`GET /events WHERE aggregate_id = X ORDER BY version ASC\`).
`;export{e as default};
