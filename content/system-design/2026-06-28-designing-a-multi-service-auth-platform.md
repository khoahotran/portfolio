---
title: "Designing a Multi-Service Auth Platform: The Aegis Architecture"
date: "2026-06-28"
tags: ["system-design", "go", "grpc", "kafka", "architecture"]
summary: "A deep dive into Aegis, a high-performance authorization platform using gRPC microservices, a GraphQL gateway, Kafka audit logging, and OpenTelemetry."
reading_time: "15 min"
---

Authentication and authorization are often the first bottlenecks in a growing system. A monolithic auth service can quickly become a single point of failure and a scaling bottleneck, especially when policy evaluation happens on every single incoming request.

To address this, I built **Aegis**—a modular, high-performance auth platform designed around strict service boundaries, observability, and sub-millisecond policy decisions.

In this deep dive, I'll break down the system context, the internal container architecture, and the request flows for authentication and authorization.

## System Context (C4 Level 1)

Aegis acts as the front door for downstream domain services. It provides a unified GraphQL API to external clients while keeping internal communication strictly gRPC.

```mermaid
graph TD
    Client[Web / Mobile Clients] -->|GraphQL over HTTPS| Gateway(Aegis API Gateway)
    Gateway -->|gRPC| Identity(Identity Service)
    Gateway -->|gRPC| Policy(Policy Service)
    
    Identity -->|gRPC| Kafka[Redpanda/Kafka]
    Policy -->|gRPC| Kafka
    Kafka -->|Consume| Audit(Audit Service)
    
    Gateway -.->|Auth Header| Downstream[Downstream Domain Services]
    
    classDef external fill:#f8fafc,stroke:#cbd5e1,stroke-width:2px;
    classDef core fill:#f0fdf4,stroke:#86efac,stroke-width:2px;
    classDef storage fill:#eff6ff,stroke:#93c5fd,stroke-width:2px;
    
    class Client,Downstream external;
    class Gateway,Identity,Policy,Audit core;
    class Kafka storage;
```

## Container Architecture (C4 Level 2)

Breaking the system down further, Aegis consists of four distinct Go microservices, each with its own datastore and responsibility.

```mermaid
flowchart TB
    subgraph Aegis Platform
        Gateway[API Gateway\nGraphQL / Go]
        
        Identity[Identity Service\ngRPC / Go]
        Policy[Policy Service\ngRPC / Go]
        Audit[Audit Service\ngRPC / Go]
        
        DB_Id[(PostgreSQL\nIdentity)]
        DB_Pol[(Redis\nPolicy Cache)]
        DB_Audit[(PostgreSQL\nAudit Log)]
        
        Broker[[Kafka / Redpanda\nEvents]]
    end

    Client([External Client]) -->|GraphQL Query/Mutation| Gateway
    
    Gateway <-->|gRPC Auth| Identity
    Gateway <-->|gRPC Eval| Policy
    
    Identity <-->|SQL| DB_Id
    Policy <-->|Get/Set| DB_Pol
    
    Identity -.->|Pub: auth.events| Broker
    Policy -.->|Pub: policy.events| Broker
    
    Broker -.->|Sub: *.events| Audit
    Audit <-->|SQL| DB_Audit

    classDef service fill:#f0fdf4,stroke:#86efac,stroke-width:2px;
    classDef db fill:#eff6ff,stroke:#93c5fd,stroke-width:2px;
    classDef queue fill:#fef08a,stroke:#fde047,stroke-width:2px;
    
    class Gateway,Identity,Policy,Audit service;
    class DB_Id,DB_Pol,DB_Audit db;
    class Broker queue;
```

### 1. API Gateway (GraphQL)
The entry point. It translates GraphQL mutations (like `login`, `register`) into gRPC calls to the Identity service, and runs a GraphQL middleware that intercepts queries to check permissions against the Policy service.

### 2. Identity Service (gRPC)
Handles user lifecycle, password hashing using `Argon2id`, and JWT issuance. It owns the PostgreSQL database containing user credentials. 

