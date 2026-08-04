---
title: "Field Note: Go vs TypeScript for Backend Services"
date: "2026-06-28"
tags: ["go", "typescript", "backend", "language-comparison", "architecture", "trade-offs"]
summary: "A working engineer's honest comparison of Go and TypeScript for backend services, based on using both in production — and a framework for choosing between them."
reading_time: "8 min read"
---

I have built production backend services in both Go and TypeScript. Not as academic exercises — as systems that serve real users, handle real money, and wake me up at night when they break.

This is not a language war post. It is a decision framework: here is what I have learned about when each language genuinely wins, and when reaching for one over the other would be a mistake.

---

## The Projects

To anchor this in reality:

| Project | Language | Why That Choice |
|:---|:---|:---|
| **Aegis** (Auth Platform) | Go | gRPC, performance, long-lived daemons |
| **Event-Driven Core Banking** | Go | Goroutine concurrency model, low GC overhead |
| **ScrapeAndDown** (CLI) | Go | Single binary, zero runtime dependencies |
| **SeensioGO** | TypeScript (NestJS) | Firebase Functions, Firestore SDK, team velocity |
| **Jujuja** | TypeScript (NestJS) | Same Firebase stack, rapid iteration needed |
| **QuantAlpha Lab API** | Go | Low-latency, concurrent order processing |
| **QuantAlpha ML Worker** | Python | scikit-learn ecosystem — no contest there |

The pattern emerges quickly: Go for systems that need to run a long time and handle concurrent load; TypeScript for Firebase-first projects where tight SDK integration and rapid feature delivery matter more.

---

## Concurrency: The Biggest Real Difference

This is where Go genuinely separates itself.

In Go, spawning 10,000 concurrent operations is idiomatic:

```go
// Processing 10,000 account events concurrently in the Core Banking system.
// Each goroutine is ~2KB of stack — the runtime grows it as needed.
func processBatch(ctx context.Context, events []AccountEvent) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(50) // Cap concurrency at 50 to avoid DB contention

    for _, event := range events {
        event := event // capture loop variable
        g.Go(func() error {
            return applyEvent(ctx, event)
        })
    }

    return g.Wait()
}
```

The TypeScript equivalent requires explicit worker pools, and Node's single-threaded event loop means CPU-bound work (like Argon2id hashing or fraud scoring) blocks all other requests unless offloaded to worker_threads:

```typescript
// TypeScript: CPU-bound work must be offloaded to avoid blocking the event loop
import { Worker } from 'worker_threads';

async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // If we ran argon2.hash() directly, it would block the event loop for ~100ms
    // during which NO other requests can be served
    const worker = new Worker('./argon2-worker.js', {
      workerData: { password }
    });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}
```

Go's scheduler handles this transparently. TypeScript requires explicit architectural intervention.

**Winner for concurrency: Go** — by a significant margin.

---

## Firebase/Firestore SDK Integration

This is where TypeScript wins, and wins decisively.

The Google Firebase Admin SDK is primarily a JavaScript/TypeScript library. The Go Firestore SDK exists, and we use it in Core Banking, but the TypeScript SDK is the canonical implementation with:
- First-class transaction support with clean async/await syntax
- Firestore security rules that co-evolve with the TypeScript type system
- Firebase Functions Gen 2 hosting that eliminates infrastructure entirely
- Auth trigger, Firestore trigger, and HTTPS trigger co-location in one codebase

In SeensioGO and Jujuja, deploying a new Firestore-backed endpoint looked like this:

```typescript
// A complete, production-ready Firebase Function in 20 lines
import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

export const getStoreSummary = onRequest(
  { region: 'asia-east1', memory: '512MiB', minInstances: 1 },
  async (req, res) => {
    const storeId = req.query.storeId as string;
    const doc = await admin.firestore().collection('stores').doc(storeId).get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    res.json(doc.data());
  }
);
```

Deploying that is `firebase deploy`. There is no Docker image to build, no Kubernetes manifest to write, no IAM role to configure. For a small team shipping features fast, this is transformative.

