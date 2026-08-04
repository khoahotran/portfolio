# Knowledge Graph

This graph maps the conceptual relationships across the portfolio, ensuring it behaves as a connected engineering knowledge base.

## Core Relationships

### Technologies -> Projects
- **Go (Golang)** -> powers -> [Aegis], [Core Banking], [QuantAlpha]
- **TypeScript** -> powers -> [Core Banking (Cloud Functions)]
- **Python** -> powers -> [QuantAlpha]
- **PostgreSQL** -> backs -> [Aegis], [QuantAlpha]
- **Firestore** -> backs -> [Core Banking]
- **Redis** -> accelerates -> [Aegis], [QuantAlpha]
- **Kafka** -> decouples -> [Aegis]

### Patterns -> Projects
- **Event Sourcing** -> implemented in -> [Core Banking]
- **CQRS** -> implemented in -> [Core Banking], [Aegis]
- **Saga Pattern** -> implemented in -> [Core Banking]
- **Microservices** -> implemented in -> [Aegis]

### Concepts -> Articles & Labs
- **Event Sourcing** -> explained in -> `event-sourcing-vs-crud-when-to-choose-each.md`, `db-event-replay-benchmark.md`
- **Saga Pattern** -> visualized in -> `implementing-the-saga-pattern-for-distributed-transfers.md`, `saga-state-machine-visualizer.md`
- **Queueing (Redis/BullMQ)** -> benchmarked in -> `redis-streams-vs-bullmq-job-queue-comparison.md`, `redis-vs-bullmq.md`

## Recommended Reading Paths

**Path 1: The FinTech Architect**
1. Read `/projects/core-banking` (Flagship)
2. Read `/system-design/atomic-financial-transactions-in-nosql` (Deep Dive)
3. Interact with `/experiments/saga-state-machine-visualizer` (Lab)
4. Interact with `/experiments/db-event-replay-benchmark` (Benchmark)

**Path 2: High-Performance Go Backend**
1. Read `/projects/aegis` (Flagship)
2. Read `/blog/grpc-service-mesh-in-go-aegis-architecture` (Architecture Note)
3. Interact with `/experiments/go-vs-ts-concurrency` (Benchmark)

*Note: You can view the visual representation of this graph in the actual app at the `/graph` route.*
