/**
 * The real Token Bucket, Leaky Bucket, and Fixed Window Counter algorithms — not modelled
 * approximations. Each function takes a timeline of request arrival times (seconds since the
 * simulation started) and returns, per arrival, whether the algorithm actually allowed it and
 * what its internal state was at that moment. `RateLimitingAlgorithmsPage` drives these with
 * user-chosen sliders; this module has no dependency on React or the DOM, which is what makes it
 * unit-testable and — per `.ai/prompts/benchmark-study.md` — genuinely `implementation`, not
 * `model`, provenance (see `src/labs/provenance.ts`).
 *
 * All three take the same shape (`arrivals: number[]` in) and return the same shape (`RateLimitStep[]`
 * out) precisely so a caller can run the identical arrival timeline through all three and compare
 * how each one actually handles the same burst — which is the whole pedagogical point of the lab:
 * these algorithms are not three tuning knobs on one idea, they make different admission decisions
 * on identical input.
 */

export interface RateLimitStep {
  /** Arrival time in seconds since the simulation started. */
  t: number;
  allowed: boolean;
  /**
   * The algorithm's internal state immediately after processing this arrival — tokens remaining
   * (Token Bucket), queue level (Leaky Bucket), or count-so-far-in-window (Fixed Window). Plotted
   * directly by the lab page so the state that actually produced the accept/reject decision is
   * visible, not just the decision itself.
   */
  state: number;
}

/**
 * Token Bucket: a bucket holding up to `capacity` tokens, refilling continuously at `refillPerSec`
 * tokens/second. Each arrival consumes one token if available; if the bucket is empty, the request
 * is rejected. Refill is computed from real elapsed time between arrivals (`t` deltas), not a fixed
 * per-tick amount, so a long gap between requests genuinely refills the bucket rather than capping
 * refill at some per-step maximum — the actual behaviour of a production token bucket limiter.
 */
export function simulateTokenBucket(arrivals: number[], capacity: number, refillPerSec: number): RateLimitStep[] {
  let tokens = capacity;
  let lastT = 0;

  return arrivals.map((t) => {
    const elapsed = Math.max(0, t - lastT);
    tokens = Math.min(capacity, tokens + elapsed * refillPerSec);
    lastT = t;

    const allowed = tokens >= 1;
    if (allowed) {
      tokens -= 1;
    }

    return { t, allowed, state: tokens };
  });
}

/**
 * Leaky Bucket (as a queue, not a meter): a bucket holding up to `capacity` requests, draining at
 * `leakPerSec` requests/second. An arrival is accepted (queued) if the bucket has room after
 * leaking for the elapsed time since the previous arrival; otherwise it overflows and is rejected.
 * This is the "leaky bucket as queue" formulation — smooths bursts into a steady output rate rather
 * than admitting them immediately the way Token Bucket does, which is the actual behavioural
 * difference the lab exists to show, not just a relabeled Token Bucket.
 */
export function simulateLeakyBucket(arrivals: number[], capacity: number, leakPerSec: number): RateLimitStep[] {
  let queueLevel = 0;
  let lastT = 0;

  return arrivals.map((t) => {
    const elapsed = Math.max(0, t - lastT);
    queueLevel = Math.max(0, queueLevel - elapsed * leakPerSec);
    lastT = t;

    const allowed = queueLevel < capacity;
    if (allowed) {
      queueLevel += 1;
    }

    return { t, allowed, state: queueLevel };
  });
}

/**
 * Fixed Window Counter: time is divided into consecutive `windowSeconds`-wide windows starting at
 * t=0; each window allows up to `limit` requests, and the counter resets hard at every window
 * boundary. This is deliberately the naive algorithm, boundary flaw included — two bursts of
 * `limit` requests either side of a window edge (e.g. one at t=0.99s, one at t=1.01s for a 1s
 * window) are both admitted, letting up to ~2x `limit` through in the ~1s spanning the boundary.
 * That is not a bug in this implementation; it is *the* reason Fixed Window is usually the wrong
 * choice for anything bursty, and the lab's job is to make that failure visible, not hide it.
 */
export function simulateFixedWindow(arrivals: number[], windowSeconds: number, limit: number): RateLimitStep[] {
  let currentWindow = -1;
  let countInWindow = 0;

  return arrivals.map((t) => {
    // `windowSeconds <= 0` has no valid window index (`t / 0` is `NaN`/`Infinity`, and `NaN` is
    // never `=== currentWindow`, which would otherwise reset the count on every single arrival and
    // bypass `limit` entirely). Unreachable via the shipped lab (its "Window size" slider has a
    // 0.5 minimum), but this function is exported and callable directly, so it degrades to "one
    // window for the whole run" rather than silently admitting everything.
    const window = windowSeconds > 0 ? Math.floor(t / windowSeconds) : 0;
    if (window !== currentWindow) {
      currentWindow = window;
      countInWindow = 0;
    }

    const allowed = countInWindow < limit;
    if (allowed) {
      countInWindow += 1;
    }

    return { t, allowed, state: countInWindow };
  });
}

/**
 * Builds an arrival timeline for the lab's sliders: a sustained stream at `sustainedPerSec` for
 * `durationSeconds`, plus one optional burst of `burstSize` requests injected simultaneously at
 * `burstAtSecond` — the scenario that actually separates the three algorithms. A pure sustained
 * rate below every algorithm's throughput admits everything and shows nothing interesting; the
 * burst is what exposes Token Bucket absorbing it (up to capacity), Leaky Bucket queuing then
 * overflowing it, and Fixed Window either absorbing or doubly-admitting it depending on which side
 * of a window boundary it lands on.
 */
export function buildArrivalTimeline(
  sustainedPerSec: number,
  durationSeconds: number,
  burstSize: number,
  burstAtSecond: number
): number[] {
  const arrivals: number[] = [];
  if (sustainedPerSec > 0) {
    const step = 1 / sustainedPerSec;
    // Computed as `i * step` from an integer tick count, not accumulated via `t += step` — the
    // accumulated form loses the last tick at several UI-reachable rates (e.g. 4.5, 5, 9, 10 req/s
    // over a 4s duration) because binary floating-point error pushes the final sum fractionally
    // past `durationSeconds` before the loop condition is checked. `1e-9` absorbs the same class of
    // error in the other direction, in the tick-count calculation itself.
    const tickCount = Math.floor(durationSeconds * sustainedPerSec + 1e-9);
    for (let i = 1; i <= tickCount; i += 1) {
      arrivals.push(i * step);
    }
  }

  for (let i = 0; i < burstSize; i += 1) {
    // Burst requests share one timestamp — a real burst arrives effectively simultaneously, not
    // spread evenly across a tick. A tiny per-request offset (1 microsecond) keeps timestamps
    // distinct for stable sorting without being a meaningfully different arrival time.
    arrivals.push(burstAtSecond + i * 1e-6);
  }

  return arrivals.sort((a, b) => a - b);
}
