# Flagship Projects Catalog

This document is the canonical reference for the "Big Three" flagship projects showcased in this portfolio. All future articles, benchmarks, and interactive labs should anchor back to these systems.

## 1. Aegis Auth Platform
**Path:** `content/projects/aegis.md`

### Summary
A highly available, multi-tenant Auth & Authorization platform capable of serving thousands of authentications per second.

### Architecture & Tech Stack
- **Language:** Go (Golang)
- **API Layer:** gRPC and REST Gateway
- **Event Bus:** Kafka (for async audit logging and permission invalidation)
- **Cache:** Redis (Lock-free RBAC caching)
- **Database:** PostgreSQL (Core identity datastore)

### Key Features & Patterns
- Multi-tier caching strategy.
- Zero-downtime database migrations.
- **Architectural Patterns:** Microservices, Service Mesh, CQRS (for read-heavy RBAC queries).

### Engineering Challenges
- Dealing with cache stampedes during sudden traffic spikes.
- Ensuring strong consistency between the identity DB and the RBAC cache.

## 2. Core Banking System
**Path:** `content/projects/core-banking.md`

### Summary
A resilient transactional engine designed for a FinTech product, handling ledger movements, account balances, and real-time fraud detection.

### Architecture & Tech Stack
- **Language:** Go and TypeScript
- **Database:** Firestore (used as an EventStore and Projection DB)
- **Compute:** Cloud Run and Firebase Functions

### Key Features & Patterns
- Immutable append-only event log.
- **Architectural Patterns:** Event Sourcing, CQRS, Distributed Saga (for cross-account transfers), Idempotency.

### Engineering Challenges
- Implementing exactly-once semantics and distributed transactions without a relational DB (hence the Saga pattern).
- Performance bottleneck of folding events in a NoSQL Document DB.

## 3. QuantAlpha
**Path:** `content/projects/quant-alpha.md`

### Summary
A low-latency research and ingestion platform for High-Frequency Trading (HFT) signals.

### Architecture & Tech Stack
- **Language:** Go (Data Ingestion), Python (Machine Learning / Alpha Generation)
- **Queue/Buffer:** Redis Streams
- **Database:** TimescaleDB (PostgreSQL)

### Key Features & Patterns
- Decoupling high-speed WebSocket market data streams from slow, CPU-bound Python workers.
- **Architectural Patterns:** Producer-Consumer, Pub/Sub, Stream Processing.

### Engineering Challenges
- Python's GIL preventing true concurrency; solved by scaling workers horizontally via Redis Streams consumer groups.
- Memory pressure in Go from tens of thousands of concurrent WebSocket connections.
