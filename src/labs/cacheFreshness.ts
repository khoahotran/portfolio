/**
 * Cache freshness policies — what a CDN/edge cache actually does when a cached entry's TTL expires
 * and a request arrives, run against the same origin-update schedule and the same origin outage
 * window, so the only variable between policies is the policy itself. Three real, distinct
 * decision procedures, not three names for "cache things":
 *
 * - `ttl-blocking` — the naive default. Fresh (age < TTL): serve instantly from cache. Expired:
 *   block the request on a synchronous origin fetch. If the origin is down at that moment, the
 *   request errors — there is no fallback.
 * - `stale-while-revalidate` — fresh: same as above. Within the SWR grace window past TTL: serve
 *   the *stale* cached content immediately (never blocks), and best-effort refresh the cache in the
 *   background for the next request (silently skipped if the origin is down — this request is
 *   unaffected either way, since it never depended on that fetch succeeding). Past the grace
 *   window: falls back to blocking, same as `ttl-blocking`.
 * - `stale-if-error` — fresh: same as above. Expired: always *attempts* a synchronous origin fetch
 *   (so it pays origin latency, unlike SWR). If the origin succeeds, serves fresh. If it fails and
 *   the entry is still within the stale-if-error grace window, falls back to serving the stale
 *   cached content instead of erroring. Past that grace window, it errors like `ttl-blocking` does.
 *
 * Deterministic throughout: the origin's true content version is `floor(tick / originUpdateIntervalTicks)`,
 * not drawn from randomness, and "the origin is down" is a fixed tick range the caller supplies —
 * the thing being tested is each policy's decision procedure against a known timeline, the same
 * choice `simulateBackpressure` makes for its own tick-based policies.
 */

export type CachePolicy = 'ttl-blocking' | 'stale-while-revalidate' | 'stale-if-error';

export interface RequestOutcome {
  tick: number;
  /** Content version actually served, or null if the request errored with nothing to serve. */
  servedVersion: number | null;
  trueVersionAtTick: number;
  /** servedVersion !== null && servedVersion !== trueVersionAtTick — real staleness, not assumed. */
  stale: boolean;
  latencyMs: number;
  /** Whether this request's own handling attempted a synchronous origin fetch. */
  originAttempted: boolean;
  /** Whether an attempted origin fetch failed (the origin was down at this tick). */
  originFailed: boolean;
  /** True only when the policy had nothing valid to serve at all. */
  error: boolean;
}

export interface CacheSimResult {
  policy: CachePolicy;
  requests: RequestOutcome[];
  totalRequests: number;
  freshServedCount: number;
  staleServedCount: number;
  errorCount: number;
  avgLatencyMs: number;
}

export interface CacheSimOptions {
  ttlTicks: number;
  /** Only consulted by `stale-while-revalidate`. */
  swrWindowTicks?: number;
  /** Only consulted by `stale-if-error`. */
  sieWindowTicks?: number;
  originUpdateIntervalTicks: number;
  /** Origin is down for tick in [outageStartTick, outageEndTick], inclusive. Omit for no outage. */
  outageStartTick?: number;
  outageEndTick?: number;
  fastLatencyMs?: number;
  originLatencyMs?: number;
  /** Ticks a request arrives, in ascending order — the caller controls the request schedule. */
  requestTicks: number[];
}

function isOriginDown(tick: number, opts: CacheSimOptions): boolean {
  if (opts.outageStartTick === undefined) return false;
  const end = opts.outageEndTick ?? opts.outageStartTick;
  return tick >= opts.outageStartTick && tick <= end;
}

