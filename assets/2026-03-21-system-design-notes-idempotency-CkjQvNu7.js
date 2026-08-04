const e=`---
title: "System Design Notes: Idempotency"
date: "2026-03-21"
tags: ["idempotency", "api-design", "distributed-systems", "resilience"]
summary: "Practical patterns for making API writes replay-safe under network retries and partial distributed failures."
reading_time: "10 min read"
---

## Why Idempotency Matters

In any distributed system, the network is inherently unreliable. Clients will experience timeouts, load balancers will drop connections, and services will occasionally crash mid-request.

To cope with this, clients *must* retry failed requests. Retries are healthy and necessary for resilience. However, if a client retries a payment request that actually succeeded on the backend (but the response was lost in transit), the user gets charged twice. Duplicate side effects are catastrophic.

This is where **idempotency** comes in: the property that a given operation can be applied multiple times without changing the result beyond the initial application.

---

## The Core Pattern: The Idempotency Key

The standard approach is to require the client to generate a unique \`Idempotency-Key\` (usually a UUID v4) and pass it in the HTTP header for all mutating (\`POST\`, \`PUT\`, \`PATCH\`) requests.

The backend request lifecycle looks like this:

\`\`\`
Client                  API Gateway / Backend               Redis Cache / DB
  |                               |                                |
  |-- POST /charge (Idemp-Key) -->|                                |
  |                               |-- GET key (Lock & Check) ----->|
  |                               |<-- Key Not Found --------------|
  |                               |                                |
  |                               |-- SET key (State: IN_PROGRESS) ->|
  |                               |                                |
  |                               |-- Execute Stripe Charge ------>|
  |                               |                                |
  |                               |-- UPDATE key (State: SUCCESS) ->|
  |                               |   (Store Response Payload)     |
  |<-- HTTP 200 (Success) --------|                                |
  |                               |                                |
  | [Client Retries Timeout]      |                                |
  |-- POST /charge (Idemp-Key) -->|                                |
  |                               |-- GET key -------------------->|
  |                               |<-- Response Found (SUCCESS) ---|
  |<-- HTTP 200 (Cached Response)-|                                |
\`\`\`

### Scoping the Key

An idempotency key shouldn't be global. It should be scoped by **actor** (User ID) and **operation intent**. For example, a key might be compound: \`user:123:create_order:uuid-456\`. This prevents accidental collisions between different users who might generate the same UUID or malicious users trying to guess other users' keys.

---

## Technical Implementation (NestJS + Redis)

Here is a concrete implementation of an Idempotency Interceptor in NestJS using Redis (\`ioredis\`) for locking, payload verification, and response caching.

### 1. The Interceptor Code

\`\`\`typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import * as crypto from 'crypto';
import Redis from 'ioredis';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  // Generate a SHA256 hash of the request body to detect payload mismatches
  private hashPayload(payload: any): string {
    const serialized = JSON.stringify(payload || {});
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    
    // Only apply idempotency to mutating requests
    if (!['POST', 'PUT', 'PATCH'].includes(request.method)) {
      return next.handle();
    }

    const idempotencyKey = request.headers['x-idempotency-key'];
    const userId = request.headers['x-user-id']; // Scoping factor

    if (!idempotencyKey) {
      // Decide if you want to enforce it or bypass
      throw new BadRequestException('X-Idempotency-Key header is required for this operation.');
    }

    const cacheKey = \`idemp:\${userId}:\${idempotencyKey}\`;
    const currentPayloadHash = this.hashPayload(request.body);

    // 1. Try to acquire lock and check cache atomically
    const cachedData = await this.redis.get(cacheKey);

    if (cachedData) {
      const { state, payloadHash, response } = JSON.parse(cachedData);

      // Check if client is sending different parameters under the same key
      if (payloadHash !== currentPayloadHash) {
        throw new ConflictException('Idempotency key collision: Payload mismatch.');
      }

      if (state === 'IN_PROGRESS') {
        throw new ConflictException('Operation is already in progress. Please retry later.');
      }

      // Return cached response directly
      return of(response);
    }

    // 2. Set key to IN_PROGRESS to lock the request
    // Set 5 minutes timeout for in-progress locks to prevent deadlocks
    await this.redis.set(
      cacheKey,
      JSON.stringify({ state: 'IN_PROGRESS', payloadHash: currentPayloadHash }),
      'EX',
      300
    );

    // 3. Process request and cache output
    return next.handle().pipe(
      map(async (response) => {
        // Cache the successful response for 24 hours
        await this.redis.set(
          cacheKey,
          JSON.stringify({
            state: 'SUCCESS',
            payloadHash: currentPayloadHash,
            response,
          }),
          'EX',
          86400
        );
        return response;
      })
    );
  }
}
\`\`\`

---

## Handling Edge Cases and Conflicts

What happens if a client sends the same idempotency key, but the JSON payload is different?

This is a dangerous edge case. If you blindly accept it and return the cached response, the client might mistakenly believe their *new* payload was processed. If you process it, you break the idempotency contract.

**The Rule**: Fail fast. Hash the incoming payload and store it alongside the idempotency key. If a request arrives with an existing key but a mismatched payload hash, return a \`400 Bad Request\` or \`409 Conflict\` with explicit details about the mismatch.

### HTTP Response Mapping for Idempotency Failures

| Scenario | HTTP Status Code | Response Body | Action Required |
| :--- | :--- | :--- | :--- |
| **Missing Key** | \`400 Bad Request\` | \`{"message": "Idempotency key required"}\` | Generate UUID and retry |
| **Concurrent Double Submit** | \`409 Conflict\` | \`{"message": "Request already in progress"}\` | Backoff and retry with same key |
| **Payload Mismatch** | \`409 Conflict\` | \`{"message": "Payload mismatch for key"}\` | Correct parameters or use new key |
| **Key Expired (>24h)** | \`200 OK (Fresh)\` | *Standard Success Response* | Will execute as a brand new request |

---

## The Golden Rule of Persistence

Make the idempotency persistence durable *before* issuing any external side effects (like charging a credit card or sending an email). If you send an email and then fail to save the idempotency record to the database, the next retry will send a second email. 

In distributed systems, this is solved by using **Distributed Transactions** or **Saga Patterns**. In simpler setups:
1. Initialize the idempotency key in your local DB (with status \`DRAFT\` or \`IN_PROGRESS\`) in the same transaction as your user records.
2. Trigger the external API call (e.g. Stripe).
3. Update the DB status to \`SUCCESS\` and store the transaction reference.
4. If step 2 fails, update the status to \`FAILED\`. A retry will then see \`FAILED\` and know it is safe to attempt the external call again.
`;export{e as default};
