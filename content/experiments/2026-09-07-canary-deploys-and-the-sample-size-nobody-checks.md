---
title: "Canary Deploys and the Sample Size Nobody Checks"
date: "2026-09-07"
tags: ["incident-response", "trade-offs", "benchmark"]
related: ["blog/engineering-lessons-from-a-failed-rollout"]
summary: "A real two-proportion z-test canary analysis, run stage by stage — proving that the same real regression can go completely undetected at a small sample size and get caught at a larger one, using the exact statistic, not a story about it."
---

"Ship to 5% of traffic, watch the error rate, promote if it looks fine." That's the mental model
most people have of a canary deploy, and it has a silent assumption baked in: that "looks fine" is a
meaningful judgment at whatever traffic percentage the first stage happens to use. It usually isn't
— and the reason is arithmetic, not opinion. The [interactive lab](/labs/canary-rollout) runs the
actual statistical test real canary systems use, not a described version of one.

<div class="mt-8 mb-12">
  <a href="/labs/canary-rollout" class="lab-cta-inverse">
    Try the Interactive Canary Rollout Lab
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </a>
</div>

## Why a Raw Threshold Isn't Enough

The naive version of canary analysis is a threshold: "roll back if the canary's error rate exceeds
X%." The problem is that an error rate computed from a handful of requests is mostly noise. Two
requests failing out of twenty looks like a 10% error rate; two failing out of two thousand looks
like 0.1%. Both could be observations of the *same underlying* 1% failure rate — the small sample
just doesn't have enough data to say. A raw threshold treats both cases identically; a real canary
system asks a different question: **is this difference larger than sampling noise could plausibly
explain?**

That's a statistical significance test, and the lab (`src/labs/canaryRollout.ts`) runs a real one: a
**two-proportion z-test**, one-tailed — the same class of test systems like Kayenta and Flagger use
instead of a bare threshold. It only flags a canary as regressed when its error rate is
*significantly* higher than baseline's, not merely numerically higher.

## The Finding: The Same Regression Can Be Invisible or Obvious, Depending Only on Sample Size

Fix the canary's true error rate at 2x the baseline's — a real, meaningful regression by any
standard — and change nothing except how many requests each stage samples:

| Requests per stage | Result |
|---|---|
| 15 | **Fully promoted** — the regression is real, but 15 samples can't distinguish it from noise |
| 2,000 | **Rolled back at stage 1** — the identical regression is caught immediately |

Nothing about the underlying bug changed between these two runs. The only variable is how much
evidence the test had to work with. `canaryRollout.test.ts` asserts this pair directly — same error
rates, only `bakeRequestsPerStage` differs, opposite outcomes — because a claim this important to a
site about evidence shouldn't rest on a single, maybe-lucky example.

> [!NOTE]
> Try it yourself in the lab: set the canary rate to roughly 2x the baseline rate, then drag "requests
> sampled per stage" down toward its minimum. Watch the z-score shrink toward the ±1.96 threshold and
> the decision flip from "rollback" to "promote" — the exact same underlying regression, made
> statistically invisible by an under-sized sample.

## The Other Side: A Large Enough Sample Flags Differences Nobody Would Call a Regression

The same mechanism cuts the other way. Set the canary's error rate to 1.05% against a 1.00%
baseline — a difference small enough that no one would call it a regression in an incident review —
and scale the sample size up far enough (the lab's own test uses 500,000 requests per stage to
demonstrate this cleanly): the z-test calls it significant, and the rollout rolls back. Statistical
significance answers "is this difference larger than noise?" — it does not answer "is this
difference large enough to matter?" Those are different questions, and a canary system tuned only
for the first one will eventually roll back a release for a difference too small to care about.

## What This Actually Means for Staging Traffic

- **A "clean" first canary stage at low traffic is weak evidence, not strong evidence.** If the
  first stage's sample size can't detect a 2x regression, "no rollback yet" mostly means "not enough
  data yet," not "probably fine." Either start with more traffic than intuition suggests, or bake
  longer before treating an early stage as a real signal.
- **Statistical significance alone is an incomplete rollback trigger at high traffic.** A production
  system serving real volume can accumulate enough samples that a two-proportion test starts
  flagging differences that are real but not meaningful. A trustworthy canary gate needs both a
  significance test *and* a minimum-effect-size floor — "significantly different, **and** the
  difference is at least Y percentage points" — not significance alone.
- **The traffic-staging itself (5% → 25% → 50% → 100%) exists to buy sample size cheaply as
  confidence grows**, not just to limit blast radius. Both are real reasons for staged rollout, and
  they're often conflated as if blast-radius limitation were the whole story.

The failure mode this lab is built to make visible: reaching for "we do canary deploys" as if the
practice itself guarantees safety, when the actual guarantee depends entirely on whether the
statistical test behind it has enough data to say anything at all.
