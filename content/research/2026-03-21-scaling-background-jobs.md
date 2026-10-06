---
title: "Scaling Background Jobs: Adaptive Concurrency"
date: "2026-03-21"
tags: ["queues", "architecture", "benchmark"]
summary: "Operational patterns and practical lessons for scaling asynchronous jobs while keeping failure rates and costs predictable."
---

## The Static Scaling Trap

When we first built our asynchronous job pipeline to handle daily quest completions, we provisioned a static number of workers. Most of the day, these workers sat idle, burning infrastructure costs. But during our marketing campaign windows, traffic spiked violently.

The static worker pool couldn't consume the messages fast enough. Queue lag climbed from seconds to minutes, and users started complaining that their quest rewards weren't being delivered. Our immediate reaction was to simply crank up the static worker count to handle the peak load, but this proved prohibitively expensive and wildly inefficient during off-peak hours.

---

## The Adaptive Architecture

We needed a system that could dynamically breathe with the traffic. We implemented a queue-driven worker pool with an adaptive concurrency control loop.

```
                  [ Monitor Queue & Success Metrics ]
                                  │
                                  ▼
                     / Check: Success Rate > 95% \
                    /                             \
            [ No ] ───                             ─── [ Yes ]
              │                                         │
              ▼                                         ▼
     [ Trigger Circuit Breaker ]           / Check: Queue Lag > 30s \
     (Freeze Scaling / Backoff)           /                          \
                                  [ No ] ───                         ─── [ Yes ]
                                    │                                     │
                                    ▼                                     ▼
                           [ Scale Down / Maintain ]              [ Spin Up Workers ]
```

Instead of scaling based on raw CPU or Memory utilization (which are lagging indicators for queue-driven workloads), our control loop monitors two primary metrics:

1. **Queue Depth/Lag**: How many messages are waiting, and how old is the oldest message?
2. **Worker Success Rate**: Are the workers actually succeeding, or are they crashing because a downstream dependency is overwhelmed?

---

## Technical Implementation: The Autoscaler Controller

Here is a NestJS implementation of an adaptive autoscaling service using BullMQ. The service periodically inspects queue metrics and dynamically updates concurrency bounds:

### 1. The Queue Scaling Controller Service

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { Queue, QueueEvents } from "bullmq";
import Redis from "ioredis";

