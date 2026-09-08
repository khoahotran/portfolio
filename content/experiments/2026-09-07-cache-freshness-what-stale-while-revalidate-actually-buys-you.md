---
title: "Cache Freshness: What Stale-While-Revalidate Actually Buys You"
date: "2026-09-07"
tags: ["system-design", "trade-offs", "benchmark"]
related: ["system-design/system-design-trade-offs-in-practice"]
summary: "Three real cache-freshness policies run against the same origin outage — TTL-blocking errors, stale-while-revalidate never blocks at all, and stale-if-error sits in between, paying for a synchronous origin attempt even when it ends up serving the same stale content SWR would have served for free."
---

"Add caching" and "add stale-while-revalidate" get talked about almost interchangeably, as if SWR
is just a caching header you turn on. What it actually changes is what happens the moment your
origin goes down while a cache entry is expired — and that moment is exactly where the three common
freshness policies stop behaving the same way. The
[interactive lab](/labs/cache-freshness) runs all three against the same origin outage, tick by
tick, so the difference is something you watch happen, not something asserted in prose.

<div class="mt-8 mb-12">
  <a href="/labs/cache-freshness" class="lab-cta-inverse">
    Try the Interactive Cache Freshness Lab
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </a>
</div>

## Three Policies, Same Timeline

All three read from the same cache entry, obeying the same TTL, against the same origin-update
schedule and the same origin outage window (`src/labs/cacheFreshness.ts`). The only thing that
differs is what each one does once the entry's TTL has expired:

- **TTL, blocking** — the default most people picture. Fresh: instant. Expired: block the request
  on a synchronous origin fetch. If the origin happens to be down at that exact moment, there is no
  fallback — the request errors.
- **Stale-while-revalidate (SWR)** — fresh: same as above. Within a grace window past TTL: serve the
  stale cached content *immediately*, and best-effort refresh the cache in the background for
  whoever asks next. This request never blocks and never depends on the origin being reachable at
  all.
- **Stale-if-error (SIE)** — fresh: same as above. Expired: it *always* attempts a synchronous
  origin fetch, unlike SWR. If that fetch succeeds, serve fresh. If it fails and the entry is still
  within its own grace window, fall back to the stale cached content instead of erroring.

## The Finding: SWR and SIE Both "Handle" the Outage — at Very Different Cost

Run all three against an origin outage that starts mid-simulation and lasts past several TTL
expirations, and the difference in behavior isn't subtle:

| Policy | During the outage | Cost of that behavior |
|---|---|---|
| TTL-blocking | **Errors** on every expired request | Nothing served at all |
| Stale-while-revalidate | Serves stale, **instantly**, every time | Never pays origin latency to find out the origin is down |
| Stale-if-error | Serves stale, **after paying origin latency** | Attempts and fails the origin fetch first, every single time, before falling back |

`cacheFreshness.test.ts` proves the SWR/SIE cost difference directly: given the identical outage
window, SWR's served-stale requests report the fast cache-hit latency every time, while SIE's report
the full origin-fetch latency — because SIE only finds out the origin is unreachable by actually
trying it, request by request, for as long as the outage lasts. SWR never tries at all once it's
already decided to serve stale; its background refresh attempt (which *does* try the origin) doesn't
block the request that triggered it either way.

> [!NOTE]
> This is the real trade-off stale-if-error makes for its stronger guarantee (always attempt fresh
> content first): every single request during an outage pays the full synchronous origin-timeout
> cost, one at a time, for however long the outage lasts — a real, multiplied latency cost SWR
> simply never incurs, in exchange for content that's *marginally* fresher only in the case where
> the origin happens to recover mid-outage between two individual requests.

## Both Have a Point Where They Give Up

Neither SWR nor SIE is a permanent shield — both eventually fall back to the same blocking behavior
`ttl-blocking` has all along, once their own grace window elapses without a successful refresh. An
outage that outlasts the grace window still produces errors on every policy; the grace window only
buys time, proportional to how long you configure it, not immunity. Sizing that window is itself the
real decision — too short and a routine origin blip becomes user-visible errors; too long and
consistently-stale content (e.g., prices, inventory counts) gets served well past the point where
"slightly old" becomes "actually wrong."

## What Actually Decides It

- **Use stale-while-revalidate when serving something is always better than blocking to check** —
  a blog post, a product description, a static asset. The cost of occasionally-stale content is low,
  and the cost of ever blocking on the origin is not worth paying.
- **Use stale-if-error when you specifically want "prefer fresh, but survive an outage"** and can
  tolerate every expired request paying a real synchronous origin-timeout cost during that outage —
  appropriate when freshness matters enough to always attempt it, but total failure is worse than
  temporarily-stale data.
- **Plain TTL-blocking is the right default only when stale data is worse than an outright error** —
  genuinely rare in practice, which is exactly why SWR has become the more common default despite
  being the "weaker-sounding" policy on paper.
