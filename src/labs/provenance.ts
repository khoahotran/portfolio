/**
 * Where a lab's numbers come from.
 *
 * Why this exists: the nine labs look identical on the surface but differ enormously in what they
 * are actually worth as evidence. Three run the real algorithm live in the browser. Three compute
 * chosen formulas that illustrate a shape rather than measure anything. Three render a fixed
 * dataset. Before this, a reader could not tell them apart — and three of them were labelled
 * "Benchmark", one of them describing a hardcoded array as "a measured benchmark".
 *
 * `.ai/prompts/benchmark-study.md` already required every benchmark to state its hardware and
 * environment. This type is what makes that gate enforceable rather than aspirational: a lab
 * cannot be registered without declaring which of the three it is.
 *
 * The distinction is deliberately visible to the reader, not just to us. An honest "these are
 * illustrative formulas, here they are" is worth more than an unqualified chart, and it costs
 * nothing when the underlying work is real.
 */
export type LabProvenance =
  /**
   * The lab implements the actual algorithm and runs it on your input — the backoff schedule,
   * the saga state machine, the event fold. The output is a real computation, not an estimate.
   */
  | { kind: 'implementation'; basis: string }
  /**
   * The lab computes chosen formulas to illustrate a relationship. The shape is instructive; the
   * absolute numbers are not measurements of any real system. `basis` must state the formulas so
   * the reader can judge them.
   */
  | { kind: 'model'; basis: string }
  /**
   * The lab renders results captured from a real run. `environment` must be specific enough to
   * reproduce, and `harness` should point at the code that produced the numbers.
   *
   * `caveat` states what is missing — an unpublished harness, an unrecorded host, a sample size
   * too small to be a distribution. It is not optional politeness: a measurement a reader cannot
   * re-run is weaker evidence than one they can, and saying which kind this is costs nothing while
   * being caught overstating costs everything.
   */
  | { kind: 'measured'; environment: string; measuredOn: string; harness?: string; caveat?: string }
  /**
   * The lab renders a fixed dataset whose origin has not been established — it is neither a
   * verified measurement nor a stated model. This is a holding state, not a destination: a lab
   * should not stay here. It exists so an unverified dataset is labelled as such instead of
   * being presented as a benchmark, which is strictly better than the alternative of guessing.
   */
  | { kind: 'unverified'; note: string };

export const PROVENANCE_LABEL: Record<LabProvenance['kind'], string> = {
  implementation: 'Runs the real algorithm',
  model: 'Illustrative model',
  measured: 'Measured',
  unverified: 'Unverified dataset',
};
