# Portfolio Context

## Portfolio Vision
This repository is the personal engineering portfolio of **Khoa Tran**. It is an interactive, evidence-first
engineering showcase: deep, narrative-driven case studies, architectural deep-dives, and interactive
laboratories that let a reader interrogate a claim rather than take it on faith.

It moves beyond standard "resume" bullet points. The argument it makes is not *"I am senior"* — it is
*"here is the reasoning, here are the trade-offs I accepted, here is the code, and here is how you can
check it yourself."* Depth of reasoning is the evidence. The reader draws their own conclusion about level.

## Career Stage (be accurate about this)
Khoa is an **early-career backend / distributed-systems engineer** who works and documents at an unusually
senior level of rigor:

- BSc Computer Science, HCMUT — expected Jun 2026. MSc Computer Science, HCMUT — Jan 2026 to Dec 2027.
- Professional experience: JK Technologies, Jun 2025 to present (intern -> part-time -> full-time),
  shipping production backend services (SeensioGO, Jujuja).
- Self-directed engineering projects built to production standards: Aegis, Event-Driven Core Banking, PFM.

Never write copy — on the site or in these docs — that claims or implies a Staff/Principal *title*, years of
experience that don't exist, or team leadership that didn't happen. That claim is trivially checkable against
the timeline on `/about`, and a reader who catches it discounts everything else on the site, including the
parts that are genuinely strong. The technical depth needs no inflation to be impressive for this stage; the
inflation is the only thing that can damage it.

## Target Audience
Written for engineers who will actually read the trade-offs:

- **Hiring engineers and engineering managers:** assessing whether this person reasons carefully, ships, and
  understands what they built well enough to explain its limits.
- **Backend / distributed-systems peers:** looking for real trade-off analysis and reproducible benchmarks,
  not tutorials.
- **Technical recruiters:** needing to see concrete, attributable evidence of shipped work quickly.

## Provenance Is Mandatory
Every project and every number must make its own nature unmistakable, without the reader having to infer it:

- **Professional work** — shipped at JK Technologies (SeensioGO, Jujuja).
- **Self-directed engineering projects** — designed and built solo to production standards (Aegis,
  Event-Driven Core Banking, PFM).
- **Academic / research** — built in a university research context (QuantAlpha).
- **Coursework / team projects** — university group work (Tesell, Smart Printing Service).

The same rule applies to numbers: a metric states the system it was measured on, and a benchmark states
whether it was **measured** (with environment and a runnable harness) or **modeled** (with the formula shown).
See `.ai/prompts/benchmark-study.md`.

## Engineering Domains
The portfolio primarily showcases work in:
- **Distributed Systems:** handling state, consistency, and asynchronous communication across services.
- **Core Banking / FinTech:** transactional guarantees, Event Sourcing, Saga patterns, and idempotency.
- **High-Frequency Trading (HFT):** low-latency data ingestion and deterministic performance
  (academic research context — label it as such).

## Expertise Areas
- **Backend Languages:** Go (Golang), TypeScript (Node.js/NestJS), Python (for ML pipelines).
- **Databases:** PostgreSQL, Firestore, Redis, MongoDB.
- **Infrastructure:** Kafka/Redpanda, gRPC, OpenTelemetry, Docker, GCP.
- **Architecture Patterns:** CQRS, Event Sourcing, Saga, Hexagonal Architecture, Domain-Driven Design (DDD).

## Narrative Goals
The portfolio must communicate that the author is an engineer who:
- Builds for **resilience and failure** (designing systems that expect network partitions).
- Relies on **boring technology** (PostgreSQL) when possible, but uses specialized tools (Redis Streams,
  Kafka) when the domain demands it — and says which.
- Communicates complex ideas effectively using **visualizations** (Mermaid, C4).
- Values **measurability** — hence the interactive laboratories, and hence the discipline of never
  presenting a model as a measurement.

## Maturity Goals
Every artifact in this repository must hold up to a careful reader:
- **No toy projects:** case studies must engage production-grade concerns (RBAC, connection pooling,
  race conditions, idempotency).
- **Trade-off analysis:** every architectural decision must include an honest assessment of its drawbacks
  and the scale at which it breaks.
- **Honest scope:** when the shipped code does less than the ideal design, say so in the article. Several
  existing pages already do this well (see `content/projects/aegis.md` on rate limiting and graceful
  shutdown) — that candor is a feature, not a weakness, and must be preserved.
- **Actionable outcomes:** articles end with concrete "Lessons Learned," not generic conclusions.
