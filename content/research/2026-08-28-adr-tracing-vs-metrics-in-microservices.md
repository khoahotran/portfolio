---
title: "ADR: Tracing vs Metrics for Observability in Aegis"
date: "2026-08-28"
tags: ["adr", "observability", "opentelemetry", "trade-offs"]
related: ["projects/aegis", "research/distributed-tracing-with-opentelemetry-and-jaeger"]
summary: "An Architecture Decision Record on why distributed tracing and metrics answer different questions in Aegis, and which one should gate a page for what."
---

## Context and Problem Statement

[Aegis](/projects/aegis) already has [distributed tracing](/research/distributed-tracing-with-opentelemetry-and-jaeger)
via OpenTelemetry and Jaeger, instrumented across all four services (API Gateway, Identity, Policy,
Audit Worker). That answers "why was *this specific request* slow?" It does not answer "is the
system, in aggregate, healthy right now?" — and those are genuinely different questions that a
single signal type cannot cheaply answer both of.

The concrete trigger for writing this down: the Policy Service is designed for **sub-5ms RBAC
evaluations**. A trace can show that one particular evaluation took 40ms. It cannot cheaply answer
"what fraction of evaluations this hour exceeded 5ms?" — answering that from traces means querying
and aggregating over however many traces were sampled, which is both expensive to compute on demand
and, at any realistic production sampling rate below 100%, statistically incomplete.

## Considered Options

### Option 1: Tracing Only

Keep relying on the existing OTel/Jaeger instrumentation for all observability questions, including
aggregate ones (a Jaeger UI query grouped by service and time range can approximate a dashboard).

**Pros:**
- No new infrastructure — the OTel SDK and Jaeger backend already exist.
- One instrumentation surface to maintain.

**Cons:**
- Production tracing is sampled (see the linked article's sampling-strategy section) — a 5%
  sample cannot answer "what fraction of *all* requests exceeded 5ms" without a large statistical
  error band, and the error gets worse for anything that isn't a common-case request.
- Aggregating traces into a rate/error/duration view means a query-time join over a trace store on
  every dashboard refresh — that's viable for ad-hoc investigation, not for a always-on alert.
- Traces are expensive to store at high cardinality; keeping enough of them to make aggregate
  queries statistically meaningful pushes storage cost in the wrong direction for a signal whose
  actual job is causal drill-down, not counting.

### Option 2: Metrics Only

Drop tracing, instrument Prometheus counters and histograms for the same four services.

**Pros:**
- Cheap to collect at 100% coverage — a counter increment costs next to nothing compared to a full span.
- Native fit for alerting (Prometheus + Alertmanager) and dashboards (Grafana), the standard
  RED-method view (Rate, Errors, Duration) per service.

**Cons:**
- A histogram can tell you *that* P99 latency degraded at 14:32 — it cannot tell you *which*
  downstream call caused it. Debugging a specific incident degrades back to log correlation, the
  exact problem tracing was adopted to solve in the first place.
- Losing the causal chain across the GraphQL Gateway → gRPC → Kafka → Audit Worker hop sequence
  (see the tracing article's example flamegraph) would be a real regression for exactly the
  multi-hop debugging Aegis's architecture makes routine.

### Option 3: Both, Each for a Different Job

Keep tracing for causal, per-request debugging. Add Prometheus metrics for aggregate,
always-on questions — counts, rates, and latency histograms — with tracing as the drill-down tool
once a metric flags something worth investigating.

**Pros:**
- Each signal answers the question it is cheap at: metrics for "is something wrong, in aggregate,
  right now" (100% sampled, cheap to store, alertable); tracing for "why is this one request slow"
  (expensive but doesn't need 100% sampling to be useful for a specific investigation).
- The Policy Service's sub-5ms claim becomes something an always-on histogram can actually
  validate continuously, rather than something inferred from spot-checking sampled traces.

**Cons:**
- A second instrumentation surface to maintain and keep consistent with the first (naming
  conventions, label/attribute cardinality discipline so metrics don't blow up on high-cardinality
  labels the way traces can tolerate).
- Requires standing up a Prometheus + Grafana stack (or equivalent) alongside the existing Jaeger
  deployment — genuine new infrastructure, not a reconfiguration of what's already running.

## Decision Outcome

**Decision:** Option 3 — metrics and tracing are complementary signals, not competing ones, and
Aegis should carry both once metrics are wired in.

### Rationale

The deciding factor is that "is the system healthy" and "why is this request slow" are different
questions with different cost profiles at different sampling rates. Metrics are cheap at 100%
coverage and answer the aggregate question; tracing is expensive but answers the causal question a
metric fundamentally cannot, because a histogram bucket has no memory of which downstream call it
came from. Neither signal can substitute for the other without giving up the property that makes it
useful.

The concrete allocation this ADR settles on:

- **Metrics** (RED method, per service): request rate, error rate, and a latency histogram —
  specifically, a histogram on the Policy Service's RBAC evaluation duration, since that's the
  claim ("sub-5ms") that currently has no way to be continuously validated rather than spot-checked.
- **Tracing** stays exactly as instrumented today: the tool reached for once a metric flags an
  anomaly (an error-rate spike, a P99 regression), to find *which* hop in the request chain caused
  it.

```go
// Illustrative shape of the Policy Service's evaluation histogram — this is the metric this ADR
// argues for, not code that exists in the Aegis repository yet. See the honesty note below.
var rbacEvalDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
    Name:    "aegis_policy_rbac_evaluation_duration_seconds",
    Help:    "Duration of RBAC permission evaluations.",
    Buckets: []float64{0.001, 0.002, 0.005, 0.01, 0.025, 0.05, 0.1},
}, []string{"result"}) // result: "allow" | "deny"

func (s *PolicyService) Evaluate(ctx context.Context, req *EvalRequest) (*EvalResponse, error) {
    start := time.Now()
    resp, err := s.evaluate(ctx, req)
    rbacEvalDuration.WithLabelValues(resultLabel(resp, err)).Observe(time.Since(start).Seconds())
    return resp, err
}
```

## Consequences

- **This ADR is a decision about direction, not a description of what's deployed.** Aegis has real
  OpenTelemetry tracing today (see the linked article for exactly what's instrumented and what
  isn't yet). It has no Prometheus metrics wired in — the histogram above is illustrative of the
  shape this ADR argues for, not code sitting in the repository. Same honesty convention as the
  linked tracing article's own "Current Aegis implementation" callout: stating the target design
  plainly is more useful than silence, as long as it isn't described as already shipped.
- Adding metrics means a second instrumentation surface (naming, label cardinality discipline) to
  keep consistent with the tracing one — not free, and worth planning for rather than bolting on
  ad hoc per service.
- The [Rate Limiting Algorithms lab](/experiments/rate-limiting-algorithms) is the other piece of
  Aegis's API Gateway that doesn't exist in the repository yet either — a limiter and this ADR's
  metrics layer would naturally share the same RED-method instrumentation once both land, since a
  rate limiter's admit/reject counts are themselves exactly the kind of aggregate signal this ADR
  argues metrics — not tracing — should carry.
