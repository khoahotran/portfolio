const e=`---
title: "Event Sourcing vs CRUD: When to Choose Each"
date: "2026-06-28"
tags: ["event-sourcing", "cqrs", "architecture", "database", "go", "trade-offs"]
summary: "A decision framework for choosing between Event Sourcing and traditional CRUD, based on building both a CRUD loyalty API and a full event-sourced core banking system."
reading_time: "10 min read"
---

## Two Systems, Two Choices

When we built the **Jujuja J-Point loyalty system**, we used a straightforward CRUD model backed by Firestore atomic transactions. When we built the **Event-Driven Core Banking** system as a personal project, we went full event sourcing on Firestore.

Both decisions were correct for their contexts. Understanding *why* requires being honest about what event sourcing costs and what it buys.

---

## What CRUD Actually Means

In a CRUD (Create, Read, Update, Delete) system, the database stores the **current state** of an entity. When a user spends 200 loyalty points, you update a single document:

\`\`\`typescript
// CRUD: update in place
await db.collection('users').doc(userId).update({
  jpoints: admin.firestore.FieldValue.increment(-200),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});
\`\`\`

The current balance is always a single document read away: $O(1)$. The previous balance is gone unless you maintain a separate audit log.

**CRUD is the right default.** It is simple, fast, and well-understood. Most applications are CRUD applications with some business logic on top.

---

## What Event Sourcing Actually Means

In an event-sourced system, the database stores the **history of state changes**, not the current state. Current state is derived by replaying all events:

\`\`\`go
// Event Sourcing: append a new event
type AccountEvent struct {
    EventID   string          \`firestore:"eventId"\`
    EventType string          \`firestore:"eventType"\` // "AccountDebited", "AccountCredited"
    Amount    int64           \`firestore:"amount"\`
    Version   int             \`firestore:"version"\`   // Monotonically increasing
    CreatedAt time.Time       \`firestore:"createdAt"\`
    Metadata  map[string]any  \`firestore:"metadata"\`
}

// Writing a debit: append event, never update balance directly
func (r *EventStore) AppendDebit(ctx context.Context, accountID string, amount int64) error {
    ref := r.db.Collection("accounts").Doc(accountID).
        Collection("events").NewDoc()

    _, err := ref.Set(ctx, AccountEvent{
        EventID:   ref.ID,
        EventType: "AccountDebited",
        Amount:    amount,
        Version:   r.nextVersion(ctx, accountID), // Must be monotonic
        CreatedAt: time.Now(),
    })
    return err
}

// Reading current balance: sum all events (or use a snapshot)
func (r *EventStore) GetBalance(ctx context.Context, accountID string) (int64, error) {
    iter := r.db.Collection("accounts").Doc(accountID).
        Collection("events").
        OrderBy("version", firestore.Asc).
        Documents(ctx)

    var balance int64
    for {
        doc, err := iter.Next()
        if err != nil {
            break
        }
        var event AccountEvent
        doc.DataTo(&event)
        switch event.EventType {
        case "AccountCredited":
            balance += event.Amount
        case "AccountDebited":
            balance -= event.Amount
        }
    }
    return balance, nil
}
\`\`\`

The current balance requires reading and replaying $N$ events. That is $O(N)$ reads unless you introduce snapshotting.

---

## The Snapshot Optimization

Without snapshotting, every balance read is proportional to account age. In Core Banking, accounts can have thousands of events. We snapshot every 100 events:

\`\`\`go
type AccountSnapshot struct {
    Balance   int64     \`firestore:"balance"\`
    Version   int       \`firestore:"version"\` // Version at snapshot time
    CreatedAt time.Time \`firestore:"createdAt"\`
}

// ReadWithSnapshot: load latest snapshot, then replay only events after it
func (r *EventStore) ReadWithSnapshot(ctx context.Context, accountID string) (int64, error) {
    // 1. Load latest snapshot
    snapRef := r.db.Collection("accounts").Doc(accountID).
        Collection("snapshots").
        OrderBy("version", firestore.Desc).
        Limit(1)

    snapshotIter := snapRef.Documents(ctx)
    snapDoc, err := snapshotIter.Next()

    var baseBalance int64
    var fromVersion int

    if err == nil {
        var snap AccountSnapshot
        snapDoc.DataTo(&snap)
        baseBalance = snap.Balance
        fromVersion = snap.Version
    }

    // 2. Replay only events since the snapshot
    eventIter := r.db.Collection("accounts").Doc(accountID).
        Collection("events").
        Where("version", ">", fromVersion).
        OrderBy("version", firestore.Asc).
        Documents(ctx)

    balance := baseBalance
    for {
        doc, err := eventIter.Next()
        if err != nil {
            break
        }
        var event AccountEvent
        doc.DataTo(&event)
        switch event.EventType {
        case "AccountCredited":
            balance += event.Amount
        case "AccountDebited":
            balance -= event.Amount
        }
    }

    return balance, nil
}
\`\`\`

With snapshots every 100 events, balance reads become $O(1)$ amortized — always reading the most recent snapshot plus at most 99 delta events.

---

## What Event Sourcing Buys You

### 1. Complete Audit Log Without a Separate Table

With CRUD + a separate \`audit_log\` table, you must write two records atomically and hope they never drift. With event sourcing, the event stream *is* the audit log. There is no separate table to maintain consistency with.

### 2. Temporal Queries

You can reconstruct the state of an account at any point in time by replaying events up to that timestamp:

\`\`\`go
// What was account ABC's balance on March 15, 2026?
func (r *EventStore) BalanceAt(ctx context.Context, accountID string, at time.Time) (int64, error) {
    iter := r.db.Collection("accounts").Doc(accountID).
        Collection("events").
        Where("createdAt", "<=", at).
        OrderBy("version", firestore.Asc).
        Documents(ctx)

    var balance int64
    for {
        doc, err := iter.Next()
        if err != nil {
            break
        }
        var event AccountEvent
        doc.DataTo(&event)
        switch event.EventType {
        case "AccountCredited":
            balance += event.Amount
        case "AccountDebited":
            balance -= event.Amount
        }
    }
    return balance, nil
}
\`\`\`

CRUD cannot do this. Once you overwrite the balance, the previous value is gone.

### 3. Event Replay for Projection Rebuilding

When business requirements change, you can rebuild derived views (projections) by replaying the event history through new logic — without running migrations on the source table.

---

## What Event Sourcing Costs You

### 1. Read Complexity

Simple balance reads become event stream aggregations. Every engineer on the team must understand the projection pattern.

### 2. Schema Evolution is Harder

Changing the shape of an event that was written years ago is a significant problem. You must version events and maintain backwards-compatible readers:

\`\`\`go
func applyEvent(event AccountEvent, balance int64) int64 {
    switch event.EventType {
    case "AccountDebited":
        return balance - event.Amount
    case "AccountDebited.v2": // New event type introduced in June 2026
        // v2 includes fee deduction in the same event
        return balance - event.Amount - event.Metadata["fee"].(int64)
    default:
        return balance // Unknown event types are ignored
    }
}
\`\`\`

### 3. Tooling and Query Complexity

You cannot run \`SELECT SUM(amount) FROM accounts WHERE region = 'HCMC'\` against an event store. Aggregation queries require pre-built projections that are refreshed from the event stream.

---

## The Decision Framework

\`\`\`mermaid
flowchart TD
    A{Do you need full history\\nof every state change?}
    B{Do you need temporal queries\\nor time-travel debugging?}
    C{Are there multiple independent\\nread models from the same data?}
    D{Is the team small and\\nthe system simple?}

    A -->|Yes| B
    A -->|No| D
    B -->|Yes| EventSourcing["✅ Event Sourcing"]
    B -->|No| C
    C -->|Yes| EventSourcing
    C -->|No| D
    D -->|Yes| CRUD["✅ CRUD with Audit Log"]
    D -->|No| Evaluate["Evaluate CQRS only\\n(separate read/write models)"]
\`\`\`

---

## Side-by-Side Comparison

| Dimension | CRUD | Event Sourcing |
|:---|:---|:---|
| **Read latency** | $O(1)$ — direct document read | $O(N/S)$ — events since last snapshot |
| **Write latency** | $O(1)$ — update in place | $O(1)$ — append event |
| **Audit history** | Requires separate log table | Built-in — event stream is the log |
| **Temporal queries** | Impossible without external snapshots | Native — replay to any timestamp |
| **Schema evolution** | Migrations on existing rows | Event versioning + backwards-compatible readers |
| **Operational complexity** | Low | High — projections, snapshots, reclaim logic |
| **Team learning curve** | Minimal | Significant |
| **Best fit** | Loyalty points, sessions, simple CRUD APIs | Financial ledgers, audit-critical systems, multi-model reads |

---

## Our Actual Choices

For **Jujuja J-Points** (loyalty currency): **CRUD + atomic transactions + audit log**.

The loyalty system needed fast balance reads, simple point additions, and a reconciliation check. Full event sourcing would have tripled development time for marginal benefit. We wrote balance updates atomically with a companion audit log entry in the same Firestore transaction.

For **Core Banking** (the personal project): **Full Event Sourcing with CQRS**.

A banking ledger is the canonical event-sourcing use case. Every debit and credit must be traceable forever. Temporal queries ("what was this account's balance before the fraud incident?") are a regulatory requirement. The additional complexity is justified by the domain.

---

## Key Takeaways

1. **CRUD is the correct default.** Reach for event sourcing only when your domain explicitly requires full history, temporal queries, or multiple divergent read projections.
2. **Snapshotting is mandatory at scale.** Without periodic snapshots, read performance degrades linearly with account age — making event sourcing impractical for long-lived aggregates.
3. **The event schema is a public contract.** Once an event type is written to the store, you cannot change its shape — only append new versions. Design your event schemas with the same care as a gRPC protobuf contract.
4. **Event sourcing doesn't replace CQRS — it enables it.** Event sourcing gives you a reliable source from which to build multiple specialized read projections, each optimized for a specific query pattern.
`;export{e as default};
