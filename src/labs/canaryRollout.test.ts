import { describe, expect, it } from 'vitest';
import { simulateCanaryRollout, twoProportionZScore } from './canaryRollout';

describe('twoProportionZScore', () => {
  it('rejects non-positive sample sizes rather than return a plausible-looking result', () => {
    expect(() => twoProportionZScore(1, 0, 1, 10)).toThrow();
    expect(() => twoProportionZScore(1, 10, 1, -5)).toThrow();
  });

  it('returns 0 for identical proportions — no evidence of a difference', () => {
    expect(twoProportionZScore(5, 100, 5, 100)).toBe(0);
  });

  it('returns 0 when both samples are entirely clean — pooled variance is 0, not NaN', () => {
    expect(twoProportionZScore(0, 50, 0, 50)).toBe(0);
  });

  it('is positive when A\'s error rate is higher than B\'s, negative when lower', () => {
    expect(twoProportionZScore(20, 100, 5, 100)).toBeGreaterThan(0);
    expect(twoProportionZScore(5, 100, 20, 100)).toBeLessThan(0);
  });
});

describe('simulateCanaryRollout', () => {
  it('rejects invalid preconditions rather than return a plausible-looking result', () => {
    expect(() => simulateCanaryRollout([], 100, 0.01, 0.01)).toThrow();
    expect(() => simulateCanaryRollout([5, 25], 0, 0.01, 0.01)).toThrow();
  });

  it('promotes through every stage when the canary is exactly as healthy as baseline', () => {
    const result = simulateCanaryRollout([5, 25, 50, 100], 500, 0.02, 0.02);
    expect(result.finalStatus).toBe('fully-promoted');
    expect(result.rolledBackAtStage).toBeNull();
    expect(result.stages).toHaveLength(4);
    expect(result.stages.every((s) => s.decision === 'promote')).toBe(true);
  });

  it('rolls back at the first stage a severe, unambiguous regression is large enough to detect', () => {
    // 10x the baseline error rate at a real sample size — should be caught immediately, not waved
    // through to a later stage.
    const result = simulateCanaryRollout([5, 25, 50, 100], 500, 0.10, 0.01);
    expect(result.finalStatus).toBe('rolled-back');
    expect(result.rolledBackAtStage).toBe(1);
    expect(result.stages).toHaveLength(1);
    expect(result.stages[0].decision).toBe('rollback');
  });

  it('stops evaluating further stages once rolled back — a halted rollout, not a completed one', () => {
    const result = simulateCanaryRollout([5, 25, 50, 100], 500, 0.10, 0.01);
    expect(result.stages.length).toBeLessThan(4);
  });

  it('never rolls back for a canary that is significantly *better* than baseline — one-tailed, not two', () => {
    const result = simulateCanaryRollout([5, 25, 50, 100], 500, 0.01, 0.10);
    expect(result.finalStatus).toBe('fully-promoted');
    expect(result.stages.every((s) => s.decision === 'promote')).toBe(true);
  });

  it('a small early-stage sample can miss a real regression that a later, larger stage catches', () => {
    // Same true error rates throughout (2x baseline) — only bakeRequestsPerStage differs. At a
    // tiny sample, the z-test can't distinguish a real 2x regression from noise; the same rates at
    // a realistic sample size should be caught. This is the core finding, proven as behavior, not
    // asserted in prose.
    const tinySample = simulateCanaryRollout([5, 25, 50, 100], 15, 0.04, 0.02);
    const realisticSample = simulateCanaryRollout([5, 25, 50, 100], 2000, 0.04, 0.02);
    expect(tinySample.finalStatus).toBe('fully-promoted');
    expect(realisticSample.finalStatus).toBe('rolled-back');
  });

  it('a large enough sample can flag a practically trivial difference as statistically significant', () => {
    // Canary at 1.05% vs baseline at 1.0% — a difference nobody would call a regression in
    // practice, but with enough samples the z-test has the power to call it significant anyway.
    // This is the other side of the same finding: sample size cuts both ways.
    const result = simulateCanaryRollout([5, 25, 50, 100], 500_000, 0.0105, 0.01);
    expect(result.finalStatus).toBe('rolled-back');
  });

  it('is fully deterministic — same inputs, same result, no randomness', () => {
    const a = simulateCanaryRollout([5, 25, 50, 100], 500, 0.03, 0.02);
    const b = simulateCanaryRollout([5, 25, 50, 100], 500, 0.03, 0.02);
    expect(a).toEqual(b);
  });
});
