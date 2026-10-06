// Canonical tag vocabulary for content/**/*.md's `tags:` frontmatter.
//
// This is the normative list — see .ai/tag-taxonomy.md for the rationale, the categorization, and
// the rule for adding a new tag. Kept here rather than only in that prose doc so it can actually be
// enforced: build-search-index.mjs fails the build if any article uses a tag not in this set, the
// same way it already fails on a bad `related:` reference (see .ai/decision-log.md Decision 15).
//
// Migrated from 92 tags (56 used exactly once) down to this list on 2026-08-27 — see Decision 15
// for the measurement and the merge rules applied.

export const CANONICAL_TAGS = new Set([
  // Languages
  'go', 'typescript', 'python',
  // Datastores
  'postgresql', 'firestore', 'redis',
  // Patterns
  'event-sourcing', 'cqrs', 'saga-pattern', 'distributed-systems', 'idempotency', 'security',
  // Infra / Messaging
  'grpc', 'kafka', 'queues',
  // Observability
  'opentelemetry', 'observability',
  // Architecture
  'architecture', 'system-design', 'trade-offs', 'adr', 'api-design', 'serverless',
  // Frontend
  'react', 'frontend-architecture',
  // Quality
  'accessibility', 'testing', 'seo',
  // Domain
  'fintech', 'hft', 'search', 'machine-learning',
  // Process
  'incident-response', 'spec-driven-development', 'benchmark',
]);
