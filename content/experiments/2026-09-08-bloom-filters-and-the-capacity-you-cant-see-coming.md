---
title: "Bloom Filters and the Capacity You Can't See Coming"
date: "2026-09-08"
tags: ["distributed-systems", "trade-offs", "benchmark"]
related: ["experiments/consistent-hashing-and-the-rebalancing-nobody-notices", "experiments/hyperloglog-and-the-question-bloom-filters-cant-answer"]
summary: "Run a real bit-array Bloom filter — measure its false-positive rate against the closed-form formula, then overload it past design capacity and watch the rate climb for real, not just in a formula."
---

"Have I seen this key before?" is a question a lot of systems ask constantly — an SSTable deciding
whether to bother reading from disk, a CDN deciding whether an object might be cached anywhere, a
crawler deciding whether a URL is already visited. Answering it exactly means storing every key
somewhere, which doesn't scale past a point. A **Bloom filter** (Bloom, 1970) answers approximately
instead, in a fixed amount of space regardless of how many keys you insert — at the cost of an
asymmetric kind of wrongness: it can say "maybe" when the real answer is no, but it can **never**
say "no" when the real answer is yes. The [interactive lab](/labs/bloom-filter) runs a real
bit-array filter, not a formula, so both halves of that trade — the guarantee that never breaks,
and the accuracy that degrades in a specific, measurable way — are things you watch happen.

<div class="mt-8 mb-12">
  <a href="/labs/bloom-filter" class="lab-cta-inverse">
    Try the Interactive Bloom Filter Lab
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </a>
</div>

## The Structure

A Bloom filter is a fixed-size bit array of length `m`, plus `k` independent hash functions. Adding
an item sets `k` bits; checking an item asks whether all `k` of its bits are already set
(`src/labs/bloomFilter.ts`):

```
add(item):          for i in 0..k: bits[hash_i(item)] = true
mightContain(item):  every one of item's k bits set?  -> maybe present
                     any of them unset?                -> definitely absent
```

Real implementations don't run `k` genuinely separate hash algorithms — the lab uses the standard
**Kirsch-Mitzenmacher construction**, deriving all `k` positions from exactly two real hash
computations: `h_i(x) = h1(x) + i·h2(x) mod m`. It's a real, cited optimization (Kirsch & Mitzenmacher,
2006), not a simplification the lab invented — two hashes are provably sufficient to simulate `k`
independent ones for this purpose.

## Half the Guarantee Is Absolute

Insert an item, and it will **always** test as present — the lab's test suite asserts this across
every configuration it runs, at zero exceptions, because it's a structural property, not a
probabilistic one: setting a bit can only ever make `mightContain` more likely to return true for
some item, never less likely for the item whose bits were just set. A Bloom filter never forgets
something it was told.

## The Other Half Is a Real, Measured Curve

The reverse direction — "definitely absent" — is where the probability lives. Every item's k bits
overlap, by chance, with bits other items also set. As more items go in, the array fills up, and
the odds that some brand-new item's k bits all happen to already be set (by coincidence, from other
insertions) climb. The closed-form estimate for that rate is:

```
p ≈ (1 - e^(-kn/m))^k
```

The lab computes this formula **and** measures the real rate — insert `n` items into the actual
bit array, then test thousands of items that were genuinely never inserted, and count how many
wrongly come back "maybe." At the filter's designed capacity (sized so `k` is chosen to minimize
this rate for the expected `n`), the two numbers track each other closely, both comfortably in the
low single digits of a percent. Drag the "items inserted" slider up past that designed capacity —
to two, three, five times what the filter was sized for — and both numbers climb together, sharply:
by 5× over capacity, the measured false-positive rate lands around 80%, matching the formula within
a few points the whole way. Past a certain fill level, a Bloom filter isn't a cheap probabilistic
optimization anymore — it's barely better than always answering "maybe."

> [!NOTE]
> This is the actual risk with Bloom filters in production, and it's not a sizing mistake anyone
> makes on purpose: capacity is usually chosen for an *expected* item count, and the failure mode
> when real growth exceeds that estimate isn't a crash or an error — it's the filter quietly
> getting less and less useful, false-positive by false-positive, with no signal unless someone is
> actually watching the fill ratio. The formula this lab measures against is exactly the number
> that sizing should be revisited against, not a one-time calculation done at design time and
> never checked again.

## What This Buys You, and What It Doesn't

A Bloom filter is never a substitute for the real check — it's a **pre-filter** that lets you skip
the real check when it says "definitely absent," which is most of the time when properly sized.
The systems that use them (Cassandra's per-SSTable filters, CDN edge caches, browser
safe-browsing lists) all still fall back to the authoritative source on a "maybe" — the filter's
entire value is in how rarely that fallback needs to fire, and this lab's finding is exactly the
knob that number depends on: not just "how many hash functions," but "how full is this filter
actually running, right now, compared to what it was sized for."
