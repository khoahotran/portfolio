---
title: "System Design Trade-offs in Practice"
date: "2026-03-21"
tags: ["trade-offs", "architecture", "engineering-management"]
summary: "A structured framework to communicate architecture trade-offs with product, operations, and engineering teams."
---

## The Paralysis of Architecture Debates

In a rapidly growing engineering organization, architecture discussions often devolve into opinion-based deadlocks. One engineer might advocate for a highly scalable microservices approach, while another argues for the simplicity of a modular monolith.

The core problem is rarely technical incompetence; rather, it is the lack of a **shared evaluation criteria**. Teams debate solutions without first agreeing on the problem's constraints. Each project has different priorities regarding latency, reliability, delivery speed, and operating cost.

---

## The Four-Axis Scorecard

To resolve this paralysis, we introduced a standardized architecture scorecard based on four primary axes. Before diving into technical specifics (like Kafka vs. RabbitMQ or Postgres vs. MongoDB), the team must assign weights to these four axes for the given project:

```
[ PERFORMANCE ] ─────────────── [ RELIABILITY ]
(Latency & Throughput)           (ACID, Availability, SLO)
       │                                 │
       │                                 │
[ COMPLEXITY ]  ─────────────── [ COST ]
(Cognitive Load, Delivery)       (Infrastructure, Maintenance)
```

1. **Performance (Latency/Throughput)**: Does this system need to respond in sub-10ms, or is a 2-second background job acceptable?
2. **Reliability (Availability/Durability)**: Is it a financial ledger that requires strict ACID guarantees and five nines of availability, or a click-tracking analytics pipeline where losing 0.1% of data is fine?
3. **Complexity (Time-to-Market/Cognitive Load)**: Do we need to ship this in two weeks to capture a market opportunity, or are we building a core platform foundation designed to last five years?
4. **Cost (Infrastructure/Maintenance)**: What is our budget for scaling this system?

---

## Case Study: Architecture Options Comparison

Let's look at how we evaluated three different design options for a new **Loyalty Points System** using our 4-axis scorecard (scored from 1 to 10, where 10 represents the most optimal state - e.g., 10 on Complexity means lowest complexity, 10 on Cost means lowest cost).

### Scorecard Comparison Charts (ASCII)

```
OPTION A: Modular Monolith (PostgreSQL)
Performance: [████████░░] 8/10
Reliability: [█████████░] 9/10
Complexity:  [█████████░] 9/10 (Simple, fast MVP)
Cost:        [██████████] 10/10 (Low infra spend)

OPTION B: Serverless API (Firebase Functions + Firestore)
Performance: [██████░░░░] 6/10 (Cold starts)
Reliability: [████████░░] 8/10
Complexity:  [████████░░] 8/10
Cost:        [████████░░] 8/10 (Scales to zero)

OPTION C: Distributed CQRS (Go Services + Kafka + Mongo)
Performance: [██████████] 10/10 (Denormalized reads)
Reliability: [██████████] 10/10 (Highly redundant)
Complexity:  [██░░░░░░░░] 2/10 (High cognitive load)
Cost:        [████░░░░░░] 4/10 (Expensive clusters)
```

---

## Technical Documentation: The ADR Template

To keep these architectural choices documented and queryable, we mandate that every major architectural pivot includes an **Architectural Decision Record (ADR)**. Below is the standard template we use:

```markdown
# ADR-014: Loyalty Points Storage Strategy

## Context and Problem Statement
We are building the loyalty reward platform. We expect high concurrent read requests during campaigns, but point transactions must be strongly consistent. We need to decide on our database architecture.

## Decision Drivers
*   [D1] Must support transactional consistency for balance updates (No double spend).
*   [D2] Fast read times for customer balance pages (<100ms p95).
*   [D3] Team bandwidth is limited; must ship initial version in 3 weeks.

## Considered Options
1.  **Modular Monolith (Option A)**: Shared PostgreSQL database.
2.  **Distributed CQRS (Option C)**: Separate Write (Postgres) and Read (MongoDB) sync'd via Kafka.

## Decision Outcome
Chosen Option: **Option A (Modular Monolith)**.
*   **Why**: It scores 9/10 on Complexity (lowest complexity) and satisfies D3 (fast delivery). The relational ACID capabilities of PostgreSQL satisfy D1. While read performance is slightly lower than a CQRS system, we can mitigate this with Redis caching, postponing CQRS complexity until scale demands it.

### Scorecard Analysis
| Axis | Option A | Option C |
| :--- | :---: | :---: |
| **Performance** | 8/10 | 10/10 |
| **Reliability** | 9/10 | 10/10 |
| **Complexity** | 9/10 | 2/10 |
| **Cost** | 10/10 | 4/10 |

## Consequences
*   We will use raw SQL transactions for balance updates.
*   We must monitor database CPU utilization. If complex joins degrade read queries, we will introduce a cache before migrating to CQRS.
```

---

## Impact and Lessons Learned

Implementing this framework had a profound impact on our engineering culture:
- **35% Reduction in Cycle Time**: The decision cycle time for new architecture proposals dropped significantly.
- **Data-Driven Debates**: Instead of debating which technology was "coolest", conversations shifted to prioritizing the project's operational constraints.
- **Living History**: The resulting ADR directory became a valuable onboarding tool, explaining the *why* behind historical code structure decisions.

No architecture choice is best on all axes. By making the trade-offs explicit, we removed the ego from technical debates. Engineers stopped arguing about which technology was "better" in a vacuum and started discussing which solution best aligned with the business's current reality.
