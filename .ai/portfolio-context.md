# Portfolio Context

## Portfolio Vision
This repository is the personal engineering portfolio of **Khoa Tran**. It serves as an interactive, Staff/Principal-level engineering showcase. It moves beyond standard "resume" bullet points to offer deep, narrative-driven case studies, architectural deep-dives, and reproducible interactive benchmarks.

## Target Audience
The primary audience consists of:
- **Director/VP of Engineering:** Assessing architectural maturity, strategic thinking, and system design expertise.
- **Staff/Principal Peers:** Looking for deep technical insights, pragmatic trade-offs, and rigorous benchmarking.
- **Technical Recruiters:** Seeking evidence of high-impact work and thought leadership.

## Engineering Domains
The portfolio primarily showcases expertise in:
- **Distributed Systems:** Handling state, consistency, and asynchronous communication across microservices.
- **High-Frequency Trading (HFT):** Low-latency data ingestion, memory management, and deterministic performance.
- **Core Banking / FinTech:** Transactional guarantees, Event Sourcing, Saga patterns, and idempotency.

## Expertise Areas
- **Backend Languages:** Go (Golang), TypeScript (Node.js), Python (for ML pipelines).
- **Databases:** PostgreSQL, Firestore, Redis.
- **Infrastructure:** Kafka/Redpanda, gRPC, OpenTelemetry, AWS/GCP.
- **Architecture Patterns:** CQRS, Event Sourcing, Saga, Hexagonal Architecture, Domain-Driven Design (DDD).

## Narrative Goals
The portfolio must communicate that the author is an engineer who:
- Builds for **resilience and failure** (designing systems that expect network partitions).
- Relies on **boring technology** (PostgreSQL) when possible, but uses specialized tools (Redis Streams, Kafka) when the domain demands it.
- Communicates complex ideas effectively using **visualizations** (Mermaid, C4).
- Values **measurability** (hence the interactive benchmark laboratories).

## Maturity Goals
Every artifact in this repository must reflect Staff-level maturity:
- **No toy projects:** Code examples and case studies must reference production-grade concerns (RBAC, connection pooling, race conditions).
- **Trade-off Analysis:** Every architectural decision (e.g., choosing Firestore over PostgreSQL) must include an honest assessment of its drawbacks.
- **Actionable Outcomes:** Articles should end with concrete "Lessons Learned" rather than generic conclusions.
