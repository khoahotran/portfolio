---
title: "The Hidden Costs of Firebase Cloud Functions"
date: "2026-08-28"
tags: ["serverless", "trade-offs"]
related: ["field-notes/why-i-chose-firebase-functions-over-cloud-run"]
summary: "A follow-up to the field note on choosing Firebase Functions over Cloud Run: two costs the concurrency model doesn't advertise on its own."
---

The [field note on choosing Firebase Functions over Cloud Run](/field-notes/why-i-chose-firebase-functions-over-cloud-run)
covered *why* SeensioGO stayed on Firebase Functions Gen 2, and touched cold starts and pricing at
the level a decision review needs. It didn't dig into two costs that only show up once you look at
the exact configuration that decision shipped with — both visible in that article's own code, not
hypothetical.

> [!NOTE]
> This is a deeper look at the same real configuration, not a reversal of that decision. Nothing
> here argues Cloud Run would have been better — it argues the Firebase Functions Gen 2 concurrency
> model has a cost shape worth understanding before you tune it, which the original review didn't
> need to go into.

## Cost 1: Cold Start Is Two Costs Stacked, Not One

"Cold start" usually gets discussed as a single number — the time before an instance can serve its
first request. For a NestJS app on Firebase Functions, that number is actually two costs paid in
sequence, and only one of them is about the platform:

```typescript
const bootstrapPromise = createFunctionHandler();

export const api = onRequest({ /* ... */ }, async (req, res) => {
  await bootstrapPromise;
  expressServer(req, res);
});
```

1. **Platform cold start** — provisioning the underlying Cloud Run container, which Firebase
   Functions abstracts away entirely. This is the cost `minInstances: 1` (already used in the
   original config) buys you out of.
2. **Application bootstrap** — `NestFactory.create(AppModule, ...)` resolving the entire Nest
   dependency-injection graph: every module, provider, and controller in the app, instantiated in
   dependency order. This runs *after* the platform is ready, on every cold instance, and its cost
   scales with how large the module graph has grown — not with anything Firebase controls.

The `bootstrapPromise` pattern above is already the right fix for the *first* request on a cold
instance (later requests reuse the resolved promise). But it doesn't make the DI graph resolution
itself faster — it just avoids paying it twice. As a NestJS app's module count grows, `minInstances:
1` keeps the *platform* cost invisible while the *application* cost quietly grows underneath it,
unmeasured by the same traffic-pattern analysis that justified the config in the first place (which
looked at request latency, not instance boot time in isolation).

## Cost 2: Concurrency Changes the Connection-Pool Math, It Doesn't Remove It

The classic serverless-and-databases problem is well known: a traditional FaaS model spins up one
instance per concurrent request, so N concurrent requests means N separate connection pools hitting
your database — a number that scales with traffic, not with anything you configured.

Firebase Functions Gen 2's `concurrency: 80` setting (from the same config in the field note)
genuinely changes this shape for the better — it's a real advantage over the Gen 1 / classic-Lambda
model, not just a knob:

```typescript
export const api = onRequest({
  region: 'asia-east1',
  memory: '1GiB',
  minInstances: 1,
  maxInstances: 10,
  concurrency: 80, // up to 80 concurrent requests share ONE instance, ONE connection pool
}, async (req, res) => {
  await bootstrapPromise;
  expressServer(req, res);
});
```

Because up to 80 concurrent requests share a single Node.js process, they share a single
connection pool too — the classic per-invocation pool explosion doesn't happen within one instance.
The cost that remains is one dimension smaller, not zero: total connections still scale with
**`maxInstances` × pool size**, not with concurrent *requests*. That's a real, meaningful
improvement — but `maxInstances: 10` is still 10 independent pools the moment traffic scales past
what one instance's 80-request concurrency can absorb, and nothing in the platform stops
`maxInstances` from being raised later (to handle a traffic spike) without anyone re-checking it
against the database's actual `max_connections`. The pricing section of the original field note
compared invocation-billing formulas in the abstract; it didn't include this arithmetic, because at
the traffic level that review was evaluating, `maxInstances` never came close to being the
bottleneck. It's the kind of assumption that's correct until traffic changes and nobody revisits it.

## What This Changes

Nothing in the original decision. Firebase Functions Gen 2's concurrency model is still the right
call for the reasons the field note gave — it's cheaper, operationally simpler, and its
per-instance connection sharing is a genuine improvement over the Gen 1 model it's usually compared
against. What changes is what "done" means for that configuration: `minInstances`/`maxInstances`
aren't a one-time tuning exercise, they're two numbers whose correctness depends on the DI graph
size and the database's connection limit staying roughly where they were when the numbers were
chosen — and neither of those is something the platform will warn you about drifting.
