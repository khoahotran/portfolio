/**
 * Vector clocks — the causal-ordering mechanism behind "concurrent" as a real, detectable answer
 * instead of an artifact of clock skew (Fidge/Mattern, 1988; the algorithm Riak, Voldemort, and
 * Dynamo-style datastores use to detect conflicting writes). The problem: a naive "last write
 * wins" conflict resolver picks a winner using each write's *physical* timestamp — but clocks on
 * different machines are never perfectly synchronized, so that ordering is really "whichever
 * machine's clock happened to read later," not "whichever write actually came causally after the
 * other." Two writes that never observed each other (neither's node had received the other's
 * update yet) are **concurrent** — there is no correct "later" one — and a naive LWW resolver
 * cannot tell that apart from a genuine, causally-ordered pair.
 *
 * A vector clock fixes this by giving every node its own counter in a shared vector, incremented
 * on every event that node originates, and merged (component-wise max) with an incoming message's
 * clock on every receive. Comparing two vector clocks then answers a question physical time
 * cannot: did A's clock's every component stay `<=` B's ("A happened-before B", i.e. A could have
 * causally influenced B), did the reverse hold ("A happened-after B"), or does neither dominate
 * ("concurrent" — genuinely, provably, no causal link either way)?
 *
 * `simulateCausalHistory` runs the real algorithm (`createClock` / `incrementClock` /
 * `mergeClocks`) over a scripted sequence of local/send/receive events across several nodes, so
 * every event's clock in the resulting log is a real computed value, not a hand-typed one.
 * `compareClocks` is the real happens-before/happens-after/concurrent test, asserted directly by
 * the tests (a send's clock always happens-before its matching receive's — the one guarantee the
 * whole scheme exists to provide). `pickLastWriteWinner` is the naive alternative, included so the
 * two-sided finding is a measured contrast, not an assertion: for a pair of events `compareClocks`
 * calls concurrent, `pickLastWriteWinner`'s answer can be flipped by adjusting simulated per-node
 * clock skew alone, while `compareClocks`'s "concurrent" verdict never changes — it depends only on
 * the logical clocks, which physical clock skew cannot touch.
 */

export type VectorClock = Record<string, number>;

/** Every node starts at 0 — no events have happened anywhere yet. */
export function createClock(nodeIds: string[]): VectorClock {
  return Object.fromEntries(nodeIds.map((id) => [id, 0]));
}

/** A node originating an event (a local write, or a send — sending is itself a local event)
 * increments only its own component. Pure: returns a new clock, never mutates `clock`. */
export function incrementClock(clock: VectorClock, nodeId: string): VectorClock {
  return { ...clock, [nodeId]: (clock[nodeId] ?? 0) + 1 };
}

/** Component-wise max over the union of both clocks' keys — missing keys default to 0. This is
 * the "absorb everything the sender had observed" half of a receive; `incrementClock` for the
 * receive event itself still has to be called separately, the same way a real implementation
 * merges the incoming clock and then bumps its own counter for the receive as a distinct step. */
export function mergeClocks(a: VectorClock, b: VectorClock): VectorClock {
  const merged: VectorClock = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    merged[key] = Math.max(a[key] ?? 0, b[key] ?? 0);
  }
  return merged;
}

export type ClockComparison = 'equal' | 'before' | 'after' | 'concurrent';

/**
 * `a` happens-before `b` iff every component of `a` is `<=` the matching component of `b` and the
 * two clocks aren't identical (`a` could be a causal ancestor of `b`). `after` is the mirror image.
 * Neither holding means genuinely concurrent — provably no causal link, not merely "we don't know."
 */
export function compareClocks(a: VectorClock, b: VectorClock): ClockComparison {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let aLessEqual = true;
  let bLessEqual = true;
  for (const key of keys) {
    const av = a[key] ?? 0;
    const bv = b[key] ?? 0;
    if (av > bv) aLessEqual = false;
    if (bv > av) bLessEqual = false;
  }
  if (aLessEqual && bLessEqual) return 'equal';
  if (aLessEqual) return 'before';
  if (bLessEqual) return 'after';
  return 'concurrent';
}