export function simulateCachePolicy(policy: CachePolicy, opts: CacheSimOptions): CacheSimResult {
  if (opts.ttlTicks <= 0 || opts.originUpdateIntervalTicks <= 0 || opts.requestTicks.length === 0) {
    throw new Error('simulateCachePolicy requires a positive ttlTicks, originUpdateIntervalTicks, and at least one request');
  }

  const fast = opts.fastLatencyMs ?? 1;
  const origin = opts.originLatencyMs ?? 50;
  const trueVersionAt = (tick: number) => Math.floor(tick / opts.originUpdateIntervalTicks);

  // Cache starts pre-warmed at tick 0 for every policy — the same starting footing, so a
  // difference in outcomes is attributable to the policy, not to a cold-start artifact.
  let cachedVersion = trueVersionAt(0);
  let cachedAtTick = 0;

  const requests: RequestOutcome[] = [];

  for (const tick of opts.requestTicks) {
    const trueVersion = trueVersionAt(tick);
    const age = tick - cachedAtTick;
    const down = isOriginDown(tick, opts);

    if (age < opts.ttlTicks) {
      requests.push({ tick, servedVersion: cachedVersion, trueVersionAtTick: trueVersion, stale: cachedVersion !== trueVersion, latencyMs: fast, originAttempted: false, originFailed: false, error: false });
      continue;
    }

    if (policy === 'ttl-blocking') {
      if (down) {
        requests.push({ tick, servedVersion: null, trueVersionAtTick: trueVersion, stale: false, latencyMs: origin, originAttempted: true, originFailed: true, error: true });
        continue;
      }
      cachedVersion = trueVersion;
      cachedAtTick = tick;
      requests.push({ tick, servedVersion: trueVersion, trueVersionAtTick: trueVersion, stale: false, latencyMs: origin, originAttempted: true, originFailed: false, error: false });
      continue;
    }

    if (policy === 'stale-while-revalidate') {
      const swr = opts.swrWindowTicks ?? 0;
      if (age < opts.ttlTicks + swr) {
        const servedVersion = cachedVersion;
        // Best-effort background refresh: never affects this request's latency or content, only
        // whether the *next* request finds fresher content already in place.
        if (!down) {
          cachedVersion = trueVersion;
          cachedAtTick = tick;
        }
        requests.push({ tick, servedVersion, trueVersionAtTick: trueVersion, stale: servedVersion !== trueVersion, latencyMs: fast, originAttempted: down, originFailed: down, error: false });
        continue;
      }
      // Grace window elapsed — falls back to blocking, same as ttl-blocking's expired branch.
      if (down) {
        requests.push({ tick, servedVersion: null, trueVersionAtTick: trueVersion, stale: false, latencyMs: origin, originAttempted: true, originFailed: true, error: true });
        continue;
      }
      cachedVersion = trueVersion;
      cachedAtTick = tick;
      requests.push({ tick, servedVersion: trueVersion, trueVersionAtTick: trueVersion, stale: false, latencyMs: origin, originAttempted: true, originFailed: false, error: false });
      continue;
    }

    // stale-if-error: always attempts the origin once expired, unlike SWR.
    const sie = opts.sieWindowTicks ?? 0;
    if (!down) {
      cachedVersion = trueVersion;
      cachedAtTick = tick;
      requests.push({ tick, servedVersion: trueVersion, trueVersionAtTick: trueVersion, stale: false, latencyMs: origin, originAttempted: true, originFailed: false, error: false });
      continue;
    }
    if (age < opts.ttlTicks + sie) {
      requests.push({ tick, servedVersion: cachedVersion, trueVersionAtTick: trueVersion, stale: cachedVersion !== trueVersion, latencyMs: origin, originAttempted: true, originFailed: true, error: false });
      continue;
    }
    requests.push({ tick, servedVersion: null, trueVersionAtTick: trueVersion, stale: false, latencyMs: origin, originAttempted: true, originFailed: true, error: true });
  }

  const freshServedCount = requests.filter((r) => !r.error && !r.stale).length;
  const staleServedCount = requests.filter((r) => r.stale).length;
  const errorCount = requests.filter((r) => r.error).length;
  const avgLatencyMs = requests.reduce((sum, r) => sum + r.latencyMs, 0) / requests.length;

  return { policy, requests, totalRequests: requests.length, freshServedCount, staleServedCount, errorCount, avgLatencyMs };
}
