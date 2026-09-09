---
title: "LSM Trees and the Write You'll Pay for Later"
date: "2026-09-09"
tags: ["distributed-systems", "trade-offs", "postgresql", "benchmark"]
related: ["research/database-indexing-btree-vs-brin-for-time-series", "experiments/bloom-filters-and-the-capacity-you-cant-see-coming"]
summary: "Run a real log-structured merge tree — measure read amplification growing unbounded without compaction, then measure the real write-amplification cost of bounding it."
---

The site's [B-Tree vs. BRIN piece](/research/database-indexing-btree-vs-brin-for-time-series) covers
the index PostgreSQL reaches for by default: a structure that updates a key in place, wherever it
already lives. That's a genuinely different design from the one most write-heavy key-value stores
actually ship — LevelDB, RocksDB, Cassandra's SSTables — which never update in place at all. This
lab runs that structure for real: a **log-structured merge (LSM) tree**, and the real trade-off
compaction buys you, measured on both sides rather than asserted.

<div class="mt-8 mb-12">
  <a href="/labs/lsm-tree" class="lab-cta-inverse">
    Try the Interactive LSM Tree Lab
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </a>
</div>

## Never Update in Place

Every write lands in an in-memory `memtable`. Once it fills, it flushes, exactly as-is, to disk as
an immutable **sorted run** (`src/labs/lsmTree.ts`):

```
put(key, value):   memtable.set(key, value); if full, flush to a new sorted run
get(key):          check memtable first, then runs newest -> oldest, until found or out of runs
```

A run, once written, is never edited — an update to an existing key doesn't touch the old value
sitting in an older run; it just writes a new value into whichever run is current, which correctly
**shadows** the old one on lookup because newer runs are always checked first. That's the entire
appeal: every write is a sequential append, never a random in-place update — the opposite of a
B-Tree's approach, and the reason LSM trees dominate write-heavy workloads.

## The Cost of Never Merging: Unbounded Reads

Shadowing only works because a lookup checks runs from newest to oldest until it finds the key —
which means a lookup for a key that **doesn't exist** has to check every single run before it can
say so. Left unchecked, the number of runs only ever grows — one new run per flush, forever. The lab
measures this directly, not as a formula: run the same workload at 5,000 total writes and again at
20,000, with compaction switched off, and the run count goes from 100 to 400 — exactly proportional
to total writes, because nothing ever reduces it. A lookup for a missing key at 20,000 writes costs
4× what it cost at 5,000, for the identical reason.

## The Fix, and What It Actually Costs

**Compaction** merges every current run into one, keeping only the newest value per key (and
dropping tombstones entirely — nothing older remains for a delete marker to hide once everything is
merged). The lab's own test suite asserts this bounds both run count and read amplification to a
small constant, regardless of how much total data has been written — the fix genuinely works.

But it isn't free, and the lab measures exactly what it costs: **write amplification** — the ratio
of total bytes ever written to a run, versus the number of write operations actually issued. With
compaction off, that ratio is exactly `1.0`: every operation is written to disk exactly once, ever.
Switch compaction on, and every live key gets *rewritten* each time compaction runs — including keys
nobody has touched since the last one. Compact every 4 flushes on a 5,000-operation, 500-unique-key
workload, and write amplification measures **3.42×**. Compact twice as often (every 2 flushes) and
it rises to **5.8×** — read amplification doesn't improve any further (it was already at the floor
of 1), but the same live data gets fully rewritten twice as often.

> [!NOTE]
> This lab deliberately doesn't model per-run Bloom filters, which is what real LSM stores
> (LevelDB, RocksDB) actually use to soften the unbounded-reads problem without full compaction: a
> tiny filter per run lets a lookup skip a run entirely when it's *certain* the key isn't there,
> without eliminating the fundamental trade-off — a filter only ever helps misses, and does nothing
> for the run count itself. The [Bloom filter lab](/labs/bloom-filter) is exactly that structure, on
> its own; this lab keeps the LSM trade-off isolated rather than compositing the two together.

## Neither Side Is Free

A B-Tree's cost is upfront and visible: random writes are expensive, in proportion to how spread out
the keys being updated are. An LSM tree's cost is deferred and configurable: writes are cheap right
up until compaction has to happen, at which point the bill for every key that's ever been rewritten
comes due at once, and how often that bill comes due is a real knob — compact rarely, and reads pay
for it; compact often, and writes pay for it instead. Nothing here escapes the trade-off; the design
only decides which side of it a workload is actually paying.
