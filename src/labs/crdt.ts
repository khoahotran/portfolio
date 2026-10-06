/**
 * CRDTs (Conflict-Free Replicated Data Types) — the direct sequel to
 * `vector-clocks-and-the-clock-skew-that-fools-last-write-wins`, not a duplicate of it. Vector
 * clocks let you *detect* that two writes are concurrent; they say nothing about what to do once
 * you know. A CRDT is a data structure whose merge function is specifically designed so that no
 * matter how many replicas exist, no matter what order updates arrive in, and no matter how many
 * times the same update is delivered twice, every replica converges to the same value — and, for
 * the two structures here, without silently discarding anyone's concurrent update the way a naive
 * "keep whichever write has the latest timestamp" resolver does.
 *
 * Two real CRDTs, each with a naive alternative run against the identical scenario so the
 * comparison is measured, not asserted:
 *
 * - **G-Counter** (grow-only counter): each node owns one slot in a shared vector, increments only
 *   its own slot, and the counter's value is the sum of every slot. Merge is component-wise max —
 *   exactly `mergeClocks`'s vector-clock merge, reused for a different purpose. Contrasted against
 *   a naive **LWW register**: two nodes each apply their own local increments, unaware of each
 *   other, then "merge" by keeping whichever node's final value has the later timestamp and
 *   discarding the other's entirely. `compareConcurrentIncrements` runs both against the identical
 *   increment counts and proves the naive register always loses the non-winning node's increments
 *   — a real, counted lost-update bug, not a hypothetical.
 * - **OR-Set** (observed-remove set): every `add` gets its own unique tag; a `remove` tombstones
 *   only the specific tags it has actually observed for that element at the time of removal; an
 *   element is present iff it has at least one add-tag that isn't tombstoned. Contrasted against a
 *   naive **2P-Set** (two-phase set): a plain "ever added" set and a plain "ever removed" set, with
 *   no per-operation tags at all. `compareReAddAfterRemove` runs the identical add-remove-add
 *   sequence through both and proves the 2P-Set loses the re-add *permanently* — once an element's
 *   value has ever been removed, the 2P-Set can never hold that value again, even though the same
 *   sequence under OR-Set correctly keeps the re-added element present.
 */

// ---------------------------------------------------------------------------
// G-Counter
// ---------------------------------------------------------------------------

export type GCounterState = Record<string, number>;

/** Every node's slot starts at 0 — nothing has happened anywhere yet. */
export function createGCounter(nodeIds: string[]): GCounterState {
  return Object.fromEntries(nodeIds.map((id) => [id, 0]));
}

/** A node can only ever increment its own slot — the "grow-only" half of the name. Pure: returns
 * a new state, never mutates `state`. */
export function incrementGCounter(state: GCounterState, nodeId: string, by = 1): GCounterState {
  return { ...state, [nodeId]: (state[nodeId] ?? 0) + by };
}

/** The counter's actual value: every slot really did happen, so summing all of them is always
 * correct, unlike a naive register that can only ever report one node's contribution. */
export function gCounterValue(state: GCounterState): number {
  return Object.values(state).reduce((sum, v) => sum + v, 0);
}

/** Component-wise max, same operation as `mergeClocks` — a G-Counter slot can only grow, so the
 * larger of two observations of the same node's slot is always the more complete one. */
