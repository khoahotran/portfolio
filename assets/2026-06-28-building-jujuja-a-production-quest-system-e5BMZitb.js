const e=`---
title: "Building Jujuja: A Production Quest System for Burst Traffic"
date: "2026-06-28"
tags: ["case-study", "nestjs", "redis", "bullmq", "firestore"]
summary: "How we built the Jujuja backend to handle 1,500 concurrent users per minute during campaign bursts, processing daily quests and loyalty points using BullMQ and NestJS."
reading_time: "12 min"
---

When developing **Jujuja**, a gamified loyalty platform for retail stores, our biggest engineering challenge was predictable burst traffic. 

Every day at 8:00 AM, a push notification would go out to users announcing a new "Daily Quest." Within seconds, we would see traffic spike to 1,500+ active users per minute attempting to complete the quest and claim their rewards (J-Points).

If the backend failed to process a reward, customer support tickets would flood in. If we processed it twice, we lost money.

Here is how we designed the production backend to handle this burst traffic reliably.

## The Architecture (C4 Level 2)

The system is built on Firebase Functions using NestJS. To handle the burst, we heavily utilized **BullMQ** (on Redis) to decouple the fast API gateway from the slow, atomic transaction processing.

\`\`\`mermaid
flowchart TB
    subgraph Jujuja Backend
        API[NestJS API Gateway\\nFirebase Function]
        Worker[NestJS Worker Pool\\nFirebase Function]
        
        Queue[(Redis / BullMQ)]
        DB[(Firestore\\nTransactions)]
        
        Algolia[(Algolia\\nGeo-Search)]
        Twilio[Twilio SMS]
    end

    Client([Ionic Mobile App]) -->|Complete Quest POST| API
    Client -->|Search Stores| Algolia
    
    API -->|1. Enqueue Job| Queue
    Queue -.->|2. Pop Job| Worker
    
    Worker <-->|3. Atomic Update| DB
    Worker -->|4. Send OTP| Twilio
    Worker -->|5. Index Data| Algolia

    classDef core fill:#f0fdf4,stroke:#86efac,stroke-width:2px;
    classDef storage fill:#eff6ff,stroke:#93c5fd,stroke-width:2px;
    classDef external fill:#f8fafc,stroke:#cbd5e1,stroke-width:2px;
    
    class API,Worker core;
    class Queue,DB storage;
    class Algolia,Twilio external;
\`\`\`

## The Quest Completion Pipeline

When 1,500 users click "Claim Reward" simultaneously, a synchronous API architecture would lock the database 1,500 times, causing massive contention, timeouts, and a terrible user experience.

Instead, we used an asynchronous worker pipeline.

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor Mobile
    participant API as NestJS Gateway
    participant Q as BullMQ (Redis)
    participant W as Worker Pool
    participant DB as Firestore (Atomic)
    
    Mobile->>API: POST /quests/123/claim
    
    API->>Q: Enqueue { userID, questID }
    Q-->>API: JobID
    API-->>Mobile: 202 Accepted (Pending)
    
    Note over Mobile,API: Client begins polling or waits for push
    
    Q->>W: Process Job
    
    W->>DB: RunTransaction()
    Note over W,DB: 1. Check if already claimed<br/>2. Verify quest is active<br/>3. Add J-Points to balance<br/>4. Mark quest claimed
    DB-->>W: Transaction Success
    
    W->>Q: Mark Job Completed
    
    Note over W: Trigger Firebase FCM Push to notify Mobile
\`\`\`

### 1. The Gateway (Fast Accept)
The \`API Gateway\` does almost zero work. It performs basic JWT validation, constructs a job payload, pushes it to BullMQ, and immediately returns an HTTP \`202 Accepted\`. This ensures the API response time stays under 50ms, even during peak load.

### 2. The Worker (Atomic Process)
The \`Worker Pool\` pulls jobs from Redis at a controlled concurrency limit (e.g., 50 concurrent jobs). This acts as a shock absorber. The database never sees 1,500 concurrent connections; it only sees a steady stream of 50.

### 3. The Firestore Transaction (Idempotency)
Inside the worker, the actual reward logic runs in a Firestore ACID transaction. The transaction:
1. Reads the user's quest history to ensure they haven't already claimed it (Idempotency).
2. Reads the current J-Point balance.
3. Writes the new balance and the quest history record in a single atomic commit.

If a worker crashes halfway through, the job remains unacknowledged in BullMQ. After a timeout, BullMQ re-queues it. Because our Firestore transaction checks for prior completion, the retry is perfectly safe (idempotent).

## Dealing with Dead Letter Queues (DLQ)

Even with perfect code, external systems fail. What happens if Firestore goes down for 5 minutes during a burst?

BullMQ handles this with automatic exponential backoff retries. If a job fails 5 times, it is moved to a Dead Letter Queue (DLQ).

We built a custom admin dashboard that monitored the DLQ. If a spike in failed jobs occurred, our engineering team received a Slack alert. Once the underlying issue (e.g., a third-party outage) was resolved, we could click a single button in the dashboard to replay the entire DLQ, ensuring no user lost their hard-earned J-Points.

## Conclusion

Building Jujuja taught me that production engineering is less about writing perfect code and more about designing systems that degrade gracefully. By decoupling the API from the business logic via Redis and BullMQ, we turned a chaotic 1,500-user traffic spike into a calm, orderly queue of background jobs.
`;export{e as default};
