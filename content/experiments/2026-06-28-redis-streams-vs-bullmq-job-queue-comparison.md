---
title: "Redis Streams vs BullMQ: Choosing Your Job Queue"
date: "2026-06-28"
tags: ["benchmark", "redis", "queues", "go", "typescript"]
related: ["projects/quant-alpha", "blog/building-jujuja-a-production-quest-system"]
series: "The Benchmark Rewrites"
seriesOrder: 1
summary: "A practical comparison of Redis Streams and BullMQ based on using both in production — covering delivery semantics, consumer group models, and failure handling patterns."
---

## The Same Infrastructure, Two Different Abstractions

Both Redis Streams and BullMQ run on Redis. On the surface, they appear interchangeable for async job processing. After building **QuantAlpha Lab** with raw Redis Streams (in Go) and **Jujuja** with BullMQ (in TypeScript/NestJS), I can say with certainty: they are not interchangeable. They solve different problems with different trade-offs.

---

## The Two Workloads

### QuantAlpha Lab: Redis Streams (Go)

The ML pipeline dispatches prediction jobs from a Go REST API to Python worker processes. The requirements were:
- Fan-out to multiple worker *types* (Data Scientist role, Quant Researcher role, Portfolio Manager role)
- Persistent job history for replay and audit
- Consumer groups that each process the full event stream independently
- Low overhead — we control the infrastructure directly

### Jujuja: BullMQ (TypeScript/NestJS)

The daily quest pipeline dispatches user completion events to reward workers. The requirements were:
- Task-style work distribution — exactly one worker processes each job
- Built-in retry with exponential backoff
- Dead letter queue with Slack alerting
- Dashboard visibility for on-call engineers
- Fast development iteration — the team is small

---

## Architectural Comparison

```
REDIS STREAMS MODEL (QuantAlpha Lab)
                                     ┌──► [Consumer Group A: Data Scientist Worker]
[Go API] ──► XADD (stream) ──────────┼──► [Consumer Group B: Quant Researcher Worker]
                                     └──► [Consumer Group C: Portfolio Manager Worker]
Each consumer group reads ALL messages independently.
Messages are retained based on MAXLEN policy (not deleted on ACK).

BULLMQ MODEL (Jujuja)
                    ┌──► [Worker Instance 1] (locks job, removes on success)
[NestJS] ──► RPUSH ─┤
                    └──► [Worker Instance 2] (one job, one worker, competing)
Messages are removed from Redis on successful processing.
Failed jobs move to DLQ (separate sorted set).
```

---

## Implementation: Redis Streams (Go)

