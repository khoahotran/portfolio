---
title: "Architecture Breakdown: CQRS for Mid-size Products"
date: "2026-03-21"
tags: ["cqrs", "architecture", "backend", "system-design", "database"]
summary: "A practical guide to adopting CQRS for mid-size products: when it helps, when it hurts, and the pragmatic migration path."
reading_time: "10 min read"
---

## The Tipping Point

Every monolithic system eventually hits a breaking point where the read model and the write model start fighting for the same database resources. In our case, the read model was overloaded with complex `JOIN`s to serve various dashboards, while the write workflows became increasingly harder to evolve because every schema change threatened to break a critical read query.

Our core application was built on top of a single PostgreSQL database. Under normal operations, this was highly reliable. However, as our user base scaled, two specific tables—`orders` and `inventory_items`—became hot spots for transaction lock contention. 

At peak times, we experienced:
- **Write Latency Spikes**: Insert and update transactions on orders frequently ran into locks, pushing p99 write latency to over `3,200ms`.
- **Read Outages**: Analytics queries and admin dashboards, which required scanning multiple tables with multiple `LEFT JOIN`s, took up to `8 seconds` to execute, starving the database connection pool.
- **Deadlocks**: The combination of long-running analytics read locks and rapid transactional write locks caused intermittent deadlock exceptions, failing customer transactions.

We needed a solution that would allow us to optimize reads for high throughput without sacrificing the strict consistency requirements of our write operations. 

## The CQRS Approach

Command Query Responsibility Segregation (CQRS) is often presented as a heavyweight, enterprise-only pattern requiring message brokers, event store databases, and massive microservice environments. However, we found a pragmatic way to adopt it for our mid-size product. 

We didn't rewrite the entire system. Instead, we applied CQRS surgically to just **two bounded contexts** that were experiencing the most pain: **Order Management** and **Inventory Tracking**.

### Separation of Concerns

By dividing our read and write paths, we decoupled the schemas and optimized the data storage models for their specific jobs.

```
       [ Client Request ]
         /           \
   (Command)        (Query)
      /               \
[ Write API ]     [ Read API ]
     |                 |
[ Write DB ]      [ Read DB ] (Denormalized)
(Normalized SQL)       ^
     \                 /
      [ Sync Service ] (CDC / Outbox / Event Listener)
```

1. **The Write Side (Command)**: We stripped down the write models to their bare essentials, focusing entirely on enforcing business invariants. The write database became a highly optimized, normalized schema designed for quick transactional updates.
2. **The Read Side (Query)**: We created tailored read projections (materialized views and denormalized tables) specifically structured to answer the dashboard queries in $O(1)$ or $O(\log N)$ time.

---

## Technical Implementation

To implement this separation without introducing the overhead of a separate Kafka cluster, we utilized PostgreSQL replication and a lightweight Outbox-style sync worker written in Node.js.

### 1. The Write Model (Normalized SQL)

The write database preserves relational constraints and enforces business logic. Here is the simplified schema for the write side:

```sql
-- The Write Model: Optimized for updates and transactional integrity
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(12, 2) NOT NULL
);
```

### 2. The Read Model (Denormalized Cache / Search-optimized)

The read database consists of pre-computed, flattened records. For this implementation, we stored the read model in MongoDB, which fits JSON dashboard representations perfectly, or a denormalized PostgreSQL view table indexed heavily on query parameters. Here is the target structure of our denormalized order view:

```json
{
  "_id": "order-uuid-12345",
  "customerId": "customer-uuid-abc",
  "status": "PROCESSING",
  "totalAmount": 150.00,
  "itemCount": 3,
  "productSummary": "Laptop Sleeve, USB-C Hub, Cable Organizer",
  "customerName": "Jane Doe",
  "customerEmail": "jane.doe@example.com",
  "createdAt": "2026-03-21T12:00:00Z"
}
```

### 3. The Projection Sync Worker

We write a simple NestJS service that listens to transaction commits or outbox records and updates the read database asynchronously. Here is the implementation using a safe transactional boundary:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrderDocument } from './schemas/order-read.schema';
import { OrderEventDto } from './dto/order-event.dto';

@Injectable()
export class OrderProjectionWorker {
  private readonly logger = new Logger(OrderProjectionWorker.name);

  constructor(
    @InjectModel('OrderRead') private readonly readModel: Model<OrderDocument>
  ) {}

  async handleOrderCreated(event: OrderEventDto): Promise<void> {
    this.logger.log(`Syncing order creation: ${event.orderId}`);
    
    // Construct the denormalized query model
    const denormalizedOrder = {
      _id: event.orderId,
      customerId: event.customerId,
      status: event.status,
      totalAmount: event.totalAmount,
      itemCount: event.items.reduce((acc, item) => acc + item.quantity, 0),
      productSummary: event.items.map(item => item.productName).join(', '),
      customerName: event.customerName,
      customerEmail: event.customerEmail,
      createdAt: event.createdAt,
    };

    // Upsert into denormalized read database
    await this.readModel.findByIdAndUpdate(
      event.orderId,
      { $set: denormalizedOrder },
      { upsert: true, new: true }
    );
  }

  async handleOrderStatusUpdated(orderId: string, newStatus: string): Promise<void> {
    this.logger.log(`Syncing status update: ${orderId} -> ${newStatus}`);
    await this.readModel.findByIdAndUpdate(
      orderId,
      { $set: { status: newStatus } }
    );
  }
}
```

---

## Trade-offs and Operational Reality

The benefits were immediate: we achieved significantly clearer domain models and orders of magnitude faster read latencies. However, CQRS introduces undeniable complexity.

### Architectural Trade-off Matrix

| Feature | Unified Model | CQRS (Segregated Path) |
| :--- | :--- | :--- |
| **Write Throughput** | Moderate (Contention bound) | High (Normalized, lock-free tables) |
| **Read Latency** | Slows down as joins increase | Constant $O(1)$ or $O(\log N)$ |
| **Data Consistency** | Strong (ACID) | Eventual Consistency |
| **Development Speed** | Fast initially (single model) | Slow initially (two models to write) |
| **Infrastructure Cost** | Low (Single DB server) | Moderate (Requires Sync Worker + Read Store) |

### 1. Managing Eventual Consistency

Because the read projections are updated asynchronously, a client query executed immediately after a write command might return stale data. We resolved this through:
- **Optimistic UI Updates**: The frontend immediately renders the transition locally, pretending the database write is complete.
- **WebSocket Push Notifications**: The sync worker emits an event via WebSockets when the projection completes, forcing the client to reload.
- **Version Headers**: Including the entity version in API responses so the client can retry the read if the returned version is less than the write version.

### 2. Monitoring Projection Lag

We quickly realized that if the projection worker went down, we had no way of knowing our dashboards were serving stale data. We built an operational dashboard tracking **Projection Lag** (the delta between the event timestamp in the write database and the update timestamp in the read database). If the lag exceeds 5 seconds, an alert is triggered in our SRE system.

---

## The Core Lesson

Adopt CQRS surgically, not as a default architecture slogan. It is a powerful pattern for resolving read/write contention, but its complexity tax should only be paid when the pain of a unified model outweighs the cost of maintaining two separate data pipelines. 

For mid-size products, start with shared databases using separate schemas or tables for read views before introducing separate database engines. Keep your system as simple as possible for as long as possible.