@Injectable()
export class QueueAutoscalerService {
  private readonly logger = new Logger(QueueAutoscalerService.name);
  private readonly redis: Redis;
  private currentConcurrency = 5; // Start with baseline
  private readonly minConcurrency = 2;
  private readonly maxConcurrency = 50;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
    this.startControlLoop();
  }

  // Periodic control loop executing every 15 seconds
  private startControlLoop() {
    setInterval(async () => {
      await this.evaluateQueueScaling();
    }, 15000);
  }

  private async getQueueMetrics(): Promise<{
    queueLagMs: number;
    successRate: number;
  }> {
    const queueName = "quest-processing";

    // Resolve Queue Depth & Job Age
    const pendingJobs = await this.redis.xlen(`bull:${queueName}:events`);
    const activeJobs = await this.redis.llen(`bull:${queueName}:active`);

    // Read the oldest job waiting
    const jobs = await this.redis.lrange(`bull:${queueName}:wait`, -1, -1);
    let queueLagMs = 0;

    if (jobs.length > 0) {
      const jobData = JSON.parse(
        (await this.redis.hget(`bull:${queueName}:${jobs[0]}`, "opts")) || "{}",
      );
      const timestamp = jobData.timestamp || Date.now();
      queueLagMs = Date.now() - timestamp;
    }

    // Resolve Success Rate from last 100 executions
    const completed = parseInt(
      (await this.redis.get(`metrics:${queueName}:completed`)) || "0",
      10,
    );
    const failed = parseInt(
      (await this.redis.get(`metrics:${queueName}:failed`)) || "0",
      10,
    );
    const total = completed + failed;

    const successRate = total > 0 ? (completed / total) * 100 : 100;

    // Reset counters for next interval window
    await this.redis.set(`metrics:${queueName}:completed`, "0");
    await this.redis.set(`metrics:${queueName}:failed`, "0");

    return { queueLagMs, successRate };
  }

  private async evaluateQueueScaling() {
    const { queueLagMs, successRate } = await this.getQueueMetrics();

    this.logger.log(
      `Current Metrics -> Lag: ${(queueLagMs / 1000).toFixed(1)}s, Success Rate: ${successRate.toFixed(1)}%`,
    );

    // Rule 1: Circuit Breaker
    if (successRate < 92.0) {
      this.logger.warn(
        `High failure rate (${successRate.toFixed(1)}%). Halting scaling to protect downstream services.`,
      );
      this.currentConcurrency = Math.max(
        this.minConcurrency,
        Math.round(this.currentConcurrency * 0.7),
      );
      await this.applyConcurrency();
      return;
    }

    // Rule 2: Scale Up
    if (queueLagMs > 30000 && this.currentConcurrency < this.maxConcurrency) {
      const step = Math.min(5, this.maxConcurrency - this.currentConcurrency);
      this.currentConcurrency += step;
      this.logger.log(
        `Scaling up worker concurrency by +${step}. New concurrency: ${this.currentConcurrency}`,
      );
      await this.applyConcurrency();
      return;
    }

    // Rule 3: Scale Down
    if (queueLagMs < 5000 && this.currentConcurrency > this.minConcurrency) {
      const step = Math.max(
        1,
        Math.round((this.currentConcurrency - this.minConcurrency) * 0.2),
      );
      this.currentConcurrency -= step;
      this.logger.log(
        `Queue is clear. Scaling down worker concurrency by -${step}. New concurrency: ${this.currentConcurrency}`,
      );
      await this.applyConcurrency();
    }
  }

  private async applyConcurrency() {
    // Write target concurrency configuration to shared state (Redis)
    await this.redis.set(
      "config:quest-worker:concurrency",
      this.currentConcurrency.toString(),
    );
  }
}
```

### 2. Bounded Retries and DLQ Config

To prevent poison pills (corrupted jobs that fail repeatedly) from causing the queue metrics to lie, we defined strict retry options with exponential backoff on our worker setup:

```typescript
import { Queue } from "bullmq";

const questQueue = new Queue("quest-processing");

async function addQuestJob(data: any) {
  await questQueue.add("process-quest", data, {
    attempts: 3, // Hard boundary
    backoff: {
      type: "exponential",
      delay: 5000, // Start with 5s delay, then 10s, 20s
    },
    removeOnComplete: true, // Clean up history to save memory
    removeOnFail: {
      age: 24 * 3600, // Keep in DLQ for 24 hours for inspection
    },
  });
}
```

---

## Autoscaling Decision Matrix

Here is how our controller responds to varying system health states:

| Queue Lag | Success Rate | Decision State    | Worker Action                                  |
| :-------- | :----------- | :---------------- | :--------------------------------------------- |
| **< 5s**  | > 95%        | System Idle       | **Scale down** to min-concurrency (save costs) |
| **> 30s** | > 95%        | Under Load        | **Scale up** (+5 concurrency per tick)         |
| **> 30s** | < 92%        | Downstream Outage | **Scale down** (Trigger Circuit Breaker)       |
| **< 5s**  | < 92%        | Faulty Jobs       | **Halt** (No scale actions; log errors)        |

---

## Key Lessons Learned

1. **Don't scale on CPU; scale on Queue Lag**: Workers processing sleep/network-bound tasks might use 5% CPU while the queue backs up with millions of jobs. Ingest lag is the source of truth.
2. **Never scale up into a failure**: Monitor worker success rates before provisioning more workers. Throwing more concurrency at a failing database completes its collapse.
3. **Retries must be bounded and observable**: If failing jobs are endlessly retried without moving to a Dead Letter Queue (DLQ), your queue depth metric is lying to you, and your autoscaler will spin up instances to process poison pills.
