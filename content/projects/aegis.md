---
title: "Aegis: High-Performance Auth & Authorization Platform"
date: "2026-04-10"
tags: ["go", "grpc", "microservices", "redis", "kafka", "opentelemetry"]
summary: "A modular, high-performance Identity and Policy microservice platform in Go, featuring sub-5ms RBAC evaluations and distributed tracing."
reading_time: "10 min"
---

## Project Foundation

**Business Problem:** Monolithic authorization logic becomes a bottleneck as an organization scales. When multiple teams build distinct microservices, forcing them to reimplement JWT validation and Role-Based Access Control (RBAC) leads to security inconsistencies and duplicated effort.

**Goals:**
1. Centralize Identity (Authentication) and Policy (Authorization).
2. Achieve **sub-5ms** authorization checks so downstream services aren't penalized.
3. Provide a unified GraphQL API gateway for clients, while keeping internal service-to-service communication on high-speed gRPC.
4. Guarantee a 100% reliable audit log for compliance.

## Architecture

Aegis is built using a Hexagonal Architecture (Ports and Adapters) pattern within each microservice to decouple domain logic from infrastructure.

### C4 Context Diagram

```mermaid
C4Context
  title System Context for Aegis
  Person(client, "Web/Mobile Client", "Consumes the GraphQL API")
  System(aegis, "Aegis Auth Platform", "Handles Identity, RBAC, and Audit Logging")
  System_Ext(downstream, "Downstream Services", "Business services that rely on Aegis for AuthZ")
  
  Rel(client, aegis, "Authenticates & queries via GraphQL", "HTTPS")
  Rel(aegis, downstream, "Routes authenticated requests", "gRPC")
  Rel(downstream, aegis, "Verifies RBAC permissions", "gRPC")
```

### C4 Container Diagram

```mermaid
C4Container
  title Container Diagram for Aegis
  
  Container(gateway, "API Gateway", "Go, gqlgen", "GraphQL edge router")
  Container(identity, "Identity Service", "Go, gRPC", "Manages users, Argon2id hashing, issues JWTs")
  Container(policy, "Policy Service", "Go, gRPC", "Evaluates RBAC permissions")
  Container(audit, "Audit Worker", "Go, Kafka Consumer", "Persists compliance logs")
  
  ContainerDb(db_users, "Identity DB", "PostgreSQL", "Stores user credentials")
  ContainerDb(cache_policy, "Policy Cache", "Redis", "Caches RBAC graphs for sub-5ms lookups")
  ContainerDb(queue_audit, "Event Bus", "Redpanda / Kafka", "High-throughput audit stream")
  ContainerDb(db_audit, "Audit DB", "PostgreSQL", "Append-only compliance ledger")
  
  Rel(gateway, identity, "gRPC: Login / Register")
  Rel(gateway, policy, "gRPC: Check Permission")
  Rel(identity, db_users, "Reads/Writes")
  Rel(policy, cache_policy, "Reads O(1)")
  Rel(identity, queue_audit, "Publishes 'LoginSuccess'")
  Rel(queue_audit, audit, "Consumes events")
  Rel(audit, db_audit, "Persists logs")
```

## Engineering Decisions

### 1. gRPC vs REST for Internal Traffic
**Decision:** All internal microservice communication runs on gRPC.
**Trade-offs:** 
- *Pros:* Protobuf serialization is drastically faster and more compact than JSON. Strongly typed contracts prevent runtime parsing errors. HTTP/2 multiplexing reduces connection overhead.
- *Cons:* Harder to debug with `curl`.
- *Mitigation:* We use `grpcurl` and expose a GraphQL Gateway to the frontend, so web clients never have to speak gRPC directly.

### 2. Lock-Free RBAC Cache
**Decision:** The Policy Service evaluates permissions using a Redis-backed cache instead of querying PostgreSQL on every request.
**Implementation:** Permissions are flattened into a graph and cached as Redis Sets. An authorization check is a single `SISMEMBER user:123:permissions read_orders` command, taking < 1ms.

### 3. Asynchronous Audit Logging
**Decision:** Writing to an audit log synchronously during a login request adds latency and ties availability to the audit database.
**Implementation:** We implemented an Event-Driven architecture using Redpanda (Kafka). The Identity service publishes an `AuthEvent` and returns immediately. A separate Audit Worker consumes the topic and batch-inserts into PostgreSQL.

## Production Engineering

- **Rate Limiting:** A Token Bucket algorithm is implemented in Redis at the Gateway layer to prevent brute-force attacks.
- **Distributed Tracing:** OpenTelemetry is instrumented across all gRPC calls. Every request has a `trace_id` injected into the context, allowing us to visualize the exact latency breakdown between the Gateway, Identity Service, and Database in Jaeger.
- **Graceful Shutdown:** All Go servers trap `SIGTERM`, stop accepting new connections, and drain existing requests before exiting, ensuring zero-downtime Kubernetes rollouts.

## Reflection

**Lessons Learned:**
- **Caching is hard:** Flattening the RBAC graph into Redis was highly performant for reads, but making sure the cache invalidates correctly when a user's role is changed required complex distributed locking mechanisms.
- **Tracing is non-negotiable:** Without OpenTelemetry, debugging latency spikes across 3 microservices would have been impossible. It must be implemented from day one, not as an afterthought.

**Future Evolution:**
I plan to migrate the API Gateway from a custom Go GraphQL server to an Apollo Federation setup to allow downstream services to seamlessly extend the GraphQL schema.
