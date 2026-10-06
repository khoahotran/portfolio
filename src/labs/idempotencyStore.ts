/**
 * Idempotency-key store — the "return the same result instead of doing the work twice" pattern
 * behind every payment API's `Idempotency-Key` header. The TTL-scoped result cache half of this
 * (`content/blog/2026-03-21-system-design-notes-idempotency.md`'s own worked example) is the easy
 * part. The actual interesting part, modelled here, is the race the TTL cache alone does nothing
 * about: **a second request for the same key that arrives while the first is still being
 * processed** — a genuine concurrent duplicate (a client double-clicking "Pay", a retried request
 * whose original response was merely lost in transit, not yet returned), not a replay after
 * completion.
 *
 * Two designs, run against the identical arrival sequence so the comparison is measured:
 *
 * - `check-then-set` — check a completed-results cache; if nothing is there, proceed to process
 *   and write the result when done. This is the shape of that existing article's own NestJS
 *   sample: `GET cacheKey` (the check), then, once processing finishes, `SET cacheKey ...` (the
 *   write) — two separate operations, not one atomic one. A second request that arrives while the
 *   first is mid-flight finds nothing in the completed cache either (the first hasn't written its
 *   result yet), so it proceeds to process too. **That's a real double-processing race, not a
 *   hypothetical** — `simulateIdempotencyStore('check-then-set', ...)` runs it and counts it.
 * - `atomic-claim` — an in-flight claim happens atomically with the completed-cache check (the
 *   Redis equivalent is a single `SET key val NX EX ttl`, not a `GET` followed by a later `SET`).
 *   A concurrent duplicate sees the claim and **coalesces**: it waits for the in-flight request's
 *   result instead of starting its own, and both requests resolve to the same `resultId` — the
 *   thing `check-then-set` cannot do at all, because it never records that a request is in flight
 *   in the first place.
 *
 * A cache-hit after the TTL-scoped result is written resolves instantly under both designs — the
 * difference between them is entirely about what happens to a duplicate that arrives *before*
 * that result exists yet.
 */

export type IdempotencyMode = 'check-then-set' | 'atomic-claim';

export type RequestOutcome =
  /** This request's own processing run produced the result — no prior result or in-flight run existed for this key. */
  | 'processed'
  /** check-then-set only: this request started its own processing run despite another run for the
   * same key already being in flight, because check-then-set never records in-flight state at all
   * — the race this lab exists to demonstrate. */
  | 'duplicate-processed'
  /** atomic-claim only: this request found an in-flight run for the same key and waited for its
   * result instead of starting its own — the fix. */
  | 'coalesced'
  /** A completed, still-within-TTL result already existed for this key — resolved immediately, no processing. */
  | 'cache-hit';

export interface IdempotencyRequestInput {
  key: string;
  arrivalTick: number;
}

export interface RequestResult {
  key: string;
  arrivalTick: number;
  /** The tick this request's response was actually ready — equal to arrivalTick for a cache-hit,
   * later for anything that had to wait on processing (its own or an in-flight one it coalesced onto). */
  resolvedTick: number;
  outcome: RequestOutcome;
  /** Which processing execution produced this request's result. Two requests sharing a resultId
   * proves they got the same result without double work — the thing to check for `coalesced` and
   * `cache-hit` outcomes. A `duplicate-processed` request always gets its own fresh resultId,
   * proving it did its own redundant work rather than sharing the original's. */
  resultId: number;
}

export interface IdempotencySimulation {
  mode: IdempotencyMode;
  results: RequestResult[];
  /** Count of distinct processing executions actually run — 'processed' + 'duplicate-processed'.
   * The real cost metric: every one of these did full work (a real charge, a real email send). */
  totalExecutions: number;
  totalCacheHits: number;
  totalCoalesced: number;
  /** The race condition count — always 0 under atomic-claim by construction. */
  totalDuplicateProcessed: number;
}

interface ActiveRun {
  resultId: number;
  completesAtTick: number;
}

interface CompletedResult {
  resultId: number;
  completedTick: number;
  ttlExpiresTick: number;
}