export type ClockAction =
  | { type: 'local'; nodeId: string; label: string }
  | { type: 'send'; nodeId: string; toNodeId: string; label: string }
  /** `fromEventId` is the id (== script index) of the `send` action whose message this receives —
   * must appear earlier in the script, since a message can't be received before it's sent. */
  | { type: 'receive'; nodeId: string; fromEventId: number; label: string };

export interface ClockEvent {
  id: number;
  nodeId: string;
  type: ClockAction['type'];
  label: string;
  clock: VectorClock;
  /** Simulated wall-clock time: script position * baseTickMs, plus that node's own clock skew —
   * models real, imperfectly synchronized machine clocks, not a logical concept. */
  physicalTimestamp: number;
  toNodeId?: string;
  fromEventId?: number;
}

/**
 * Runs `script` in order (script order is the one concrete interleaving being demonstrated, not a
 * claim about how a real system would schedule these events) through the real vector-clock
 * primitives above, producing one `ClockEvent` per action with its actually-computed clock —
 * nothing here is precomputed or hand-typed.
 */
export function simulateCausalHistory(
  nodeIds: string[],
  script: ClockAction[],
  baseTickMs: number,
  nodeSkewMs: Record<string, number> = {}
): ClockEvent[] {
  if (nodeIds.length === 0) {
    throw new Error('simulateCausalHistory requires at least one node');
  }

  const clocks = new Map<string, VectorClock>(nodeIds.map((id) => [id, createClock(nodeIds)]));
  const sentClockByEventId = new Map<number, VectorClock>();
  const events: ClockEvent[] = [];

  script.forEach((action, id) => {
    if (!clocks.has(action.nodeId)) {
      throw new Error(`simulateCausalHistory: unknown node "${action.nodeId}" at script index ${id}`);
    }

    const physicalTimestamp = id * baseTickMs + (nodeSkewMs[action.nodeId] ?? 0);

    if (action.type === 'local') {
      const clock = incrementClock(clocks.get(action.nodeId)!, action.nodeId);
      clocks.set(action.nodeId, clock);
      events.push({ id, nodeId: action.nodeId, type: 'local', label: action.label, clock, physicalTimestamp });
      return;
    }

    if (action.type === 'send') {
      const clock = incrementClock(clocks.get(action.nodeId)!, action.nodeId);
      clocks.set(action.nodeId, clock);
      sentClockByEventId.set(id, clock);
      events.push({ id, nodeId: action.nodeId, type: 'send', label: action.label, clock, physicalTimestamp, toNodeId: action.toNodeId });
      return;
    }

    // receive
    const incoming = sentClockByEventId.get(action.fromEventId);
    if (!incoming) {
      throw new Error(`simulateCausalHistory: receive at index ${id} references an unknown or not-yet-occurred send id ${action.fromEventId}`);
    }
    const merged = incrementClock(mergeClocks(clocks.get(action.nodeId)!, incoming), action.nodeId);
    clocks.set(action.nodeId, merged);
    events.push({ id, nodeId: action.nodeId, type: 'receive', label: action.label, clock: merged, physicalTimestamp, fromEventId: action.fromEventId });
  });

  return events;
}

/**
 * The naive alternative to `compareClocks`: whichever event has the larger `physicalTimestamp`
 * "wins" — a total order over *every* pair, including genuinely concurrent ones, since physical
 * time always produces some answer even when there's no real causal relationship to report. Ties
 * (equal physicalTimestamp) fall back to nodeId so the function is still total and deterministic.
 */
export function pickLastWriteWinner(a: ClockEvent, b: ClockEvent): ClockEvent {
  if (a.physicalTimestamp !== b.physicalTimestamp) {
    return a.physicalTimestamp > b.physicalTimestamp ? a : b;
  }
  return a.nodeId > b.nodeId ? a : b;
}
