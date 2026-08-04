# Content Roadmap

This document prioritizes the future evolution of the portfolio. AI agents should consult this roadmap when asked to generate new content or labs.

## 🟢 Completed (Phase 1-2)
- [x] Initial JAMstack routing and custom Markdown engine.
- [x] About page with career timeline and engineering philosophy.
- [x] Flagship Project Hubs (Aegis, Core Banking, QuantAlpha).
- [x] Benchmark Interactive Labs (Redis vs BullMQ, Go vs TS, DB Replay).
- [x] Knowledge Graph and Ecosystem visualization.
- [x] AI Operating System governance `.ai/`.

## 🟡 In Progress / Up Next (Phase 3)
*These are the highest priority items for the next AI session.*

1. **ADR: Tracing vs Metrics in Microservices**
   - **Type:** Research / ADR
   - **Goal:** A short write-up on when to use OpenTelemetry tracing vs Prometheus metrics, referencing the Aegis project.
2. **Interactive Lab: Rate Limiting Algorithms**
   - **Type:** React Experiment
   - **Goal:** Build a visualizer comparing Token Bucket vs Leaky Bucket vs Fixed Window rate limiting algorithms.
3. **Blog: The Hidden Costs of Cloud Functions**
   - **Type:** Blog Post
   - **Goal:** Discuss cold starts and connection pooling issues encountered during the Core Banking project on Firebase.

## 🔴 Future Backlog (Phase 4+)
- **System Design:** Designing a Global API Gateway (Kong/Envoy).
- **Interactive Lab:** Gossip Protocol Visualizer (simulating node discovery).
- **Case Study Expansion:** Add a "Deployments & CI/CD" section to the QuantAlpha case study.
- **Experiment:** WebSockets vs Server-Sent Events (SSE) benchmark.

## 💡 Missing Content Gaps
- We currently lack content specifically focused on **Database Indexing optimization** (e.g., B-Tree vs BRIN in PostgreSQL).
- We have no articles discussing **Frontend Architecture** (despite having built a custom JAMstack framework for this very portfolio). This could be a meta-post.
