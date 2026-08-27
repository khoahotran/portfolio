# Engineering Principles

This document extracts the core engineering philosophy of the portfolio's author. When generating new content or code, you must align with these principles.

## 1. Boring Technology First
*Innovation tokens should be spent on the product domain, not the infrastructure.* 
We default to battle-tested technologies like PostgreSQL, Go, and standard REST/gRPC unless the specific scale or latency requirements mandate otherwise. When choosing a specialized tool (like Redis Streams or Kafka), the rationale must be explicitly justified by systemic needs (e.g., throughput, decoupling).

## 2. Design for Failure
*Everything fails all the time.*
Systems showcased here are designed with failure as a primary consideration. 
- Retry strategies with exponential backoff and jitter.
- Circuit breakers and fallback mechanisms.
- Saga patterns for distributed transactions.
- Idempotency keys on all state-mutating endpoints.

## 3. Explicit Trade-offs
*There are no silver bullets, only trade-offs.*
Every architectural decision (ADR, Case Study, Field Note) must honestly document what was sacrificed to achieve the desired outcome. E.g., Event Sourcing provides a perfect audit log but sacrifices simple O(1) query capabilities without complex projections.

## 4. Observability by Default
*If you can't see it, you can't fix it.*
Metrics, distributed tracing (OpenTelemetry), and structured logging are not afterthoughts; they are built into the core mesh of the showcased architectures (e.g., Aegis platform).

## 5. Measurable Engineering (Reproducibility)
*Don't guess, measure.*
This principle is embodied by the `/experiments` interactive laboratories. We prefer to show benchmark charts (e.g., Go vs TS memory footprint, DB Event Replay speeds) rather than simply stating performance claims.

## 6. Visual Communication
*A diagram is worth a thousand lines of code.*
We use C4 Models, Sequence Diagrams, and State Machines to convey architecture before diving into implementation details. If a reader cannot follow the design from the diagrams alone, the write-up is not finished.
