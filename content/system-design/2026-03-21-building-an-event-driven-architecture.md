---
title: "Building an Event-Driven Architecture"
date: "2026-03-21"
tags: ["event-driven", "architecture", "messaging", "system-design", "kafka"]
summary: "A practical blueprint for introducing domain events to untangle a monolith without losing delivery guarantees."
---

## The Monolith Bottleneck

In our core backend platform, a single HTTP request for store onboarding triggered an enormous cascade of synchronous side effects. A typical flow involved:
1. Writing the store profile to the database.
2. Synchronizing the initial inventory with a third-party ERP.
3. Provisioning a Stripe Connect account.
4. Sending an onboarding email.
5. Updating the promotion engine's cache.

As the platform grew, this synchronous design became a massive liability. If the ERP API was slow, the entire request timed out, rolling back the store creation. Median write latency crept up to 420ms, and engineers were terrified to add new features to the onboarding flow.

---

## The Event-Driven Shift: Transactional Outbox

We needed to decouple these side effects. The solution was migrating to an Event-Driven Architecture (EDA) using the **Transactional Outbox** pattern to ensure we never lost an event.

```
[ HTTP POST ] ──> [ API Server ]
                        │
                        ▼ (Start Transaction)
           ┌───────────────────────────┐
           │ 1. Write Store Profile    │
           │ 2. Write Event to Outbox  │
           └───────────────────────────┘
                        │
                        ▼ (Commit Transaction)
                [ PostgreSQL DB ]
                        │
             (Polls via `SKIP LOCKED`)
                        ▼
            [ Outbox Publisher Worker ]
                        │
                        ├─► 1. Publish Event ──► [ Kafka Topic ]
                        │
                        └─► 2. Mark Outbox as PROCESSED
```

Instead of executing side effects immediately, the command handler now does exactly two things inside a single database transaction:
1. Writes the business state (e.g., `INSERT INTO stores`).
2. Writes an event payload to an outbox table (e.g., `INSERT INTO outbox (event_type, payload)`).

Because these two writes are part of the same ACID transaction, they are guaranteed to either both succeed or both fail.

---

## Technical Implementation: Outbox Publisher

Here is the complete database schema and a Node.js worker implementation that publishes outbox events using a concurrency-safe `SKIP LOCKED` query.

### 1. Database Schema (PostgreSQL)

```sql
-- Store profile table
CREATE TABLE stores (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactional Outbox table
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSED, FAILED
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_outbox_pending ON outbox_events(status, created_at) WHERE status = 'PENDING';
```

### 2. The Node.js Outbox Polling Publisher

This service runs in a background process, querying the database and publishing messages safely:

```typescript
import { Client } from 'pg';
import { Kafka, Producer } from 'kafkajs';

const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
const kafka = new Kafka({ clientId: 'outbox-publisher', brokers: ['localhost:9092'] });
let kafkaProducer: Producer;

async function initialize() {
  await pgClient.connect();
  kafkaProducer = kafka.producer();
  await kafkaProducer.connect();
  
  // Start polling loop
  pollOutbox();
}

async function pollOutbox() {
  while (true) {
    let hasProcessed = false;
    
    try {
      // 1. Begin transaction to lock and fetch oldest pending events
      await pgClient.query('BEGIN');
      
      const fetchQuery = `
        SELECT id, event_type, payload 
        FROM outbox_events 
        WHERE status = 'PENDING' 
        ORDER BY created_at ASC 
        LIMIT 10 
        FOR UPDATE SKIP LOCKED; -- High concurrency safety
      `;
      
      const res = await pgClient.query(fetchQuery);
      
      if (res.rows.length > 0) {
        hasProcessed = true;
        
        for (const row of res.rows) {
          try {
            // 2. Publish to Kafka
            await kafkaProducer.send({
              topic: `domain-${row.event_type.split('.')[0]}`,
              messages: [{ key: row.id, value: JSON.stringify(row.payload) }],
            });

            // 3. Mark as processed
            await pgClient.query(
              `UPDATE outbox_events 
               SET status = 'PROCESSED', processed_at = NOW() 
               WHERE id = $1`, 
              [row.id]
            );
          } catch (publishError) {
            console.error(`Failed to publish event ${row.id}:`, publishError);
            
            // Mark as failed for human intervention / retry
            await pgClient.query(
              `UPDATE outbox_events 
               SET status = 'FAILED', error_message = $2, retry_count = retry_count + 1 
               WHERE id = $1`, 
              [row.id, publishError.message]
            );
          }
        }
      }
      
      await pgClient.query('COMMIT');
    } catch (dbError) {
      await pgClient.query('ROLLBACK');
      console.error('Database transaction error in outbox poller:', dbError);
    }

    // Dynamic sleep interval: sleep longer if no events were found
    const sleepDuration = hasProcessed ? 50 : 1000;
    await new Promise((resolve) => setTimeout(resolve, sleepDuration));
  }
}

initialize().catch(console.error);
```

---

## Event Schema Versioning Strategy

Since events represent a public contract across services, changing their shape requires extreme caution. We followed three strict rules:

- **Backward Compatibility**: Field removal or modification is forbidden. If a change is needed, append optional fields.
- **Forward Compatibility**: Consumers must be configured to tolerate and ignore unknown fields.
- **Explicit Versioning**: Include a version integer in the envelope of every event:
  ```json
  {
    "eventId": "event-uuid-789",
    "eventType": "store.created",
    "version": 2,
    "timestamp": "2026-03-21T12:00:00Z",
    "data": { ... }
  }
  ```

---

## Key Takeaways

1. **Transactional Outbox prevents lost events**: Writing to the outbox and application table in the same transaction guarantees event delivery, even if the publisher crashes.
2. **Use `SKIP LOCKED` for polling scaling**: It prevents multiple instances of the publisher service from locking the same rows, enabling horizontal scalability.
3. **Idempotency is mandatory on the consumer**: Since events can be redelivered during failure recovery (at-least-once delivery), consumers must store processed event IDs to prevent duplicate actions.
