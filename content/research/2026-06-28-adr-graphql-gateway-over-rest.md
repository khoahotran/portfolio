---
title: "ADR: Choosing a GraphQL Gateway Over REST for Aegis"
date: "2026-06-28"
tags: ["adr", "graphql", "api-gateway", "architecture", "go"]
summary: "An Architecture Decision Record detailing why Aegis uses a GraphQL API Gateway to aggregate internal gRPC microservices instead of a traditional REST API."
reading_time: "7 min"
---

## Context and Problem Statement

The Aegis authorization platform is internally composed of multiple Go microservices (Identity, Policy, Audit) communicating via gRPC. 

However, external clients (web applications, mobile apps, and other downstream systems) need to interact with Aegis to perform actions like registering users, logging in, requesting password resets, and checking permissions.

We need an API Gateway to act as the single entry point for these external clients. The gateway must route requests, aggregate data from multiple backend gRPC services, and handle cross-cutting concerns like rate limiting and initial authentication.

The choice came down to two architectural styles for the external-facing gateway:
1. **REST** (using a framework like Gin or Chi in Go).
2. **GraphQL** (using `gqlgen` in Go).

## Considered Options

### Option 1: REST Gateway
A standard RESTful JSON API. For example, a `POST /api/v1/auth/login` endpoint would map internally to the `IdentityService.AuthenticateUser` gRPC method.

**Pros:**
- Ubiquitous; every client knows how to consume REST.
- Trivial to cache at the edge (CDN/Cloudflare) using standard HTTP verbs and status codes.
- Simpler mental model for routing (URL path maps cleanly to gRPC service).

**Cons:**
- **Over-fetching / Under-fetching:** Clients receive fixed payloads. If the mobile app only needs a `token` but the web app needs the `token` and `user.profile.permissions`, REST requires either two endpoints or sending a bloated payload.
- **Multiple Round Trips:** If a client needs to fetch the user profile and their associated policies, it requires calling `/users/me` and then `/users/me/policies`.
- **Documentation Drift:** Requires maintaining OpenAPI (Swagger) specs alongside gRPC Protobuf definitions.

### Option 2: GraphQL Gateway
A single `/graphql` endpoint where clients specify exactly what data they need, and the gateway resolves the query by fanning out to the appropriate gRPC backends.

**Pros:**
- **Client-Driven Payloads:** The client dictates the shape of the response. Mobile can request less data than Web.
- **Aggregation:** A single GraphQL query can resolve `User` data from the Identity service and `Permissions` data from the Policy service in one network request from the client.
- **Strong Typing:** GraphQL's schema is strongly typed, acting as a strict contract between frontend and backend.
- **Tooling:** Excellent developer experience for clients using tools like Apollo or Relay.

**Cons:**
- **Complexity in Go:** Writing GraphQL resolvers in Go (via `gqlgen`) requires boilerplate to map GraphQL types to generated Protobuf structs.
- **Caching Difficulty:** Since everything is a `POST /graphql`, edge caching (CDN) is much harder compared to REST GET requests.
- **N+1 Problem:** Naive GraphQL resolvers can trigger N+1 gRPC calls if not batched properly.

## Decision Outcome

**Decision:** We chose **Option 2: GraphQL Gateway (via `gqlgen`)**.

### Rationale

The decisive factor was **UI data aggregation**. Aegis is not just a token issuer; it is a full Identity and Policy platform. Downstream clients frequently need to fetch a user, their associated metadata, and their specific permissions for a UI view all at once.

With REST, this required multiple round trips from the client to the gateway. With GraphQL, the client issues a single query:

```graphql
query GetUserProfile {
  me {
    id
    email
    profile {
      firstName
      lastName
    }
    permissions(resource: "dashboard") {
      canRead
      canWrite
    }
  }
}
```

The Aegis GraphQL gateway parses this query and efficiently executes it:
1. Calls the **Identity gRPC Service** for the `me` and `profile` fields.
2. Concurrently calls the **Policy gRPC Service** for the `permissions` fields.
3. Stitches the results together and returns exactly what was requested.

### Mitigation of Cons

- **N+1 Problem:** We implemented the `dataloader` pattern in the Go gateway to batch concurrent requests to the internal gRPC services.
- **Caching:** While edge caching is lost, policy checks change rapidly. We rely on the internal Redis cache at the Policy Service layer rather than edge caching.
- **Boilerplate:** We use `gqlgen`'s schema-first code generation to automatically bind GraphQL types to our generated Protobuf structs where possible, minimizing manual mapping code.

## Consequences

- Frontend teams have a strictly typed GraphQL schema and excellent tooling (GraphiQL) to explore the API.
- The Go gateway code is strictly a routing and aggregation layer. It contains zero business logic, ensuring concerns remain cleanly separated in the microservices.
- We accepted that CDN-level caching is not viable for this architecture, placing more load on internal caches (Redis).
