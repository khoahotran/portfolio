---
title: "Queue vs Pub/Sub Comparison Notes"
date: "2026-03-21"
tags: ["experiment", "queue", "pubsub", "messaging", "system-design"]
summary: "How delivery semantics and fan-out requirements should dictate your choice between Message Queues and Pub/Sub systems."
reading_time: "9 min read"
---

## The Habit of Defaulting

In modern backend engineering, teams often choose messaging patterns based on habit rather than rigorous requirement analysis. If a team has experience with RabbitMQ, they use queues for everything. If they love Kafka, everything becomes an event stream.

However, choosing the wrong messaging paradigm leads to architectural friction, complex workarounds, and brittle systems. We recently evaluated two distinct workloads to clarify when to use which pattern.

---

## Architectural Comparison

```
PARADIGM 1: TRADITIONAL MESSAGE QUEUE (Work Queue)
[Producer] ──> [ Queue ] ──┬──> [ Worker A ] (Locks & Processes Task 1)
                           ├──> [ Worker B ] (Locks & Processes Task 2)
                           └──> [ Worker C ] (Idle/Available)

PARADIGM 2: PUB/SUB (Fan-out Event Stream)
                          ┌──> [ Consumer Group 1 (Social Feed Service) ]
[Publisher] ──> [ Topic ] ┼──> [ Consumer Group 2 (Recommendation Engine) ]
                          └──> [ Consumer Group 3 (Cache Invalidator) ]
```

---

## Workload A: The Task Processor

The first workload involved processing video encoding jobs. The requirements were strict:
- Each job must be processed exactly once (or at least, only one worker should attempt it at a time).
- Workers take a long, unpredictable amount of time to finish (from 20 seconds to 15 minutes).
- If a worker dies mid-processing, the job must be safely retried by another worker.
- Scaling should be based on competing consumer counts.

**The Solution: A Traditional Message Queue (e.g., AWS SQS or RabbitMQ)**

Queues excel at distributing work. They maintain state about which message is currently being processed and who holds the lock (e.g., SQS Visibility Timeout). They provide simple backpressure and straightforward dead-letter routing. Using a Pub/Sub system here would require building complex manual locking mechanisms.

### TypeScript SQS Task Consumer Implementation

Here is how we implemented the SQS worker loop in Node.js, utilizing message visibility updates for long-running jobs:

```typescript
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, ChangeMessageVisibilityCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({ region: 'us-east-1' });
const QUEUE_URL = process.env.VIDEO_ENCODING_QUEUE_URL;

async function processVideoTask(message: any): Promise<void> {
  const payload = JSON.parse(message.Body);
  console.log(`Starting video encoding for: ${payload.videoId}`);
  
  // Simulate processing that takes time
  await new Promise((resolve) => setTimeout(resolve, 15000));
  
  console.log(`Video encoding completed: ${payload.videoId}`);
}

async function startWorker() {
  while (true) {
    try {
      const receiveRes = await sqs.send(new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20, // Long Polling
        VisibilityTimeout: 30 // Lock message for 30 seconds
      }));

      if (!receiveRes.Messages || receiveRes.Messages.length === 0) {
        continue;
      }

      const message = receiveRes.Messages[0];
      const receiptHandle = message.ReceiptHandle;

      // Heartbeat helper for long tasks (extends SQS lock)
      const heartbeatInterval = setInterval(async () => {
        try {
          await sqs.send(new ChangeMessageVisibilityCommand({
            QueueUrl: QUEUE_URL,
            ReceiptHandle: receiptHandle,
            VisibilityTimeout: 30
          }));
          console.log('SQS visibility timeout extended (heartbeat)');
        } catch (err) {
          console.error('Failed to extend visibility timeout', err);
        }
      }, 20000); // Heartbeat every 20s

      try {
        await processVideoTask(message);
        
        // Success: Delete message from queue
        await sqs.send(new DeleteMessageCommand({
          QueueUrl: QUEUE_URL,
          ReceiptHandle: receiptHandle
        }));
        console.log('Message successfully deleted');
      } finally {
        clearInterval(heartbeatInterval);
      }
    } catch (error) {
      console.error('Error in SQS worker loop:', error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

startWorker();
```

---

## Workload B: The State Broadcaster

The second workload involved user profile updates. When a user changed their avatar, three entirely separate services (the Social Feed, the Recommendation Engine, and the Cache Invalidator) needed to know about it.
- Each service needed a copy of the exact same event.
- The services were maintained by different teams with different deployment schedules.
- If one service was down, the others should not be blocked.

**The Solution: A Pub/Sub Event Stream (e.g., Apache Kafka / Redpanda)**

Pub/Sub excels at broadcast and fan-out. The producer simply announces "the profile changed" and walks away. The messaging system ensures that every registered consumer group gets its own independent copy of the event to process at its own pace.

### Node.js Kafka Consumer Group Implementation

Here is a Kafka consumer setup using `kafkajs` demonstrating independent consumer groups:

```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'profile-service-broadcaster',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

async function runConsumer(consumerGroupId: string) {
  const consumer = kafka.consumer({ groupId: consumerGroupId });

  await consumer.connect();
  await consumer.subscribe({ topic: 'user-profile-updates', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const value = message.value?.toString();
      const event = JSON.parse(value || '{}');
      console.log(`[Group: ${consumerGroupId}] Received profile update:`, event.userId);
      
      // Execute business logic specific to this service
      if (consumerGroupId === 'social-feed-service') {
        // Update user card in feed caches
      } else if (consumerGroupId === 'recommendation-engine') {
        // Retrain graph nodes
      }
    },
  });
}

// Running multiple consumers concurrently representing different services
runConsumer('social-feed-service');
runConsumer('recommendation-engine');
```

---

## SQS vs Kafka: Architectural Trade-offs

| Dimension | Message Queue (e.g., SQS / RabbitMQ) | Event Stream (e.g., Apache Kafka) |
| :--- | :--- | :--- |
| **Primary Unit** | A temporary Message buffer | An append-only persistent Log |
| **Message Lifetime** | Deleted immediately upon successful process | Retained based on duration/size policy |
| **Consumer State** | Managed by Broker (Locks, Acks) | Managed by Consumer (Offsets) |
| **Scaling Mechanism** | Spanning Competing Consumers | Partitioning keys across partition logs |
| **Ordering Guarantees** | FIFO Queue limits throughput | Guaranteed ordering *within a partition* |
| **Ideal For** | Competing tasks / Commands | Event sourcing / Stream processing |

---

## Lessons Learned

- **Queue**: Simplifies ordering, exclusive processing, and backpressure. It is the right choice for **commands** (e.g., "resize this image").
- **Pub/Sub**: Simplifies fan-out, decouples producers from consumers, and supports team autonomy. It is the right choice for **events** (e.g., "order was completed").

Match your messaging semantics to your domain behavior first, then optimize the implementation. Don't force a queue to act like a broadcaster (e.g., using polling databases), and don't force a stream to manage task locks where worker progress is highly irregular.
