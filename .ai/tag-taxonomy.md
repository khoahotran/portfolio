# Tag Taxonomy

Canonical vocabulary for `content/**/*.md`'s `tags:` frontmatter. Enforced at build time:
`scripts/build-search-index.mjs` fails the build if any article uses a tag outside this list, the
same way it already fails on a bad `related:` reference. See `.ai/decision-log.md` Decision 15.

## Why this exists

Before this document, the corpus had accumulated **92 distinct tags across 38 articles, with 56
(61%) used exactly once** — measured, not estimated. A tag used once cannot group anything; it's
noise wearing the shape of a category. `/tags/:tag` (see `.ai/phases/phase-5.md` §5.5) is only
useful if a tag reliably means something across multiple articles.

## Rules for adding a tag here

1. It must already apply to **2+ articles**, or be a genuinely load-bearing single-instance concept
   this portfolio is actively building toward (e.g. `spec-driven-development` — PFM is the first of
   what the roadmap expects to be several spec-driven pieces).
2. Prefer the *broader* correct term over a *narrower* precise one when the narrower one would
   otherwise sit alone — `redis` over `redis-streams`, `security` over `policy-engine`. The lost
   precision is recoverable from the article's own prose; the tag's job is grouping, not describing.
3. A technology-specific tag (`bullmq`, `nestjs`) folds into its category (`queues`, `typescript`)
   unless the technology itself is the article's subject across multiple pieces.

## Canonical tags, by category

**Languages** — `go` · `typescript` · `python`

**Datastores** — `postgresql` · `firestore` · `redis`

**Patterns** — `event-sourcing` · `cqrs` · `saga-pattern` · `distributed-systems` · `idempotency` ·
`security` (absorbs auth, authorization, rbac, policy-engine)

**Infra / Messaging** — `grpc` · `kafka` · `queues` (absorbs pubsub, messaging, async-jobs, workers,
bullmq, redis-streams as a pattern, scaling)

**Observability** — `opentelemetry` · `observability` (absorbs tracing, jaeger)

**Architecture** — `architecture` · `system-design` · `trade-offs` · `adr` (absorbs research) ·
`api-design` (absorbs api-gateway, graphql, protobuf) · `serverless` (absorbs firebase, gcp,
firebase-functions, system-architecture)

**Frontend** — `react` · `frontend-architecture` (absorbs jamstack, vite, tailwind, nextjs,
server-actions, mermaid, markdown)

**Quality** — `accessibility` (absorbs wcag) · `testing` (absorbs debugging) · `seo`

**Domain** — `fintech` (absorbs finance, banking, transactions, atomic-operations, nosql-as-domain) ·
`hft` · `search` (absorbs algolia, geolocation) · `machine-learning`

**Process** — `incident-response` (absorbs release-engineering, devops, sre, lessons,
engineering-management) · `spec-driven-development` · `benchmark` (absorbs experiment, simulation,
capacity-planning, throughput, performance, scalability, concurrency, language-comparison,
interactive-demo)

35 tags. That's above the ~20-25 the roadmap's original note guessed at — real content breadth
justified landing here rather than force-merging `hft` and `fintech`, or `go`/`typescript`/`python`
into one `languages` tag, into buckets too broad to mean anything. Still a 62% reduction from 92, and
every tag above now groups 2+ articles except `spec-driven-development` — see rule 1.

## Adding a new tag

Check this list first. If the concept genuinely isn't covered, add it here in the same edit that
adds it to a `tags:` field — don't let a new singleton tag land in `content/` first and get folded in
later. If you're unsure whether something is a new tag or an existing category, prefer folding it in;
the build failing on an unlisted tag is meant to force this conversation before publish, not after.
