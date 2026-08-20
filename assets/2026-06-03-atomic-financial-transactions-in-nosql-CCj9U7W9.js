const n=`---
title: "Atomic Financial Transactions in a NoSQL World: Building the J-Point Loyalty Engine"
date: "2026-06-03"
tags: ["firestore", "nosql", "distributed-systems", "transactions", "atomic-operations"]
related: ["blog/building-jujuja-a-production-quest-system", "research/event-sourcing-vs-crud-when-to-choose-each"]
summary: "Implementing virtual currency transactions on Firestore with <1% consistency errors, covering atomic operation design and edge case handling."
reading_time: "9 min read"
---

## The Challenge

Building a virtual currency system ("J-Points") on a NoSQL database like Cloud Firestore comes with a unique set of challenges. Unlike traditional SQL databases with strong ACID guarantees and lock-based execution, NoSQL stores are typically designed for horizontal scaling and eventual consistency. 

However, when dealing with financial data—even virtual loyalty points—consistency cannot be compromised. Our goal was to build a system that guarantees:
- **Zero Double-Spending**: Users cannot concurrent-submit requests to spend points they do not have.
- **Audit Traceability**: Every balance change must have a corresponding immutable ledger entry.
- **Scalability**: High throughput for point additions without hitting database hotspot limits.

---

## Transaction Design in Firestore

Firestore provides atomic transactions, but they behave differently from SQL databases. Instead of using Pessimistic Locking (where database records are locked during write operations), Firestore uses **Optimistic Concurrency Control (OCC)**.

\`\`\`
Client A                    Firestore Transaction                   Client B
   │                                  │                                 │
   │─── 1. Read balance ($100) ──────►│                                 │
   │                                  │◄── 2. Read balance ($100) ──────│
   │                                  │                                 │
   │─── 3. Commit deduction ($20) ───►│ (Succeeds!)                     │
   │                                  │                                 │
   │                                  │─── 4. Commit deduction ($90) ──►│ (Fails! Version Drift)
   │                                  │                                 │
   │                                  │─── 5. Auto Retry Transaction ──►│
   │                                  │     (Reads new balance: $80)    │
   │                                  │     (Fails validation $80<$90)  │
   │                                  │◄─── 6. Return Error 400 ────────│
\`\`\`

Inside an OCC transaction, all read operations must occur *before* any write operations. When the transaction commits, Firestore checks if any of the read documents were modified by another client during the transaction's execution. If any document changed, the transaction aborts and automatically retries (up to 5 times).

---

## Technical Implementation: Point Deduction

Here is the complete NestJS service implementing a safe point deduction transaction using the Google Firebase Admin SDK:

\`\`\`typescript
import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class LoyaltyEngineService {
  private readonly db = admin.firestore();

  async deductPoints(userId: string, amount: number, transactionId: string): Promise<void> {
    if (amount <= 0) {
      throw new BadRequestException('Deduction amount must be positive.');
    }

    const userRef = this.db.collection('users').doc(userId);
    const auditLogRef = this.db.collection('jpoint_audit_logs').doc(transactionId);

    try {
      await this.db.runTransaction(async (transaction) => {
        // 1. Read User Balance (Must be done first in OCC)
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) {
          throw new BadRequestException('User account does not exist.');
        }

        const userData = userSnap.data() || {};
        const currentBalance = userData.jpoints || 0;

        // 2. Validate Invariants
        if (currentBalance < amount) {
          throw new BadRequestException(\`Insufficient points. Current: \${currentBalance}, Required: \${amount}\`);
        }

        // 3. Check for Duplicate Transaction ID (Idempotency check inside transactional boundary)
        const duplicateSnap = await transaction.get(auditLogRef);
        if (duplicateSnap.exists) {
          throw new ConflictException('Transaction already processed.');
        }

        // 4. Update Balance
        const newBalance = currentBalance - amount;
        transaction.update(userRef, { 
          jpoints: newBalance,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 5. Append Immutable Audit Log
        transaction.set(auditLogRef, {
          userId,
          amount: -amount,
          type: 'DEBIT',
          status: 'SUCCESS',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      throw new Error(\`Failed to execute point transaction: \${error.message}\`);
    }
  }
}
\`\`\`

---

## Bypassing Database Hotspots (Event Sourcing)

Firestore enforces a limit of **1 write per second to a single document**. If 500 users complete quests simultaneously and add points to a global store account, the transactions will fail continuously due to OCC collisions.

To bypass this limit, we adopted a **sharded ledger / event-sourcing** pattern:

\`\`\`
[ Quest Completed Event ] ──► [ Append Event to User's \`point_events\` subcollection ] (No Contention)
                                        │
                                        ▼ (Asynchronous)
                         [ Background Aggregator Worker ]
                                        │
                                        ▼ (Aggregated batch update)
                         [ Consolidated User Balance Document ] (1 write/min)
\`\`\`

By appending events rapidly to a subcollection and aggregating them asynchronously via a cron job, we moved the bottleneck away from the hot master document, sustaining over 100 writes per second.

---

## Ledger Reconciliation

Even with atomic transactions, system inconsistencies can occur due to unhandled edge cases or manual administrative modifications. We write a daily reconciliation script to ensure our data matches perfectly:

\`\`\`typescript
import * as admin from 'firebase-admin';

async function reconcileUserBalance(userId: string) {
  const db = admin.firestore();
  
  // 1. Read cached balance
  const userSnap = await db.collection('users').doc(userId).get();
  const cachedBalance = userSnap.data()?.jpoints || 0;

  // 2. Aggregate all audit logs for user
  const logsSnap = await db.collection('jpoint_audit_logs')
    .where('userId', '==', userId)
    .get();

  let calculatedBalance = 0;
  logsSnap.forEach((doc) => {
    calculatedBalance += doc.data().amount; // Sums positive and negative transactions
  });

  // 3. Verify alignment
  if (cachedBalance !== calculatedBalance) {
    console.error(\`ALERT: Data Drift detected for User \${userId}! Cached: \${cachedBalance}, Audited: \${calculatedBalance}\`);
    
    // Auto-align and log error to Slack/Ops dashboard
    await db.collection('users').doc(userId).update({
      jpoints: calculatedBalance,
      reconciliationFlags: {
        driftDetected: true,
        lastDriftAmount: cachedBalance - calculatedBalance,
        alignedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    });
  } else {
    console.log(\`User \${userId} balance is in sync.\`);
  }
}
\`\`\`

---

## SQL vs. Firestore OCC Transactions

| Dimension | SQL (PostgreSQL / MySQL) | Firestore (NoSQL OCC) |
| :--- | :--- | :--- |
| **Locking Strategy** | Pessimistic (Locks rows on writes) | Optimistic (Checks versions on commit) |
| **Resource Contention** | Requests wait in line (increases latency) | Aborts immediately and retries |
| **Scale Constraints** | Limited by connection pool | Limit of 1 write/sec per document |
| **Fail Behavior** | Blocks until timeout | Throws exception on collision |

## Key Takeaways

1. **Firestore transactions require OCC awareness**: Keep the read set small. Any read inside a transaction makes it vulnerable to retry loops.
2. **Reconciliation is not optional**: An asynchronous ledger reconciliation job must run daily to audit balance drift.
3. **Write logs transactionally, aggregate asynchronously**: Always pair balance edits with log insertions in a single transaction to maintain history integrity.
`;export{n as default};
