const e=`---
title: "Designing a Burst-Traffic Async Job Pipeline: The Jujuja Quest System"
date: "2026-06-03"
tags: ["nestjs", "async-jobs", "scalability", "queues", "firebase-functions"]
summary: "How we redesigned daily quest processing from synchronous handlers to a queue-driven worker pool that handles 1,500 concurrent users during campaign windows."
reading_time: "9 min read"
---

## The Problem: Synchronous Handlers Fail Silently

In the early days of Jujuja, the daily quest completion logic was handled synchronously. When a user completed an action (like checking into a store or sharing a link), the HTTP request would hit our NestJS backend, which would then:
1. Validate the action.
2. Update the quest state.
3. Calculate rewards.
4. Call an external API to provision the reward.
5. Update the user's balance.

This worked fine for a few dozen users. But during marketing campaign windows, we saw bursts of **1,500 concurrent users per minute**. The synchronous model immediately buckled. 

Because we made synchronous network requests to a third-party rewards partner inside our database transaction block, our connection pool starved. HTTP response times spiked to over 10 seconds, and the database locked up. To make matters worse, when the external reward API rate-limited our server, the entire transaction rolled back, leaving the user with lost progress and zero feedback.

---

## The Solution: Ingestion-Worker Pipeline

To handle the burst traffic, we decoupled the ingestion path (saving the raw action quickly) from the execution path (validating the quest, querying the DB, and distributing rewards).

\`\`\`
   [ Client Request ]
           │
           ▼ (HTTP POST /quest/complete)
   [ NestJS API Gateway ] ──► (Validates & Pushes Job) ──► [ Redis / BullMQ ]
           │                                                    │
     (Returns 202 Accepted)                                      │ (Pulls Job Async)
           │                                                    ▼
           ▼                                             [ Worker Pool ]
     [ Optimistic UI ]                                          │
                                                   ┌────────────┴────────────┐
                                                   ▼                         ▼
                                          [ Validate Quest ]         [ Allocate Rewards ]
\`\`\`

---

## Technical Implementation

Here is the implementation of our decoupled quest ingestion and processing engine in NestJS:

### 1. Ingestion Endpoint (The Controller)

The API controller does no heavy lifting. It validates the request format, generates an idempotency fingerprint, pushes it onto our BullMQ queue, and returns a \`202 Accepted\` status:

\`\`\`typescript
import { Controller, Post, Body, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { CompleteQuestDto } from './dto/complete-quest.dto';

@Controller('quests')
export class QuestsController {
  constructor(@InjectQueue('quest-ingestion') private readonly questQueue: Queue) {}

  @Post('complete')
  @HttpCode(HttpStatus.ACCEPTED) // Return 202 Accepted
  async completeQuest(
    @Body() dto: CompleteQuestDto,
    @Headers('x-user-id') userId: string
  ) {
    // Generate a unique fingerprint to prevent double submits within short windows
    const jobKey = \`quest:\${userId}:\${dto.questId}:\${dto.completionDate}\`;
    
    // Add job to queue with specific jobId for automatic BullMQ deduplication
    await this.questQueue.add('quest-process', {
      userId,
      questId: dto.questId,
      completionDate: dto.completionDate
    }, {
      jobId: jobKey, // BullMQ will reject duplicate jobIds within the active/wait set
      removeOnComplete: true,
      attempts: 3
    });

    return { message: 'Quest completion queued for processing.' };
  }
}
\`\`\`

### 2. The Worker Processor (Decoupled Logic)

The worker process runs independently, executing the business logic and utilizing a Redis lock to enforce double-spend rules:

\`\`\`typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Processor('quest-ingestion')
export class QuestProcessor extends WorkerHost {
  private readonly logger = new Logger(QuestProcessor.name);
  private readonly redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  async process(job: Job<any>): Promise<any> {
    const { userId, questId, completionDate } = job.data;
    this.logger.log(\`Processing quest job: \${job.id}\`);

    const lockKey = \`lock:quest:\${userId}:\${questId}:\${completionDate}\`;
    
    // Acquire a distributed lock to prevent concurrent execution races
    const lockAcquired = await this.redis.set(lockKey, 'locked', 'NX', 'EX', 10);
    if (!lockAcquired) {
      this.logger.warn(\`Job race detected for key: \${lockKey}. Aborting.\`);
      return; // Lock already held; skip duplicate run
    }

    try {
      // 1. Verify user hasn't already received points for this quest (DB read)
      const alreadyCompleted = await this.checkQuestCompletion(userId, questId, completionDate);
      if (alreadyCompleted) {
        this.logger.log(\`Quest \${questId} already completed for User \${userId}. skipping.\`);
        return;
      }

      // 2. Call external API to register reward (Out-of-band call)
      await this.triggerExternalReward(userId, questId);

      // 3. Update local ledger database (Atomic Write)
      await this.recordCompletion(userId, questId, completionDate);

      this.logger.log(\`Successfully completed quest \${questId} for User \${userId}\`);
    } finally {
      // Release lock
      await this.redis.del(lockKey);
    }
  }

  private async checkQuestCompletion(userId: string, questId: string, date: string): Promise<boolean> {
    // Mock DB Check
    return false;
  }

  private async triggerExternalReward(userId: string, questId: string): Promise<void> {
    // Call third-party rewards API
  }

  private async recordCompletion(userId: string, questId: string, date: string): Promise<void> {
    // Save record to DB
  }
}
\`\`\`

---

## Ingestion Model Comparison

| Dimension | Synchronous Model | Asynchronous Model |
| :--- | :--- | :--- |
| **API Response Latency** | 420ms (can scale up to 10s) | ~50ms (constant) |
| **Outage Impact** | Downstream API down = System down | Downstream API down = Queue holds jobs |
| **User Experience** | Spinner blocks page; timeout crashes | instant confirmation; push/poll updates |
| **Database Connections** | Long-running transactions starve pools | Fast short transactions |
| **Peak Throughput** | Max 100 concurrent requests/sec | Max 3,000 concurrent requests/sec |

---

## Making Dead Letters Observable

One of the most critical lessons was that **dead-letter routing must be observable**. Initially, failed jobs were quietly moved to a DLQ (Dead Letter Queue) without alerting. We only found out when users complained about missing rewards. 

We set up a simple monitoring script that counts active failures in our BullMQ system and triggers a Slack notification if the threshold is exceeded:

\`\`\`typescript
import { Queue } from 'bullmq';
import axios from 'axios';

const questQueue = new Queue('quest-ingestion');
const SLACK_WEBHOOK = process.env.SLACK_ALERT_WEBHOOK;

async function checkDeadLetterQueue() {
  const failedCount = await questQueue.getFailedCount();
  
  if (failedCount > 10) {
    await axios.post(SLACK_WEBHOOK, {
      text: \`⚠️ *CRITICAL ALERT*: Quest Pipeline Dead-Letter Queue contains *\${failedCount} failed jobs*. Engineer intervention required!\`
    });
  }
}

// Run monitor every 5 minutes
setInterval(checkDeadLetterQueue, 300000);
\`\`\`

## Key Takeaways

1. **Decouple HTTP response from execution**: Accept request rapidly, process when possible. This preserves client bandwidth and stabilizes backend services.
2. **Implement locking on the worker**: Do not rely on API-level constraints; workers must double-check idempotency keys in storage.
3. **Log and notify on DLQ accumulation**: A dead-letter queue is a black hole unless coupled with a monitoring webhook.
`;export{e as default};
