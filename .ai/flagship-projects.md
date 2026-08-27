# Flagship Projects Catalog

This document is the canonical reference for the four flagship projects showcased in this portfolio. All future articles, benchmarks, and interactive labs should anchor back to these systems. (Named "Big Three" until PFM was added on 2026-08-27 — the phrase is retired but may still appear in older commit messages/comments.)

## 1. Aegis Auth Platform
**Path:** `content/projects/aegis.md`

### Summary
A highly available, multi-tenant Auth & Authorization platform capable of serving thousands of authentications per second.

### Architecture & Tech Stack
- **Language:** Go (Golang)
- **API Layer:** GraphQL Gateway (Go, gqlgen) at the edge, internal service-to-service traffic on gRPC
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
- **Database:** PostgreSQL (BRIN-indexed for time-series queries; migration to TimescaleDB or ClickHouse is a considered future step, not yet done — see `content/projects/quant-alpha.md`)

### Key Features & Patterns
- Decoupling high-speed WebSocket market data streams from slow, CPU-bound Python workers.
- **Architectural Patterns:** Producer-Consumer, Pub/Sub, Stream Processing.

### Engineering Challenges
- Python's GIL preventing true concurrency; solved by scaling workers horizontally via Redis Streams consumer groups.
- Memory pressure in Go from tens of thousands of concurrent WebSocket connections.

## 4. PFM (Personal Finance Manager)
**Path:** `content/projects/pfm.md`

### Summary
A spec-driven, invite-only personal finance tracker. React 19 Server Actions are the only client
the Go API accepts — the browser never calls it directly.

### Architecture & Tech Stack
- **Frontend:** React 19, Next.js App Router / Server Actions (via vinext, an experimental Vite-based
  reimplementation — a named risk, not a hidden one).
- **Backend:** Go, Gin, sqlc (no ORM).
- **Database:** PostgreSQL (sole authoritative store, including invitation TTL).
- **Cache/Queue:** Redis — exactly two uses: the Asynq email queue and the JWT logout denylist.

### Key Features & Patterns
- Hard client boundary: the browser never holds a credential the Go API accepts.
- Package-by-Feature backend, one bounded context per module, enforced by import rules (AR-06).
- Spec-driven development: SRS -> SDS -> constitution -> code, kept in lockstep as a documented policy.

### Engineering Challenges
- Financial correctness under concurrency (row-level locking, atomic balance + transaction writes,
  currency locked on first transaction).
- A backend originally organized by technical layer, explicitly re-architected to Package-by-Feature
  mid-project once the layer-first layout made crossing a domain boundary too easy.

### Honest Status
MVP (21 user stories) complete and through a first post-MVP hardening pass. Work in progress on the
first new post-MVP story (User Status management). CI does not yet run the Playwright E2E suite.
Several specified stories (password reset, role management, invitation revocation) are spec-only.
