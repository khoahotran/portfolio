# Ecosystem Graph

This graph maps the conceptual relationships across the portfolio, ensuring it behaves as a connected
engineering knowledge base. Named "Ecosystem Graph" to match the live page (`/graph`, nav label
"Ecosystem", `<h1>Ecosystem Graph</h1>`) — this file used to be titled "Knowledge Graph", which drifted
from the UI. The filename stays `knowledge-graph.md`; other `.ai/` docs reference it by that path.

## Core Relationships

### Technologies -> Projects
- **Go (Golang)** -> powers -> [Aegis], [Core Banking], [QuantAlpha]
- **TypeScript** -> powers -> [Core Banking (Cloud Functions)]
- **Python** -> powers -> [QuantAlpha]
- **PostgreSQL** -> backs -> [Aegis], [QuantAlpha]
- **Firestore** -> backs -> [Core Banking]
- **Redis** -> accelerates -> [Aegis], [QuantAlpha]
- **Kafka** -> decouples -> [Aegis]
- **Redis** -> backs the Asynq queue and JWT denylist for -> [PFM]

### Patterns -> Projects
- **Event Sourcing** -> implemented in -> [Core Banking]
- **CQRS** -> implemented in -> [Core Banking], [Aegis]
- **Saga Pattern** -> implemented in -> [Core Banking]
- **Microservices** -> implemented in -> [Aegis]
- **Server Actions as BFF** -> implemented in -> [PFM]
- **PBAC** -> implemented in -> [PFM]

### Concepts -> Articles & Labs
- **Event Sourcing** -> explained in -> `event-sourcing-vs-crud-when-to-choose-each.md`, `db-event-replay-benchmark.md`
- **Saga Pattern** -> visualized in -> `implementing-the-saga-pattern-for-distributed-transfers.md`, `saga-state-machine-visualizer.md`
- **Queueing (Redis/BullMQ)** -> benchmarked in -> `redis-streams-vs-bullmq-job-queue-comparison.md` (includes the raw-throughput numbers previously in the now-merged `redis-vs-bullmq.md`)
- **API Gateway / Rate Limiting** -> designed in -> `designing-a-global-api-gateway.md`, implemented in ->
  `rate-limiting-algorithms.md` (lab), transport trade-off in -> `websockets-vs-sse.md` (Phase 5, §5.4 —
  added 2026-08-28)
- **Observability (Tracing vs Metrics)** -> practiced in -> `distributed-tracing-with-opentelemetry-and-jaeger.md`,
  decided in -> `adr-tracing-vs-metrics-in-microservices.md` (Phase 5, §5.3 — added 2026-08-28)
- **Database Indexing (B-Tree vs BRIN)** -> explained in -> `database-indexing-btree-vs-brin-for-time-series.md`,
  grounded in QuantAlpha's target-design tick-ingestion pipeline (Phase 5, §5.4 — added 2026-08-28)

## Recommended Reading Paths

**Path 1: The FinTech Architect**
1. Read `/projects/core-banking` (Flagship)
2. Read `/system-design/atomic-financial-transactions-in-nosql` (Deep Dive)
3. Interact with `/labs/saga-state-machine` (Lab) — write-up at `/experiments/saga-state-machine-visualizer`
4. Interact with `/labs/db-event-replay-benchmark` (Benchmark) — write-up at `/experiments/db-event-replay-benchmark`

**Path 2: High-Performance Go Backend**
1. Read `/projects/aegis` (Flagship)
2. Read `/blog/grpc-service-mesh-in-go-aegis-architecture` (Architecture Note)
3. Read `/research/adr-tracing-vs-metrics-in-microservices` (ADR) — added Phase 5 §5.3
4. Read `/system-design/designing-a-global-api-gateway` (System Design) — added Phase 5 §5.4
5. Interact with `/labs/rate-limiting-algorithms` (Lab) — write-up at `/experiments/rate-limiting-algorithms`
6. Interact with `/labs/go-vs-ts-concurrency` (Benchmark) — write-up at `/experiments/go-vs-ts-concurrency`

**Path 3: HFT Research Platform**
1. Read `/projects/quant-alpha` (Flagship)
2. Read `/blog/designing-a-multi-role-hft-research-platform` (Architecture Note)
3. Read `/research/database-indexing-btree-vs-brin-for-time-series` (Research) — added Phase 5 §5.4
4. Interact with `/labs/redis-vs-bullmq` (Benchmark) — write-up at `/experiments/redis-streams-vs-bullmq-job-queue-comparison`

*Note: You can view the visual representation of this graph in the actual app at the `/graph` route.*
