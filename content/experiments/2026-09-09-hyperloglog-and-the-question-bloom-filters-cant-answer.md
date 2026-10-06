---
title: "HyperLogLog and the Question Bloom Filters Can't Answer"
date: "2026-09-09"
tags: ["distributed-systems", "trade-offs", "benchmark"]
related: ["experiments/bloom-filters-and-the-capacity-you-cant-see-coming", "experiments/merkle-trees-and-the-diff-nobody-has-to-compute"]
summary: "Run a real HyperLogLog sketch — measure its estimation error against a true count and the theoretical standard error, watch the small-range correction matter, then merge two overlapping sketches for a real union estimate."
---

The [Bloom filter lab](/labs/bloom-filter) answers "have I seen this exact item" in fixed space,
never storing a single one. **HyperLogLog** (Flajolet, Fusillo, Gandouet & Meunier, 2007) answers
the adjacent, genuinely different question — "how many *distinct* items have I seen" — also in
fixed space, also without storing a single item. Neither structure can answer the other's question:
a Bloom filter can't tell you a count, and a HyperLogLog sketch can't tell you whether one specific
item was ever inserted. This lab runs the real algorithm, not the formula, the same way the Bloom
filter lab does.

<div class="mt-8 mb-12">
  <a href="/labs/hyperloglog" class="lab-cta-inverse">
    Try the Interactive HyperLogLog Lab
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </a>
</div>

## The Trick: Rare Runs Are a Signal

Hash every item to a uniform bit string, then split the hash in two: the first `p` bits pick one of
`m = 2^p` registers, and the rest is searched for its longest run of leading zeros
(`src/labs/hyperLogLog.ts`):

```
index(hash) = top p bits of hash
rank(hash)  = position of the first 1-bit in the remaining bits, from 1
registers[index] = max(registers[index], rank)   // per item, per register
```

A run of `k` leading zeros in a uniformly random bit string has probability `2^-(k+1)` — rare, and
rarer the longer it gets. So the *longest* run any item produced for a given register is a real,
if noisy, signal for how many distinct items must have hashed there. HyperLogLog's whole trick is
averaging that noisy per-register signal across all `m` registers (a harmonic mean, not an
arithmetic one — extreme registers shouldn't dominate) to bring the noise down to a standard error
of roughly `1.04/√m`. That number is a design target, not a guarantee this lab just asserts:
`runCardinalityTrial` builds a real sketch from a known true count and measures the actual error
against it, and the test suite checks that measured error stays within a few multiples of
`theoreticalStandardError(m)` across cardinalities from 100 to 100,000 — a real relationship
between register count and accuracy, not two numbers that happen to agree once.

## The Correction Most Explanations Skip

Stage 1's fixed low-cardinality demo is the sharper finding: below roughly `2.5m` true items, most
registers are still sitting at their untouched zero value, and the raw harmonic-mean formula
doesn't know that — it extrapolates from a handful of populated registers as if every register were
meaningfully filled. At 50 true items against a 1,024-register sketch, the raw formula estimates
over 10× the true count. The fix, specified in the original paper and implemented directly here as
`estimateCardinality`'s small-range branch, is **linear counting**: `m · ln(m / zeroRegisters)`,
which uses the *fraction of registers still at zero* instead of the noisy max-run signal, and lands
close to the true count in the same regime the raw formula gets badly wrong. `estimateCardinalityRaw`
is exported specifically so the test suite — and the lab's UI — can show this difference directly,
not describe it in prose.

## Merging Sketches Without Ever Touching Raw Data

Stage 2 is the feature exact counting structures don't offer without combining raw data: two
independently-built sketches merge into a correct estimate of their **union**, by taking the
elementwise max of their registers. That's not an approximation of merging — it's exactly what a
single sketch that had seen everything both inputs saw would itself contain, since "did any item
hash to a longer run in this register" doesn't care which sketch it came from.

The lab makes the alternative's failure concrete: given two sketches with a real, adjustable
overlap, naively summing their two individual cardinality estimates double-counts every item in
that overlap — drag the overlap slider up toward either sketch's full size, and the naive sum keeps
climbing well past the true union, while the properly merged sketch keeps tracking it, because the
merge never counted anyone twice in the first place. This is exactly why HyperLogLog is practical at
the scale it's actually used at (Redis's `PFCOUNT`/`PFMERGE`, Presto and BigQuery's `APPROX_COUNT_DISTINCT`,
per-shard analytics that need a global unique-visitor count): every shard tracks its own sketch
independently, and a merge afterward — no coordination, no raw data ever leaving a shard — is enough
to estimate the whole dataset's cardinality.

## What This Buys You, and What It Doesn't

A HyperLogLog sketch will never tell you whether *this specific* item was ever seen — that's the
Bloom filter's job, and the two structures solve genuinely disjoint problems even though both trade
exactness for fixed memory. What it does buy: a real, bounded-error distinct-count that costs the
same handful of bytes whether the true cardinality is a hundred or a hundred million, and that
merges cleanly across shards without ever moving a single raw item between them — the same
"aggregate first, coordinate never" shape as the [Merkle tree lab's](/labs/merkle-tree) targeted
diff, applied to counting instead of reconciliation.