/**
 * Runs `requests` (any order; re-sorted by arrivalTick, ties broken by input order) through one
 * key-store design. `processingTicks` and `ttlTicks` are shared by every key and every run, so the
 * only variable between two calls with the same `requests` is `mode` — this is what makes
 * `totalDuplicateProcessed` under `check-then-set` vs `atomic-claim` a real, comparable measurement.
 */
export function simulateIdempotencyStore(
  mode: IdempotencyMode,
  requests: IdempotencyRequestInput[],
  processingTicks: number,
  ttlTicks: number
): IdempotencySimulation {
  if (processingTicks < 1) {
    throw new Error('simulateIdempotencyStore requires processingTicks >= 1');
  }
  if (ttlTicks < 1) {
    throw new Error('simulateIdempotencyStore requires ttlTicks >= 1');
  }

  const order = requests
    .map((request, index) => ({ request, index }))
    .sort((a, b) => a.request.arrivalTick - b.request.arrivalTick || a.index - b.index);

  const byKey = new Map<string, { request: IdempotencyRequestInput; index: number }[]>();
  for (const entry of order) {
    const list = byKey.get(entry.request.key) ?? [];
    list.push(entry);
    byKey.set(entry.request.key, list);
  }

  const resultsByIndex = new Array<RequestResult>(requests.length);
  let nextResultId = 1;

  for (const entries of byKey.values()) {
    // check-then-set can have several runs simultaneously active for the same key (that's the
    // bug); atomic-claim can only ever have zero or one. Both are represented as a list so the
    // same loop below handles both designs.
    let activeRuns: ActiveRun[] = [];
    let cached: CompletedResult | null = null;

    for (const { request, index } of entries) {
      const now = request.arrivalTick;

      // Apply the effect of any run that finished at or before `now`, in the temporal order they
      // actually completed, before deciding what this request sees — a request arriving after a
      // run's completesAtTick must observe that run's written result, not a stale in-flight state.
      const finished = activeRuns.filter((run) => run.completesAtTick <= now).sort((a, b) => a.completesAtTick - b.completesAtTick);
      for (const run of finished) {
        cached = { resultId: run.resultId, completedTick: run.completesAtTick, ttlExpiresTick: run.completesAtTick + ttlTicks };
      }
      activeRuns = activeRuns.filter((run) => run.completesAtTick > now);

      if (cached && now <= cached.ttlExpiresTick) {
        resultsByIndex[index] = { key: request.key, arrivalTick: now, resolvedTick: now, outcome: 'cache-hit', resultId: cached.resultId };
        continue;
      }

      if (mode === 'atomic-claim' && activeRuns.length > 0) {
        // At most one active run can exist under atomic-claim (enforced below), so this is the run to coalesce onto.
        const run = activeRuns[0];
        resultsByIndex[index] = {
          key: request.key,
          arrivalTick: now,
          resolvedTick: run.completesAtTick,
          outcome: 'coalesced',
          resultId: run.resultId,
        };
        continue;
      }

      // Either there's no active run, or this is check-then-set (which never looks at activeRuns
      // at all before deciding to start one — that omission is the entire bug being demonstrated).
      const resultId = nextResultId++;
      const completesAtTick = now + processingTicks;
      const outcome: RequestOutcome = mode === 'check-then-set' && activeRuns.length > 0 ? 'duplicate-processed' : 'processed';
      activeRuns.push({ resultId, completesAtTick });
      resultsByIndex[index] = { key: request.key, arrivalTick: now, resolvedTick: completesAtTick, outcome, resultId };
    }
  }

  const results = resultsByIndex;
  const totalExecutions = results.filter((r) => r.outcome === 'processed' || r.outcome === 'duplicate-processed').length;
  const totalCacheHits = results.filter((r) => r.outcome === 'cache-hit').length;
  const totalCoalesced = results.filter((r) => r.outcome === 'coalesced').length;
  const totalDuplicateProcessed = results.filter((r) => r.outcome === 'duplicate-processed').length;

  return { mode, results, totalExecutions, totalCacheHits, totalCoalesced, totalDuplicateProcessed };
}
