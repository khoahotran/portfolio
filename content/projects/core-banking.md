---
title: "Event-Driven Core Banking System"
date: "2026-06-15"
tags: ["event-sourcing", "cqrs", "saga-pattern", "golang", "firestore"]
related: ["system-design/implementing-the-saga-pattern-for-distributed-transfers", "system-design/designing-a-real-time-fraud-detection-engine", "research/adr-firestore-vs-postgresql-event-sourcing", "research/event-sourcing-vs-crud-when-to-choose-each", "experiments/event-sourcing-replay", "experiments/saga-state-machine-visualizer"]
summary: "A production-grade core banking ledger demonstrating Event Sourcing, CQRS, and distributed Saga transfers."
reading_time: "12 min"
---

## Project Foundation

**Business Problem:** Traditional banking ledgers use mutable database rows (e.g., `UPDATE accounts SET balance = balance - 100`). If a bug occurs, or an auditor asks *why* an account has a specific balance, the history is lost unless you explicitly maintain complex audit tables. Furthermore, executing cross-account transfers across different banking microservices requires distributed transactions, which can lock up databases and cause cascading failures.

**Goals:**
1. Guarantee 100% auditability for all financial movements.
2. Implement O(1) read latency for account balances.
3. Handle cross-account transfers safely without relying on 2-Phase Commit (2PC).
4. Implement real-time fraud detection without slowing down the core ledger.

## Architecture

This project strictly separates writes from reads using **CQRS** (Command Query Responsibility Segregation) and derives all state using **Event Sourcing**.

### CQRS & Event Sourcing Flow

```mermaid
C4Container
  title Event Sourcing & CQRS Architecture
  
  Container(api, "Banking API", "Go", "Handles deposits, withdrawals, transfers")
  Container(fraud, "Fraud Engine", "Go Worker", "Analyzes transaction velocity")
  Container(projector, "Read Projector", "Go Worker", "Folds events into current state")
  
  ContainerDb(event_store, "Event Store", "Firestore", "Append-only immutable log")
  ContainerDb(read_model, "Read Projection", "PostgreSQL", "O(1) account balance lookups")
  
  Rel(api, event_store, "Appends Event (e.g., MoneyDeposited)")
  Rel(projector, event_store, "Listens to new events")
  Rel(projector, read_model, "Updates calculated balance")
  Rel(api, read_model, "Queries balance (Fast O(1))")
  Rel(fraud, event_store, "Analyzes event stream for anomalies")
```

### Saga Pattern for Distributed Transfers

Transferring money between Account A and Account B requires altering two distinct aggregates. We use an Orchestration-based Saga.

```mermaid
sequenceDiagram
    participant User
    participant SagaOrchestrator
    participant AccountA
    participant AccountB

    User->>SagaOrchestrator: Transfer $100 A -> B
    SagaOrchestrator->>AccountA: Debit $100
    AccountA-->>SagaOrchestrator: Success (MoneyWithdrawn)
    SagaOrchestrator->>AccountB: Credit $100
    
    alt Credit Succeeds
        AccountB-->>SagaOrchestrator: Success (MoneyDeposited)
        SagaOrchestrator-->>User: Transfer Complete
    else Credit Fails (e.g. Account Frozen)
        AccountB-->>SagaOrchestrator: Fails
        SagaOrchestrator->>AccountA: COMPENSATE: Credit $100
        AccountA-->>SagaOrchestrator: Refunded
        SagaOrchestrator-->>User: Transfer Failed, Refunded
    end
```

<div class="mt-8 mb-12">
  <a href="/experiments/saga-state-machine" class="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-all">
    Try the Interactive Saga Lab
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </a>
</div>

## Engineering Decisions

### 1. Optimistic Concurrency Control (OCC)
**Decision:** How do we prevent a double-spend if two withdrawals hit the Event Store at the exact same millisecond?
**Implementation:** Every aggregate has a `Version`. When appending an event, the code includes the expected version. `AppendEvent(aggregateID, expectedVersion=5)`. If another process already wrote version 5, Firestore rejects the transaction. The API then retries, recalculates the balance, and potentially rejects the withdrawal if funds are now insufficient.

### 2. Snapshotting
**Decision:** Replaying 100,000 events to calculate a user's balance takes too long.
**Implementation:** Every 100 events, a background worker computes the current state and saves a `Snapshot`. Future replays only need to load the latest snapshot and replay the events that occurred *after* it.

## Production Engineering

- **Real-Time Fraud Detection:** A detached worker listens to the Event Store stream. It applies velocity rules (e.g., "more than 3 transfers in 1 minute") and burst-silence rules. Because it listens asynchronously, heavy ML/rules engines never block the user's API request. If fraud is detected, it simply appends an `AccountFrozen` event.
- **Metrics:** Instrumented with Prometheus. We track `business_transactions_total` and `saga_compensations_total`. A high compensation rate immediately alerts the team that a downstream service is struggling.

## Reflection

**Lessons Learned:**
- **Event Versioning:** You must think carefully about event schema evolution. An event is immutable; you cannot change it once it's written. We had to implement an `Upcaster` pattern to transform V1 events into V2 shapes during replay.
- **Eventual Consistency:** The UI must be designed to handle eventual consistency. When a user deposits money, the API returns `202 Accepted`. The UI might need to poll or rely on WebSockets to see the updated read projection a few milliseconds later.