export function mergeGCounter(a: GCounterState, b: GCounterState): GCounterState {
  const merged: GCounterState = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    merged[key] = Math.max(a[key] ?? 0, b[key] ?? 0);
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Naive contrast: an LWW register
// ---------------------------------------------------------------------------

export interface LwwRegister<T> {
  value: T;
  timestamp: number;
  nodeId: string;
}

/** Whichever write has the later timestamp survives — total order over every pair, discarding the
 * loser's contribution entirely. Ties fall back to nodeId so the function stays deterministic. */
export function mergeLwwRegister<T>(a: LwwRegister<T>, b: LwwRegister<T>): LwwRegister<T> {
  if (a.timestamp !== b.timestamp) return a.timestamp > b.timestamp ? a : b;
  return a.nodeId > b.nodeId ? a : b;
}

export interface LostUpdateComparison {
  /** Ground truth: every increment that actually happened, across every node, summed. */
  trueTotal: number;
  /** G-Counter's merged value — always equals trueTotal, by construction. */
  gCounterTotal: number;
  /** The naive LWW register's merged value — whichever single node's local total had the later timestamp. */
  lwwTotal: number;
  /** trueTotal - lwwTotal: increments the naive register silently threw away. Always >= 0; > 0
   * whenever more than one node made a nonzero number of increments. */
  lwwLostUpdates: number;
}

/**
 * Each node in `incrementsByNode` independently applies that many real local increments (via
 * `incrementGCounter`) with no knowledge of any other node's increments, then all nodes' states
 * are merged together — the actual concurrent-write scenario, not a shortcut. The identical
 * increment counts, tagged with `timestampsByNode`, are also run through the naive LWW register.
 */
export function compareConcurrentIncrements(
  incrementsByNode: Record<string, number>,
  timestampsByNode: Record<string, number>
): LostUpdateComparison {
  const nodeIds = Object.keys(incrementsByNode);
  if (nodeIds.length === 0) {
    throw new Error('compareConcurrentIncrements requires at least one node');
  }

  const trueTotal = Object.values(incrementsByNode).reduce((sum, v) => sum + v, 0);

  const localStates = nodeIds.map((nodeId) => {
    let state = createGCounter(nodeIds);
    for (let i = 0; i < incrementsByNode[nodeId]; i++) {
      state = incrementGCounter(state, nodeId);
    }
    return state;
  });
  const mergedGCounter = localStates.reduce((acc, state) => mergeGCounter(acc, state));
  const gCounterTotal = gCounterValue(mergedGCounter);

  const registers: LwwRegister<number>[] = nodeIds.map((nodeId) => ({
    value: incrementsByNode[nodeId],
    timestamp: timestampsByNode[nodeId] ?? 0,
    nodeId,
  }));
  const mergedLww = registers.reduce((a, b) => mergeLwwRegister(a, b));

  return {
    trueTotal,
    gCounterTotal,
    lwwTotal: mergedLww.value,
    lwwLostUpdates: trueTotal - mergedLww.value,
  };
}

// ---------------------------------------------------------------------------
// OR-Set
// ---------------------------------------------------------------------------

export interface AddTag {
  element: string;
  /** Unique per add operation — the caller supplies it (e.g. "nodeId#seq"), the same
   * "caller owns identity, the module stays pure" convention `idempotencyStore`'s arrivalTick and
   * `vectorClocks`' scripted events both already use. */
  tag: string;
}

export interface ORSetState {
  adds: AddTag[];
  /** Tags that have been observed-and-removed. An element is present iff it has at least one
   * add-tag not in this set — removing one instance of a value never affects a *different* tag for
   * the same value, which is exactly what lets a re-add survive a concurrent remove. */
  tombstones: string[];
}

export function createORSet(): ORSetState {
  return { adds: [], tombstones: [] };
}

export function addToORSet(state: ORSetState, element: string, tag: string): ORSetState {
  return { adds: [...state.adds, { element, tag }], tombstones: state.tombstones };
}

/** Tombstones every add-tag *currently observed* for `element` in this replica's own state — not
 * a blanket "this value is removed" flag. A tag added elsewhere and not yet merged in here, or
 * added after this call, is untouched. */
export function removeFromORSet(state: ORSetState, element: string): ORSetState {
  const observedTags = state.adds.filter((a) => a.element === element).map((a) => a.tag);
  return { adds: state.adds, tombstones: [...new Set([...state.tombstones, ...observedTags])] };
}

/** Union of both replicas' adds (deduplicated by element+tag) and both replicas' tombstones. */
export function mergeORSet(a: ORSetState, b: ORSetState): ORSetState {
  const addsByKey = new Map<string, AddTag>();
  for (const item of [...a.adds, ...b.adds]) {
    addsByKey.set(`${item.element} ${item.tag}`, item);
  }
  return {
    adds: [...addsByKey.values()],
    tombstones: [...new Set([...a.tombstones, ...b.tombstones])],
  };
}

/** The set a reader actually sees: every element with at least one surviving (non-tombstoned) add-tag. */
export function orSetElements(state: ORSetState): Set<string> {
  const present = new Set<string>();
  for (const { element, tag } of state.adds) {
    if (!state.tombstones.includes(tag)) present.add(element);
  }
  return present;
}

// ---------------------------------------------------------------------------
// Naive contrast: a 2P-Set (two-phase set)
// ---------------------------------------------------------------------------

export interface TwoPhaseSetState {
  /** Every value ever added, by value alone — no per-operation identity. */
  adds: string[];
  /** Every value ever removed, by value alone. Once here, this value can never be present again —
   * the actual bug: it makes no distinction between "this specific add" and "any add of this value". */
  removes: string[];
}

export function createTwoPhaseSet(): TwoPhaseSetState {
  return { adds: [], removes: [] };
}

export function addToTwoPhaseSet(state: TwoPhaseSetState, element: string): TwoPhaseSetState {
  return { adds: [...new Set([...state.adds, element])], removes: state.removes };
}

export function removeFromTwoPhaseSet(state: TwoPhaseSetState, element: string): TwoPhaseSetState {
  return { adds: state.adds, removes: [...new Set([...state.removes, element])] };
}

export function mergeTwoPhaseSet(a: TwoPhaseSetState, b: TwoPhaseSetState): TwoPhaseSetState {
  return {
    adds: [...new Set([...a.adds, ...b.adds])],
    removes: [...new Set([...a.removes, ...b.removes])],
  };
}

export function twoPhaseSetElements(state: TwoPhaseSetState): Set<string> {
  return new Set(state.adds.filter((e) => !state.removes.includes(e)));
}

export interface ReAddComparison {
  /** Should be true: OR-Set's per-tag removal lets the fresh add-tag survive. */
  orSetHasElement: boolean;
  /** Should be false: the 2P-Set's value-level (not tag-level) removal makes this permanent. */
  twoPhaseSetHasElement: boolean;
}

/**
 * Runs the identical add → remove → re-add sequence for `element` through both structures.
 * `seedTag` / `readdTag` let the caller supply distinct tags (see `AddTag`), so the scenario stays
 * fully explicit rather than hiding tag generation inside this function.
 */
export function compareReAddAfterRemove(element: string, seedTag: string, readdTag: string): ReAddComparison {
  let orSet = createORSet();
  orSet = addToORSet(orSet, element, seedTag);
  orSet = removeFromORSet(orSet, element);
  orSet = addToORSet(orSet, element, readdTag);

  let twoPhaseSet = createTwoPhaseSet();
  twoPhaseSet = addToTwoPhaseSet(twoPhaseSet, element);
  twoPhaseSet = removeFromTwoPhaseSet(twoPhaseSet, element);
  twoPhaseSet = addToTwoPhaseSet(twoPhaseSet, element);

  return {
    orSetHasElement: orSetElements(orSet).has(element),
    twoPhaseSetHasElement: twoPhaseSetElements(twoPhaseSet).has(element),
  };
}
