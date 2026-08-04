# Architecture Catalog

This catalog documents the primary architectural patterns utilized and referenced across the portfolio.

## Event Sourcing
**Description:** Instead of storing the current state of an entity, the system stores a sequence of immutable events. Current state is derived by replaying these events.
**Trade-offs:** Provides a perfect audit log and time-travel debugging. However, it introduces complexity, eventual consistency, and slower read times (O(N) unless snapshots are used).
**Projects:** Core Banking.
**Related Content:** `/projects/core-banking`, `/experiments/db-event-replay-benchmark`.

## CQRS (Command Query Responsibility Segregation)
**Description:** Separating the read model (Queries) from the write model (Commands) into distinct logical or physical paths.
**Trade-offs:** Allows independent scaling and optimized data schemas for reads vs writes. Increases system complexity and necessitates handling eventual consistency.
**Projects:** Core Banking, Aegis.
**Related Content:** `/blog/architecture-breakdown-cqrs-for-mid-size-products`.

## Distributed Saga Pattern
**Description:** A sequence of local transactions where each step publishes an event triggering the next. If a step fails, compensating transactions are executed to undo the previous steps.
**Trade-offs:** Avoids distributed locks and 2-Phase Commits (2PC), improving throughput. Extremely complex to design and debug; requires robust idempotency.
**Projects:** Core Banking.
**Related Content:** `/system-design/implementing-the-saga-pattern-for-distributed-transfers`, `/experiments/saga-state-machine-visualizer`.

## Producer-Consumer via Redis Streams
**Description:** Decoupling high-throughput data producers from slow consumers using an append-only log with Consumer Groups.
**Trade-offs:** Excellent for scaling heterogeneous workers (e.g., Go producers, Python consumers). Requires careful memory management (trimming streams) and handling consumer crashes (acknowledgments).
**Projects:** QuantAlpha.
**Related Content:** `/projects/quant-alpha`, `/experiments/redis-vs-bullmq`.

## Idempotency
**Description:** Ensuring that an API request or event can be processed multiple times without changing the result beyond the initial application.
**Trade-offs:** Crucial for retry mechanisms. Requires a robust idempotency key store (usually Redis or PostgreSQL) and adds overhead to every mutating request.
**Projects:** Core Banking.
**Related Content:** `/system-design/system-design-notes-idempotency`.
