/**
 * Backpressure — what a bounded queue between a producer and a slower consumer actually does when
 * it fills up. Four real policies, not four names for the same arithmetic: `drop-new` and
 * `drop-old` produce numerically identical queue-depth and drop-count series under sustained
 * overload, which is exactly why this simulation tracks individual item identities (an
 * `arrivedTick` per item) instead of just counts — it's the only way to make the actual difference
 * between them (which items survive) a testable, visible fact rather than an assertion.
 *
 * - `block` — the producer is slowed to match the consumer. Nothing is ever lost; the unadmitted
 *   work piles up in the producer's own outbound buffer (`pendingBacklog` below) instead, which is
 *   what "backpressure" literally means: push the slowdown backward through the pipeline instead of
 *   dropping data or crashing. The real cost is that backlog growing without bound if the mismatch
 *   never resolves — this policy doesn't fix a sustained rate mismatch, it just relocates the queue.
 * - `drop-new` (tail drop) — the queue never evicts what it already holds; incoming items that
 *   don't fit are discarded on arrival. FIFO order of admitted items is preserved. Every item this
 *   drops has `arrivedTick` equal to the tick it was dropped in — it can only ever reject its own
 *   newest arrivals, never something already resident.
 * - `drop-old` (drop head) — the queue always admits new arrivals, evicting its oldest resident
 *   items to make room instead. Every item this drops has `arrivedTick` *before* the current tick —
 *   it can only ever evict something that was already sitting there. Right for "only the latest
 *   value matters" workloads (sensor telemetry, live position updates); wrong for anything where
 *   an old, unprocessed item still has to be processed eventually.
 * - `circuit-breaker` — load shedding driven by occupancy, not per-item choice. Once queue
 *   occupancy crosses `openThreshold`, the circuit opens and rejects *everything* for
 *   `cooldownTicks`, giving the consumer a clear runway to drain. It then allows exactly one
 *   half-open probe tick at a reduced `probeRate`; if occupancy stays under threshold through that
 *   probe, the circuit closes and resumes normal admission, otherwise it reopens and the cooldown
 *   restarts.
 */

export type BackpressurePolicy = 'block' | 'drop-new' | 'drop-old' | 'circuit-breaker';
export type CircuitState = 'closed' | 'open' | 'half-open';

export interface QueueItem {
  id: number;
  arrivedTick: number;
}

export interface TickResult {
  tick: number;
  /** Items the producer generated this tick (nominal rate — not yet admission-filtered). */
  arrived: number;
  /** Items actually pushed into the bounded queue this tick. */
  accepted: number;
  /** Items rejected or evicted this tick — the items themselves, so a caller can inspect arrivedTick. */
  dropped: QueueItem[];
  /** Items dequeued (processed) this tick. */
  processed: number;
  /** Queue length at the end of this tick, after admission and processing. */
  queueDepth: number;
  /** `block` policy only: items generated but not yet admitted, waiting in the producer's own buffer. */
  pendingBacklog: number;
  circuitState?: CircuitState;
}

export interface BackpressureSimulation {
  policy: BackpressurePolicy;
  ticks: TickResult[];
  totalArrived: number;
  totalAccepted: number;
  totalDropped: number;
  totalProcessed: number;
  maxQueueDepth: number;
  maxPendingBacklog: number;
}

export interface BackpressureOptions {
  /** Queue occupancy ratio (0-1) that trips the circuit breaker open. Ignored by other policies. */
  openThreshold?: number;
  /** Ticks the circuit stays fully open (rejecting everything) before a half-open probe. */
  cooldownTicks?: number;
  /** Max arrivals admitted during the single half-open probe tick. */
  probeRate?: number;
}

const DEFAULT_OPTIONS: Required<BackpressureOptions> = {
  openThreshold: 0.9,
  cooldownTicks: 3,
  probeRate: 1,
};