### 3. Policy Service (gRPC)
An ultra-fast decision engine. It evaluates RBAC/ABAC rules. Since this service is queried on *almost every API call*, it uses Redis as an aggressive caching layer for policy decisions.

### 4. Audit Service (gRPC)
A passive consumer. Both Identity and Policy services drop events onto a Kafka topic asynchronously. The Audit service consumes these and persists them to its own PostgreSQL database for compliance reporting.

---

## Core Flows

Let's look at how the services interact during two critical paths: Login and Policy Evaluation.

### The Login Sequence

The login flow must verify credentials, issue a token, and reliably record the audit event without blocking the client.

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant GW as API Gateway (GraphQL)
    participant ID as Identity Service (gRPC)
    participant DB as PostgreSQL (Identity)
    participant K as Kafka
    
    Client->>GW: mutation { login(email, pass) }
    GW->>ID: gRPC: AuthenticateUser(email, pass)
    
    ID->>DB: SELECT hash FROM users WHERE email = ?
    DB-->>ID: Argon2id hash
    
    Note over ID: CPU-intensive hash verification
    
    alt Invalid Password
        ID-->>GW: gRPC Error: Unauthenticated
        GW-->>Client: 401 Unauthorized
        ID-X K: Publish (LoginFailed) asynchronously
    else Valid Password
        ID->>ID: Generate JWT Access & Refresh Tokens
        ID-)K: Publish (LoginSucceeded) asynchronously
        ID-->>GW: AuthResponse(Tokens)
        GW-->>Client: 200 OK + JWTs
    end
```

**Key Design Decisions:**
- **Asynchronous Audit:** The `Publish` to Kafka happens concurrently or in a detached goroutine. We do not want Kafka latency to impact the user's login time.
- **CPU Offloading:** `Argon2id` is deliberately slow. Scaling the Identity service horizontally handles the CPU pressure of concurrent logins.

### The Policy Evaluation Sequence

Policy checks are the highest-throughput operation in the platform. A cache miss here is expensive, so Redis is utilized aggressively.

```mermaid
sequenceDiagram
    autonumber
    participant GW as API Gateway (Interceptor)
    participant POL as Policy Service (gRPC)
    participant R as Redis (Cache)
    participant DB as PostgreSQL (Rules)
    
    GW->>POL: gRPC: CheckPermission(userID, "write", "article:123")
    
    POL->>R: GET perm:user_id:write:article_123
    
    alt Cache Hit
        R-->>POL: true / false
    else Cache Miss
        R-->>POL: nil
        POL->>DB: Evaluate complex RBAC/ABAC graph
        DB-->>POL: Result (e.g., true)
        POL->>R: SETEX perm:user_id:write:article_123 (TTL 5m)
    end
    
    POL-->>GW: true
```

**Key Design Decisions:**
- **Fail-Closed Default:** If Redis is down and PostgreSQL is overloaded, the Policy service defaults to `false` (Deny) to prevent accidental escalation.
- **Cache Invalidation:** When a user's roles change, the Identity service emits an event to Kafka. A separate worker consumes this and evicts the relevant Redis keys.

## Observability & OpenTelemetry

With four services and a message broker, distributed tracing is mandatory. Without it, debugging a failed login is a guessing game.

Aegis integrates OpenTelemetry (OTel) natively. The API gateway generates the root span and injects the trace ID into the gRPC metadata context.

Every subsequent gRPC hop extracts that context, adds child spans, and forwards it. The result is a unified trace in Jaeger that shows exactly how many milliseconds were spent in the Gateway, Identity Service, Argon2id hashing, and Kafka publishing.

## Next Steps

Aegis solves the structural problems of auth, but introduces new distributed systems challenges:
1. **Cache Invalidation:** Keeping the Policy Redis cache in sync with the source of truth.
2. **Kafka Delivery Guarantees:** Ensuring audit logs are never dropped if Kafka temporarily goes down (requiring the Transactional Outbox pattern).

For more on how the API surface was designed, read the ADR on [Why GraphQL Gateway over REST](/research/adr-graphql-gateway-over-rest).
