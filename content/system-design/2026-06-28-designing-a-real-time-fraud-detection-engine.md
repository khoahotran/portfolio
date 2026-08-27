---
title: "Designing a Real-Time Fraud Detection Engine with Velocity Rules"
date: "2026-06-28"
tags: ["system-design", "go", "finance", "event-driven", "architecture"]
related: ["projects/core-banking", "system-design/implementing-the-saga-pattern-for-distributed-transfers"]
summary: "How I built a real-time fraud detection engine using Event Sourcing, CQRS, and velocity rules to automatically freeze malicious accounts in a core banking system."
---

In a core banking system, detecting fraud *after* the money has left the platform is too late. Fraud detection must be inline, real-time, and deeply integrated into the transaction lifecycle.

When building my Event-Driven Core Banking project in Go, I designed a Fraud Engine that evaluates every transfer against a set of dynamic velocity and behavioral rules. If a rule triggers, the account is immediately frozen via a Saga compensation, preventing further fund movement.

## System Context (C4 Level 2)

The Core Banking platform is built on an Event Sourcing and CQRS architecture using Firestore as the underlying datastore. 

```mermaid
flowchart TB
    subgraph Core_Banking_Platform [Core Banking Platform]
        API[API Gateway / GraphQL]
        
        Saga[Saga Orchestrator\nGo Worker]
        Fraud[Fraud Engine\nGo Worker]
        Proj[Projection Worker\nGo Worker]
        
        ES[(EventStore\nFirestore append-only)]
        PR[(Projection DB\nFirestore Accounts)]
        Metrics[(Prometheus\nMetrics & Alerts)]
    end

    Client([Mobile/Web Client]) -->|POST /transfer| API
    
    API -->|Append TransferInitiated| ES
    
    ES -.->|Listen to Events| Saga
    ES -.->|Listen to Events| Fraud
    ES -.->|Listen to Events| Proj
    
    Saga -->|Append Debit/Credit| ES
    Proj -->|Update Balances| PR
    
    Fraud -->|Rule Engine Eval| Fraud
    Fraud -->|Append AccountFrozen| ES
    Fraud -->|Push Stats| Metrics
    
    API -.->|"Query O(1)"| PR

    classDef service fill:#f0fdf4,stroke:#86efac,stroke-width:2px;
    classDef db fill:#eff6ff,stroke:#93c5fd,stroke-width:2px;
    
    class API,Saga,Fraud,Proj service;
    class ES,PR,Metrics db;
```

## The EventStore Data Model

Because the system uses Event Sourcing, the `EventStore` is the single source of truth. Accounts and balances do not exist as mutable rows; they are derived from an append-only log of events.

```mermaid
erDiagram
    EVENT {
        string eventID PK
        string aggregateID FK "The Account ID"
        int version "Optimistic Concurrency"
        string type "e.g., TransferInitiated"
        json payload "Amount, TargetAccount"
        timestamp createdAt
    }
    
    SNAPSHOT {
        string aggregateID PK
        int version "e.g., 100"
        json state "Current Balance"
        timestamp createdAt
    }
    
    ACCOUNT_PROJECTION {
        string accountID PK
        float currentBalance
        string status "ACTIVE or FROZEN"
    }

    EVENT }|--|| SNAPSHOT : "creates every 100 events"
    EVENT }|--|| ACCOUNT_PROJECTION : "updates asynchronously"
```

## Fraud Detection: Velocity Rules

Fraudsters rarely make one large, obvious transaction. They test stolen credentials with a small ping (e.g., $1.00), wait for silence, and then execute a burst of high-velocity transfers just under the AML reporting threshold.

To catch this, the Fraud Engine implements **Velocity Rules** and **Burst-Silence Detection**.

### The Rule Evaluation Flow

The Fraud Engine is a passive listener on the EventStore. It tails the Firestore `events` collection for any `TransferInitiated` event.

```mermaid
sequenceDiagram
    autonumber
    participant ES as EventStore
    participant FE as Fraud Engine
    participant Mem as In-Memory Window (Sliding)
    participant PROM as Prometheus
    
    ES->>FE: Receive TransferInitiated(Account A, $9,000)
    
    FE->>Mem: Add to 10-minute sliding window
    FE->>Mem: Eval: Sum(Amount) in last 10m > $10,000?
    
    alt Velocity Rule Exceeded
        Mem-->>FE: TRIGGERED (Sum = $12,000)
        FE->>ES: Append AccountFrozen(Account A, reason)
        FE->>PROM: inc counter(banking_fraud_detected_total)
    else Rule Passed
        Mem-->>FE: OK (Sum = $9,000)
    end
```

### Snapshotting for Performance

Because the Fraud Engine needs to evaluate historical context (e.g., "how many transfers happened today"), reading the entire event log for an active account would be O(N) and far too slow.

To solve this, the system creates a `Snapshot` every 100 events. 
When the Fraud Engine needs historical context, it reads the latest snapshot + any events that occurred *after* that snapshot. This bounds the read to O(1) relative to total event count; "under 15ms" is an expected range for that access pattern rather than a measured figure — no load test, environment, or sample size is claimed here.

## Handling the Saga Compensation

In the target orchestrator design described in the [Saga pattern deep dive](/system-design/implementing-the-saga-pattern-for-distributed-transfers), if the Fraud Engine detects anomaly and appends an `AccountFrozen` event, the Saga Orchestrator (which is executing the multi-step transfer) would see this state change, halt the transfer, execute compensation transactions (refunding any debits already applied), and mark the Saga as `COMPENSATED_FRAUD`.

> **Current implementation vs. this design:** the currently committed Core Banking repository does not implement this centralized orchestrator or the `COMPENSATED_FRAUD` state. Its Saga logic is the choreography-style `SagaManager` described in the linked Saga pattern deep dive, which reacts to domain events — including `AccountFrozen` — directly, rather than through a persisted state machine. The fraud-triggered compensation flow above is the target design this project was working toward, not a description of what's currently running.

## Conclusion

By treating fraud detection as an asynchronous projection rather than a synchronous API blocker, the Core Banking API remains incredibly fast for legitimate users, while the Fraud Engine independently monitors and clamps down on malicious activity in near real-time.