Here's the general pattern for a multi-consumer-group Redis Streams dispatcher in Go — the reference design behind QuantAlpha Lab's job-queue architecture (see the note after this section for how it compares to what's currently committed):

```go
package dispatch

import (
    "context"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

const (
    streamKey = "hft:prediction-requests"
    maxLen    = 10000 // Retain last 10,000 messages
)

type Dispatcher struct {
    rdb *redis.Client
}

// Publish adds a prediction request to the Redis Stream.
// Each consumer group will receive its own copy of this message.
func (d *Dispatcher) Publish(ctx context.Context, req PredictionRequest) (string, error) {
    id, err := d.rdb.XAdd(ctx, &redis.XAddArgs{
        Stream: streamKey,
        MaxLen: maxLen,
        Approx: true, // ~MAXLEN (allows minor over-count for performance)
        Values: map[string]interface{}{
            "model_id":   req.ModelID,
            "window_sec": req.WindowSeconds,
            "requested_at": time.Now().UnixMilli(),
        },
    }).Result()
    if err != nil {
        return "", fmt.Errorf("xadd to stream: %w", err)
    }

    return id, nil
}
```

```go
// Consumer group setup (run once at service startup)
func (d *Dispatcher) EnsureConsumerGroups(ctx context.Context) error {
    groups := []string{"data-scientist-workers", "quant-researcher-workers", "portfolio-manager-workers"}

    for _, group := range groups {
        err := d.rdb.XGroupCreateMkStream(ctx, streamKey, group, "0").Err()
        if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
            return fmt.Errorf("creating consumer group %s: %w", group, err)
        }
    }

    return nil
}

// Worker reads from its consumer group and processes messages.
// XACK removes the message from the PEL (Pending Entry List) after processing.
func RunWorker(ctx context.Context, rdb *redis.Client, group, consumerName string) {
    for {
        streams, err := rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
            Group:    group,
            Consumer: consumerName,
            Streams:  []string{streamKey, ">"},
            Count:    5,
            Block:    5 * time.Second,
        }).Result()

        if err != nil {
            if err == redis.Nil {
                continue // No new messages — block timeout, retry
            }
            continue
        }

        for _, stream := range streams {
            for _, msg := range stream.Messages {
                if err := processMessage(ctx, msg); err != nil {
                    // Do NOT ack — message stays in PEL for retry via XPENDING
                    continue
                }

                // Acknowledge successful processing
                rdb.XAck(ctx, streamKey, group, msg.ID)
            }
        }
    }
}
```

**Claiming stuck messages** (the Redis Streams equivalent of retry):

```go
// XAUTOCLAIM reclaims messages that have been pending > 30 seconds
// (i.e., a worker died mid-processing). Run this as a periodic recovery goroutine.
func reclaimStalePending(ctx context.Context, rdb *redis.Client, group, consumer string) {
    msgs, _, err := rdb.XAutoClaim(ctx, &redis.XAutoClaimArgs{
        Stream:   streamKey,
        Group:    group,
        Consumer: consumer,
        MinIdle:  30 * time.Second,
        Start:    "0-0",
        Count:    10,
    }).Result()

    if err != nil || len(msgs) == 0 {
        return
    }

    for _, msg := range msgs {
        processMessage(ctx, msg)
        rdb.XAck(ctx, streamKey, group, msg.ID)
    }
}
```

> **Current implementation vs. this pattern:** the QuantAlpha Lab (`HFT`) repository's actual dispatch code is simpler than the reference pattern above — one stream (`job_queue`), one consumer group (`worker_group`), and no `XAutoClaim`/`XClaim` anywhere in the codebase. Recovery of stuck jobs is a startup-time PEL scan by the worker's own consumer identity, not a periodic cross-consumer reclaim goroutine, and there's no multi-group fan-out by role (Data Scientist / Quant Researcher / Portfolio Manager) in the committed code. The pattern above remains the reference design this comparison illustrates; it is not what's currently running.

---

## Implementation: BullMQ (TypeScript)

In Jujuja, BullMQ wraps all of the above complexity behind a clean API:

```typescript
import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Producer: push a quest completion job
const questQueue = new Queue('quest-completions', { connection });

async function enqueueQuestCompletion(userId: string, questId: string) {
  const jobId = `quest:${userId}:${questId}:${new Date().toDateString()}`;

  await questQueue.add(
    'process-completion',
    { userId, questId },
    {
      jobId,             // BullMQ deduplicates by jobId automatically
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,     // 5s → 10s → 20s
      },
      removeOnComplete: true,
      removeOnFail: {
        age: 24 * 3600, // Keep failed jobs in DLQ for 24h
      },
    }
  );
}

// Consumer: process one job at a time, with automatic retry on failure
const worker = new Worker(
  'quest-completions',
  async (job) => {
    const { userId, questId } = job.data;

    // This is called on every retry — idempotency must be handled inside
    await validateAndAllocateReward(userId, questId);
  },
  {
    connection,
    concurrency: 10,
  }
);

// Observability: alert when jobs land in DLQ
const events = new QueueEvents('quest-completions', { connection });
events.on('failed', async ({ jobId, failedReason }) => {
  const job = await questQueue.getJob(jobId);
  if (job && job.attemptsMade >= 3) {
    await sendSlackAlert(`Quest job ${jobId} exhausted retries: ${failedReason}`);
  }
});
```

---

## Feature Comparison

| Dimension | Redis Streams (raw) | BullMQ |
|:---|:---|:---|
| **Message model** | Append-only log; consumers track offsets | Task queue; message removed on success |
| **Fan-out** | ✅ Native consumer groups — each gets full stream | ❌ Competing consumers only |
| **Message retention** | ✅ Configurable (MAXLEN) — replay possible | ❌ Deleted on success |
| **Retry mechanism** | Manual XAUTOCLAIM or XPENDING handling | ✅ Built-in with exponential backoff |
| **DLQ** | Manual — move to separate stream on failure | ✅ Automatic sorted set |
| **Deduplication** | Manual — check before XAck | ✅ Job IDs deduplicate automatically |
| **Dashboard** | None (build your own or use Redis Insight) | ✅ Bull Board (npm package) |
| **Language support** | Any Redis client | Primarily Node.js/TypeScript |
| **Operational overhead** | High — own the retry and reclaim logic | Low — managed by library |

---

## Benchmark Numbers

### Methodology

- **Hardware:** A local Docker Compose stack (Redis 7, a Go 1.22 producer/consumer, and a Node 20
  BullMQ worker as separate containers on the same bridge network) — not the AWS c6g.xlarge cited
  in an earlier version of this article, whose harness was lost. Rewritten as a runnable harness
  rather than reconstructed from memory; see below.
- **BullMQ:** Node.js 20. One `Worker` instance per configured worker count, concurrency 1 each.
- **Redis Streams:** Go 1.22. `go-redis`, `XADD` to enqueue, `XREADGROUP` against a shared consumer
  group to drain, one goroutine per worker.
- **Protocol:** Enqueue all jobs first, only then start the workers, so both engines are measured
  draining an identical backlog rather than production and consumption overlapping unevenly.
  Job counts: 3,000 for 1&nbsp;KB/10&nbsp;KB payloads, 1,000 for 100&nbsp;KB (kept lower purely to
  bound total runtime — same count for both engines within each payload size).

> [!NOTE]
> **Reproducibility.** This harness is real and committed:
> [`benchmarks/redis-vs-bullmq/`](https://github.com/khoahotran/portfolio/tree/main/benchmarks/redis-vs-bullmq)
> in the portfolio repository — a Docker Compose stack plus a `run.sh` that reproduces every number
> below from a cold start. The interactive lab imports this exact `results.json`, not a hand-picked
> subset. Numbers will vary run to run and host to host — that's true of any benchmark — but the
> methodology is no longer something you have to take on faith.

### Key Observations

BullMQ is an incredible piece of software with built-in retries, backoff, and repeatable jobs. However, to achieve these features, it relies on complex Lua scripts that run atomically inside Redis for every single job state transition (Waiting -> Active -> Completed).

Native Redis Streams via Go, on the other hand, just appends and reads from a log.

| Payload | Workers | Redis Streams (jobs/s) | BullMQ (jobs/s) | Ratio |
| :--- | :--- | ---: | ---: | ---: |
| 1 KB | 1 | 1,745 | 783 | 2.2x |
| 1 KB | 5 | 4,061 | 1,363 | 3.0x |
| 10 KB | 1 | 1,614 | 707 | 2.3x |
| 10 KB | 5 | 3,467 | 1,208 | 2.9x |
| 100 KB | 1 | 1,379 | 273 | 5.1x |
| 100 KB | 5 | 1,707 | 308 | 5.5x |

The gap is not a flat multiplier — it grows with payload size. At 1&nbsp;KB and 10&nbsp;KB, Redis
Streams runs roughly 2-3x BullMQ's throughput; at 100&nbsp;KB, that widens to 5-5.5x. BullMQ's
per-job Lua-script overhead is largely fixed regardless of payload size, so as the payload itself
gets more expensive to move and JSON-serialize, that fixed overhead becomes a smaller fraction of
BullMQ's total cost per job — while Redis Streams, with no such per-job scripting cost, keeps
scaling more cleanly with raw I/O. If your system requires raw, unadulterated throughput (e.g.,
passing millions of tiny websocket events or tick data), Redis Streams in Go is the clear win — and
the win gets larger, not smaller, as payloads grow. If you need complex job management (pausing
queues, rate limiting, parent/child jobs), BullMQ's overhead is well worth it, and the gap above is
the price of that convenience, not a reason to avoid it.

<a href="/labs/redis-vs-bullmq" class="lab-cta">
  View Interactive Benchmark
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
</a>

---

## When to Choose Which

Use **Redis Streams** when:
- You need fan-out: multiple independent services must each process every event
- You need replay: you want to reprocess historical events (e.g., rebuild ML model state)
- You control the consumer in Go or another non-Node language
- The extra control is worth the extra code

Use **BullMQ** when:
- This is a task queue — one job, one worker
- You are in a TypeScript/NestJS codebase and want built-in retry, DLQ, and dashboard
- Your team is small and you need to ship fast without implementing retry logic from scratch
- Dead letter queue observability is a hard requirement (it almost always is)

---

## Lessons Learned

1. **Redis Streams is closer to Kafka than to a job queue.** If you think of it as a Kafka replacement for event streaming, it makes sense. If you think of it as BullMQ with lower abstraction, you will be frustrated by missing features.
2. **BullMQ's automatic deduplication via job IDs is underrated.** In Jujuja, this single feature eliminated an entire class of double-reward bugs without any application-level coordination.
3. **XAUTOCLAIM is non-negotiable for Redis Streams.** Without periodic reclaim of stuck pending messages, a crashed worker silently orphans jobs forever. This is easy to forget and hard to debug.
