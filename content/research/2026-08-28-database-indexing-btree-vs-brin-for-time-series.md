---
title: "Database Indexing for Time-Series: B-Tree vs BRIN in PostgreSQL"
date: "2026-08-28"
tags: ["postgresql", "architecture", "hft"]
related: ["projects/quant-alpha"]
summary: "Why a Block Range Index, not the default B-Tree, is the right structure for naturally time-ordered data — and why QuantAlpha's tick-ingestion pipeline hasn't needed it yet."
---

## The Default Index Is Usually the Wrong One for Time-Series

PostgreSQL's default index type is B-Tree, and for good reason — it's the right general-purpose
structure for equality and range lookups on data with no particular ordering guarantee. Tick-level
market data, ingestion logs, sensor readings, and anything else that arrives in roughly chronological
order is a case where "no particular ordering guarantee" doesn't hold, and a B-Tree pays a real cost
for information it doesn't use.

[QuantAlpha's](/projects/quant-alpha) ingestion pipeline is the concrete case this article is
grounded in — a target design, not a shipped feature: **tick data isn't stored in PostgreSQL in the
current repository** (it's read directly from CSV via `pandas`); the project's own documentation
states this plainly rather than describing the target as the current state. The question this
article answers is *why BRIN is the correct choice once that pipeline exists*, which is exactly the
kind of decision worth writing down before the code, not after — same reasoning
[the tracing-vs-metrics ADR](/research/adr-tracing-vs-metrics-in-microservices) applies to Aegis's
still-unbuilt metrics layer.

## What a B-Tree Actually Costs Here

A B-Tree index stores one entry per row, in sorted order, in a tree structure sized to support
`O(log n)` lookups for *any* value in the indexed column — including values scattered arbitrarily
throughout the table. For a `tick_data` table with a `timestamp` column and, say, 50 million rows
covering a trading day at tick granularity:

- **Index size scales with row count**, roughly 40-50% of the base table's size for a timestamp
  column at that cardinality — for 50M rows this is real, multi-gigabyte overhead that has to be
  read into memory (or read from disk, if it doesn't fit) on every query touching the index.
- **The B-Tree buys precision the workload doesn't need.** A query like `WHERE ts BETWEEN
  '09:30:00' AND '10:00:00'` doesn't need to know the *exact* row-level position of every timestamp
  — it needs to know *which disk blocks* contain rows in that range. A B-Tree answers a much more
  precise question than that at a proportionally higher storage and maintenance cost.

## What BRIN Does Instead

A **Block Range Index (BRIN)** stores one summary entry per *range of disk pages* (128 pages by
default), not per row — for each range, it records the min/max value of the indexed column observed
in that range. A query with a range predicate on `timestamp` uses that summary to skip entire page
ranges that can't possibly contain a match, then falls back to a sequential scan only within the
ranges that might.

```sql
CREATE INDEX idx_tick_data_ts_brin ON tick_data USING BRIN (ts) WITH (pages_per_range = 128);
```

**Why this works well specifically for time-series:** BRIN's value proposition depends entirely on
the indexed column correlating with physical row order — if timestamps are scattered randomly
across pages, a min/max-per-range summary is nearly useless (every range's min/max spans the whole
table, so nothing gets skipped). Data appended in arrival order — which is exactly how tick data,
logs, and most time-series ingestion works — is close to the best case for BRIN: each page range's
min/max is a genuinely narrow slice of the timestamp domain, so a range query skips the vast
majority of the table.

**The trade-off BRIN makes explicit:** it's a lossy summary, not a precise index. It answers "which
ranges might contain a match," not "which exact rows match" — the query still has to scan every
page a range summary didn't rule out. This is the right trade for a time-range query over
chronologically-appended data (most ranges get ruled out entirely); it is the *wrong* trade for a
point lookup on a column with no correlation to physical order, where a B-Tree's exact positional
answer is what the workload actually needs.

## The Concrete Comparison

| | B-Tree | BRIN |
|---|---|---|
| **Index size** | ~40-50% of table size at this cardinality | A few KB to low MB regardless of table size — one summary row per page range, not per data row |
| **Best for** | Equality lookups, point queries, columns with no correlation to physical order | Range queries on columns correlated with insertion/physical order |
| **Insert cost** | Tree rebalancing on every insert | Near-zero — only updates the current range's summary |
| **Precision** | Exact | Approximate (page-range granularity) — the query still scans within candidate ranges |
| **Wrong choice when...** | Table is huge and queries are range-scans on an append-ordered column | Column value doesn't correlate with physical row order (e.g. a shuffled or frequently-updated column) |

## Why This Matters for QuantAlpha Specifically

The workload QuantAlpha's rolling-window training describes — "train on 30 minutes, predict the
next 10 seconds," per the project's own stated goals — is a textbook BRIN case: every training
job's data-fetch is a `WHERE ts BETWEEN x AND y` range scan over data that arrived, and would be
stored, in timestamp order. A B-Tree on `ts` would work, but would carry index-maintenance overhead
on every `COPY`-based bulk load that BRIN's near-zero insert cost avoids entirely — a real
consideration for a daemon whose whole job (per the project's target design) is bulk-loading tick
data continuously.

**What would make this the wrong choice:** if QuantAlpha's query patterns shifted toward point
lookups by a non-time-correlated key (e.g. "fetch this exact tick by its exchange-assigned sequence
ID" rather than "fetch this time window"), BRIN's page-range summaries would degrade toward
uselessness and a B-Tree (or a composite index) would be the correct structure instead. The decision
in this article is scoped to the range-query access pattern QuantAlpha's actual training workflow
describes, not a universal claim that BRIN is superior to B-Tree in general — it isn't; it's a
better fit for one specific, common shape of query against one specific, common shape of data.