**Winner for Firebase ecosystem: TypeScript** — not even close.

---

## Error Handling Philosophy

Go's explicit error returns force you to handle every failure:

```go
func debitAccount(ctx context.Context, id string, amount int64) error {
    account, err := repo.GetByID(ctx, id)
    if err != nil {
        return fmt.Errorf("fetching account %s: %w", id, err) // Error chain preserved
    }

    if account.Balance < amount {
        return ErrInsufficientFunds // Typed domain error
    }

    return repo.UpdateBalance(ctx, id, account.Balance-amount)
}
```

TypeScript's `try/catch` model makes it easy to accidentally swallow errors or lose context:

```typescript
// Common TypeScript anti-pattern: broad catch loses error context
async function debitAccount(id: string, amount: number): Promise<void> {
  try {
    const account = await repo.getById(id);
    if (account.balance < amount) throw new InsufficientFundsError();
    await repo.updateBalance(id, account.balance - amount);
  } catch (err) {
    // Did we catch a DB error, a validation error, or InsufficientFundsError?
    // All treated identically here.
    throw new Error('Debit failed');
  }
}
```

Go's error model produces code that is slightly more verbose but significantly more reliable. TypeScript's model is friendlier for rapid prototyping but requires discipline to maintain in large codebases.

**Winner for error handling safety: Go.**

---

## Binary Distribution and Deployment

Go compiles to a single static binary with zero runtime dependencies:

```bash
# Build the Aegis Identity Service for Linux
GOOS=linux GOARCH=amd64 go build -o ./bin/identity-service ./cmd/identity

# The result: a ~15MB binary you can copy anywhere and run immediately
# No Node.js, no npm, no virtual environment
```

TypeScript requires Node.js, `node_modules`, and careful management of the deployment artifact size. For a Firebase Functions deployment, the SDK handles this. For a self-hosted service, it is additional operational overhead.

**Winner for deployment simplicity: Go** (for self-hosted). **TypeScript wins** when Firebase Functions manages the runtime.

---

## The Decision Framework

Rather than memorizing language features, I apply four questions:

```
1. Does this service have sustained concurrent load (>100 req/s)?
   └── Yes → Go
   └── No  → TypeScript is fine

2. Is this service deeply integrated with Firebase?
   └── Yes → TypeScript (NestJS + Firebase Functions)
   └── No  → Go

3. Will this run as a long-lived daemon (worker, gRPC server, CLI)?
   └── Yes → Go
   └── No  → TypeScript is fine

4. Does the team have < 3 engineers and needs to ship fast?
   └── Yes → TypeScript (ecosystem breadth, lower ceremony)
   └── No  → Evaluate by the above
```

---

## What I Would Never Use Each For

| Scenario | Bad Choice | Why |
|:---|:---|:---|
| Firebase Firestore + Auth triggers | Go | SDK is second-class; missing trigger framework |
| gRPC microservice with OTel | TypeScript | Go's tooling is dramatically more mature |
| scikit-learn ML pipeline | Either — use Python | No real ML ecosystem in Go or TS |
| CPU-bound hash verification | TypeScript | Blocks event loop; needs worker_threads workaround |
| Rapid admin dashboard CRUD API | Go | Too much ceremony for straightforward CRUD |

---

## Key Takeaways

1. **Go wins on concurrency, deployment, and gRPC ecosystems.** For any service that needs to handle sustained load or run as a daemon, Go's goroutine model and static binary are decisive advantages.
2. **TypeScript wins on Firebase and developer velocity.** When your infrastructure is Firebase Functions + Firestore, the TypeScript SDK is the canonical implementation — fighting it with Go costs significant development time.
3. **The stack should follow the deployment model.** Firebase Functions → TypeScript. Self-hosted gRPC → Go. The wrong language in the wrong deployment context creates more friction than any performance concern.
4. **Neither is universally better.** The most valuable skill is recognizing which constraints dominate a given project and choosing accordingly, not defending a language preference.
