---
title: "Field Note: Why I Chose Firebase Functions Over Cloud Run"
date: "2026-06-03"
tags: ["system-architecture", "serverless", "firebase", "gcp", "trade-offs"]
related: ["system-design/designing-a-burst-traffic-async-job-pipeline", "research/algolia-geo-search-for-store-discovery"]
summary: "A practical evaluation of Firebase Functions vs Cloud Run, and why the simplest serverless model won out for our specific workloads."
reading_time: "8 min read"
---

In a recent architectural review for **SeensioGO**, we debated migrating our backend services from Firebase Cloud Functions (Gen 2) to Google Cloud Run. The theoretical benefits of Cloud Run are compelling: full container support, fine-grained concurrency control, and the ability to run multiple requests on a single instance to mitigate cold starts.

However, after running the numbers and evaluating our team's operational bandwidth, we chose to stick with Firebase Functions. Here is the reasoning behind that decision.

---

## Architectural Comparison

Although Firebase Functions (Gen 2) are built on top of Cloud Run under the hood, the developer experience and deployment flow are entirely different:

```
FIREBASE FUNCTIONS DEPLOYMENT PATH (Managed Abstraction)
[ NestJS/TS Code ] ──> `firebase deploy` ──> [ Firebase CLI ] ──> [ Cloud Run Instance ]
                                                                       ▲
                                                                       │ (Auto-wired)
                                                                [ Firestore/Auth Triggers ]

CLOUD RUN DIRECT PATH (Full Control)
[ Code + Dockerfile ] ──> [ Build Image ] ──> [ Registry ] ──> [ Cloud Run Config ] ──> [ VPC / Load Balancer Setup ]
```

---

## The Cost of Operational Complexity

Cloud Run requires you to think about Dockerfiles, registry management, image vulnerability scanning, and custom CI/CD pipelines for container deployment. While we are comfortable with Docker, adding this layer meant spending engineering cycles on infrastructure rather than business logic.

Firebase Functions allows us to deploy pure TypeScript/NestJS code with a single CLI command (`firebase deploy`). The abstraction layer it provides—automatically provisioning the underlying Cloud Run instances and wiring up IAM roles, EventArc triggers, and HTTPS routes—saves us hours of DevOps work every week.

### TypeScript / NestJS Firebase Functions Gen 2 Integration

Here is a look at how we integrate our NestJS API server directly into a Firebase Gen 2 Function handler:

```typescript
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { onRequest } from 'firebase-functions/v2/https';
import * as express from 'express';

const expressServer = express();

const createFunctionHandler = async () => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressServer)
  );
  
  app.enableCors();
  await app.init();
};

// Initialize server asynchronously and handle requests
const bootstrapPromise = createFunctionHandler();

export const api = onRequest({
  region: 'asia-east1',
  memory: '1GiB',
  minInstances: 1, // Keep 1 instance warm to eliminate cold starts on API
  maxInstances: 10,
  concurrency: 80, // Allow up to 80 concurrent connections per instance (Gen 2 feature)
}, async (req, res) => {
  await bootstrapPromise;
  expressServer(req, res);
});
```

---

## The Cold Start Reality

The most common argument against serverless functions is cold start latency. For our use case, we analyzed our traffic patterns:

- **Admin APIs**: Used sporadically. A 2-second cold start is entirely acceptable for an internal dashboard.
- **Client APIs**: Highly concurrent during the day. Because the traffic is sustained, the instances stay warm. We only experience cold starts during the initial ramp-up, which affects less than `0.5%` of total requests.

For the few critical endpoints where a 2-second delay was unacceptable, we simply enabled `minInstances: 1`, ensuring a warm instance is always available. The cost of keeping a few instances warm was drastically cheaper than the engineering hours required to migrate to a custom Cloud Run setup.

---

## Pricing Curve and Cost Breakdown

One of the major decision points was the billing differences between the two abstractions:

$$\text{Firebase Functions Billing} = \text{Invocations} + \text{CPU/Memory Duration}$$
$$\text{Cloud Run Billing} = \text{Active Instance Time} \times (\text{Allocated CPU} + \text{Allocated Memory})$$

On Cloud Run, if you set concurrency to 80 and have sporadic requests, you pay for the instance being active even if it only handles 1 request. On Firebase Functions, it scales down to zero very cleanly, and the invocation pricing model is highly optimized for developer testing.

### Feature Trade-offs Comparison

| Dimension | Firebase Cloud Functions (Gen 2) | Google Cloud Run |
| :--- | :--- | :--- |
| **Packaging** | Zip deployment of Javascript/Typescript | Custom Docker Image (Any language) |
| **Triggers** | Direct Firestore, Auth, Storage triggers | HTTPS, Pub/Sub, EventArc (Manual) |
| **Concurrency** | Supported up to 80 requests/instance | Supported up to 250 requests/instance |
| **DevOps Overhead** | Near Zero (Managed by Firebase CLI) | Moderate (Requires Docker, Artifact Registry, IAM) |
| **Local Testing** | Rich Emulator Suite (Auth, Firestore, Functions) | Local Docker run / gcloud emulators |

---

## Key Takeaways

1. **Cold start latency is manageable**: Rather than rewriting architecture, use configurations like `minInstances: 1` to resolve latency on critical user-facing paths.
2. **Value developer velocity over minor cost savings**: If your team is small, the extra infrastructure management of Cloud Run will slow down feature delivery.
3. **Gen 2 is a game-changer**: Because Firebase Functions Gen 2 is built on Cloud Run, it inherits high concurrency support (up to 80 parallel requests). This eliminates the old Gen 1 behavior where each concurrent request spawned a new cold-starting instance.