export function simulateBackpressure(
  policy: BackpressurePolicy,
  producerRatePerTick: number,
  consumerRatePerTick: number,
  queueCapacity: number,
  tickCount: number,
  options: BackpressureOptions = {}
): BackpressureSimulation {
  if (queueCapacity < 1 || producerRatePerTick < 0 || consumerRatePerTick < 0 || tickCount < 1) {
    throw new Error('simulateBackpressure requires a positive queue capacity and tick count, and non-negative rates');
  }

  const { openThreshold, cooldownTicks, probeRate } = { ...DEFAULT_OPTIONS, ...options };

  let queue: QueueItem[] = [];
  let pendingBacklog: QueueItem[] = [];
  let nextId = 1;
  let circuitState: CircuitState = 'closed';
  let cooldownRemaining = 0;
  let recordedCircuitState: CircuitState | undefined;

  const ticks: TickResult[] = [];

  for (let tick = 1; tick <= tickCount; tick++) {
    const freshArrivals: QueueItem[] = Array.from({ length: producerRatePerTick }, () => ({
      id: nextId++,
      arrivedTick: tick,
    }));

    let accepted = 0;
    let dropped: QueueItem[] = [];

    switch (policy) {
      case 'block': {
        pendingBacklog = [...pendingBacklog, ...freshArrivals];
        const room = queueCapacity - queue.length;
        const admitted = pendingBacklog.slice(0, Math.max(0, room));
        pendingBacklog = pendingBacklog.slice(admitted.length);
        queue = [...queue, ...admitted];
        accepted = admitted.length;
        break;
      }

      case 'drop-new': {
        const room = queueCapacity - queue.length;
        const admitted = freshArrivals.slice(0, Math.max(0, room));
        dropped = freshArrivals.slice(admitted.length);
        queue = [...queue, ...admitted];
        accepted = admitted.length;
        break;
      }

      case 'drop-old': {
        queue = [...queue, ...freshArrivals];
        accepted = freshArrivals.length;
        if (queue.length > queueCapacity) {
          const evictCount = queue.length - queueCapacity;
          dropped = queue.slice(0, evictCount);
          queue = queue.slice(evictCount);
        }
        break;
      }

      case 'circuit-breaker': {
        // Decided entirely from the state this tick *entered* with — never mutate `circuitState`
        // until after this tick's admission is settled, so the tick that's recorded as 'open' is
        // the same tick that actually rejected everything, not the tick that merely triggered the
        // transition (which admitted normally right up until the trip).
        const stateAtStart = circuitState;

        if (stateAtStart === 'open') {
          dropped = freshArrivals;
          accepted = 0;
        } else {
          const cap = stateAtStart === 'half-open' ? probeRate : producerRatePerTick;
          const admissible = freshArrivals.slice(0, cap);
          const rejectedByProbeCap = freshArrivals.slice(cap);
          const room = queueCapacity - queue.length;
          const admitted = admissible.slice(0, Math.max(0, room));
          dropped = [...rejectedByProbeCap, ...admissible.slice(admitted.length)];
          queue = [...queue, ...admitted];
          accepted = admitted.length;
        }

        const occupancy = queue.length / queueCapacity;

        if (stateAtStart === 'open') {
          cooldownRemaining--;
          circuitState = cooldownRemaining <= 0 ? 'half-open' : 'open';
        } else if (stateAtStart === 'half-open') {
          if (occupancy >= openThreshold) {
            circuitState = 'open';
            cooldownRemaining = cooldownTicks;
          } else {
            circuitState = 'closed';
          }
        } else {
          // closed
          if (occupancy >= openThreshold) {
            circuitState = 'open';
            cooldownRemaining = cooldownTicks;
          }
        }

        recordedCircuitState = stateAtStart;
        break;
      }
    }

    const processed = Math.min(consumerRatePerTick, queue.length);
    queue = queue.slice(processed);

    ticks.push({
      tick,
      arrived: freshArrivals.length,
      accepted,
      dropped,
      processed,
      queueDepth: queue.length,
      pendingBacklog: pendingBacklog.length,
      circuitState: policy === 'circuit-breaker' ? recordedCircuitState : undefined,
    });
  }

  return {
    policy,
    ticks,
    totalArrived: ticks.reduce((sum, t) => sum + t.arrived, 0),
    totalAccepted: ticks.reduce((sum, t) => sum + t.accepted, 0),
    totalDropped: ticks.reduce((sum, t) => sum + t.dropped.length, 0),
    totalProcessed: ticks.reduce((sum, t) => sum + t.processed, 0),
    maxQueueDepth: Math.max(...ticks.map((t) => t.queueDepth)),
    maxPendingBacklog: Math.max(...ticks.map((t) => t.pendingBacklog)),
  };
}
