/**
 * Canary rollout analysis — the actual decision procedure a canary deployment system runs at each
 * traffic stage, not a diagram of "shift traffic gradually and watch for errors." A real canary
 * error rate that's numerically higher than baseline is not, by itself, evidence of a regression:
 * with few enough requests, a real regression can look identical to noise, and with enough
 * requests, a trivial, practically meaningless difference can look "significant." This is why real
 * systems (Kayenta, Flagger) run a statistical test rather than a raw threshold comparison — this
 * lab runs the same class of test: a two-proportion z-test, one-tailed (a canary that's
 * significantly *better* than baseline is not a regression and should not roll back).
 *
 * Deterministic by design, like every other lab here: error *counts* per stage are computed as
 * `round(rate * sampleSize)` from the given error rates, not drawn from a random-number generator.
 * The thing being tested is the statistical decision procedure itself, not a random walk — the same
 * choice `attemptRedlockAcquisition` makes by computing real quorum arithmetic instead of simulating
 * network jitter.
 */

export interface StageResult {
  /** 1-indexed stage number. */
  stage: number;
  trafficPercent: number;
  bakeRequests: number;
  canaryErrors: number;
  baselineErrors: number;
  canaryErrorRate: number;
  baselineErrorRate: number;
  /** Two-proportion z-test statistic; positive means canary's error rate is higher than baseline's. */
  zScore: number;
  /** One-tailed: true only when canary is significantly *worse*, never for "significantly better." */
  significant: boolean;
  decision: 'promote' | 'rollback';
}

export interface CanaryRolloutResult {
  stages: StageResult[];
  finalStatus: 'fully-promoted' | 'rolled-back';
  rolledBackAtStage: number | null;
}

/**
 * One-tailed two-proportion z-test: is the canary's error rate significantly *higher* than the
 * baseline's, given how many requests each was observed over? Returns the signed z-score — the test
 * calling this decides the significance threshold, this function only computes the statistic.
 *
 * Returns 0 when both proportions are identical or when the pooled variance is 0 (both samples
 * clean, or both samples entirely errors) — there is no evidence of a *difference* to test for in
 * either case, so "no evidence" is the correct answer, not a division-by-zero NaN.
 */
export function twoProportionZScore(
  errorsA: number,
  nA: number,
  errorsB: number,
  nB: number
): number {
  if (nA <= 0 || nB <= 0) {
    throw new Error('twoProportionZScore requires positive sample sizes');
  }
  const pA = errorsA / nA;
  const pB = errorsB / nB;
  const pooled = (errorsA + errorsB) / (nA + nB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB));
  if (se === 0) return 0;
  return (pA - pB) / se;
}

/**
 * Runs a full canary rollout through `trafficStages` (e.g. [5, 25, 50, 100]), halting at the first
 * stage whose z-test finds the canary significantly worse than baseline. `canaryErrorRate` and
 * `baselineErrorRate` are the *true* underlying rates (0-1) each stage samples from — fixed for the
 * whole rollout, since a canary's actual code doesn't change rate between stages, only how much
 * traffic it's exposed to.
 */
export function simulateCanaryRollout(
  trafficStages: number[],
  bakeRequestsPerStage: number,
  canaryErrorRate: number,
  baselineErrorRate: number,
  zThreshold = 1.96
): CanaryRolloutResult {
  if (trafficStages.length === 0 || bakeRequestsPerStage < 1) {
    throw new Error('simulateCanaryRollout requires at least one stage and a positive bake sample size');
  }

  const stages: StageResult[] = [];
  let rolledBackAtStage: number | null = null;

  for (let i = 0; i < trafficStages.length; i++) {
    const canaryErrors = Math.round(canaryErrorRate * bakeRequestsPerStage);
    const baselineErrors = Math.round(baselineErrorRate * bakeRequestsPerStage);
    const zScore = twoProportionZScore(canaryErrors, bakeRequestsPerStage, baselineErrors, bakeRequestsPerStage);
    const significant = zScore > zThreshold;

    stages.push({
      stage: i + 1,
      trafficPercent: trafficStages[i],
      bakeRequests: bakeRequestsPerStage,
      canaryErrors,
      baselineErrors,
      canaryErrorRate: canaryErrors / bakeRequestsPerStage,
      baselineErrorRate: baselineErrors / bakeRequestsPerStage,
      zScore,
      significant,
      decision: significant ? 'rollback' : 'promote',
    });

    if (significant) {
      rolledBackAtStage = i + 1;
      break;
    }
  }

  return {
    stages,
    finalStatus: rolledBackAtStage === null ? 'fully-promoted' : 'rolled-back',
    rolledBackAtStage,
  };
}
