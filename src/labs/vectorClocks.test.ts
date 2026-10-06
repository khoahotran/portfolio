import { describe, expect, it } from 'vitest';
import {
  compareClocks,
  createClock,
  incrementClock,
  mergeClocks,
  pickLastWriteWinner,
  simulateCausalHistory,
} from './vectorClocks';
import type { ClockAction, ClockEvent } from './vectorClocks';

describe('createClock', () => {
  it('starts every node at 0', () => {
    expect(createClock(['a', 'b', 'c'])).toEqual({ a: 0, b: 0, c: 0 });
  });
});

describe('incrementClock', () => {
  it('increments only the given node\'s component', () => {
    const clock = createClock(['a', 'b']);
    const next = incrementClock(clock, 'a');
    expect(next).toEqual({ a: 1, b: 0 });
  });

  it('does not mutate the original clock', () => {
    const clock = createClock(['a', 'b']);
    incrementClock(clock, 'a');
    expect(clock).toEqual({ a: 0, b: 0 });
  });

  it('can increment the same node repeatedly', () => {
    let clock = createClock(['a']);
    clock = incrementClock(clock, 'a');
    clock = incrementClock(clock, 'a');
    clock = incrementClock(clock, 'a');
    expect(clock.a).toBe(3);
  });
});

describe('mergeClocks', () => {
  it('takes the component-wise max', () => {
    const a = { a: 3, b: 1, c: 0 };
    const b = { a: 1, b: 5, c: 2 };
    expect(mergeClocks(a, b)).toEqual({ a: 3, b: 5, c: 2 });
  });

  it('treats a missing key as 0 in either clock', () => {
    expect(mergeClocks({ a: 2 }, { b: 4 })).toEqual({ a: 2, b: 4 });
  });

  it('is symmetric', () => {
    const a = { a: 3, b: 1 };
    const b = { a: 1, b: 5 };
    expect(mergeClocks(a, b)).toEqual(mergeClocks(b, a));
  });
});

describe('compareClocks', () => {
  it('identical clocks are equal', () => {
    expect(compareClocks({ a: 2, b: 1 }, { a: 2, b: 1 })).toBe('equal');
  });

  it('a clock that is component-wise <= (and not equal) happened-before the other', () => {
    expect(compareClocks({ a: 1, b: 0 }, { a: 2, b: 1 })).toBe('before');
  });

  it('is the mirror image the other direction', () => {
    expect(compareClocks({ a: 2, b: 1 }, { a: 1, b: 0 })).toBe('after');
  });

  it('neither dominating is concurrent — this is the whole point of the algorithm', () => {
    // a leads on node "a", b leads on node "b" — neither observed the other.
    expect(compareClocks({ a: 2, b: 0 }, { a: 0, b: 2 })).toBe('concurrent');
  });

  it('treats missing keys as 0, same as mergeClocks', () => {
    expect(compareClocks({ a: 1 }, { a: 1, b: 1 })).toBe('before');
  });
});

describe('simulateCausalHistory — a real scripted scenario', () => {
  const nodeIds = ['A', 'B', 'C'];
  const script: ClockAction[] = [
    { type: 'local', nodeId: 'A', label: 'A writes x=1' },
    { type: 'local', nodeId: 'B', label: 'B writes y=2' },
    { type: 'send', nodeId: 'A', toNodeId: 'B', label: 'A sends its update to B' },
    { type: 'local', nodeId: 'C', label: 'C writes x=3' },
    { type: 'receive', nodeId: 'B', fromEventId: 2, label: "B receives A's update" },
    { type: 'local', nodeId: 'B', label: 'B writes x=4, informed by A' },
    { type: 'send', nodeId: 'C', toNodeId: 'A', label: 'C sends its update to A' },
    { type: 'receive', nodeId: 'A', fromEventId: 6, label: "A receives C's update" },
    { type: 'local', nodeId: 'A', label: 'A writes the final value' },
  ];

  function run(nodeSkewMs: Record<string, number> = {}): ClockEvent[] {
    return simulateCausalHistory(nodeIds, script, 1000, nodeSkewMs);
  }

  it('rejects an empty node list', () => {
    expect(() => simulateCausalHistory([], [], 1000)).toThrow();
  });

  it('rejects a receive that references an unknown send id', () => {
    expect(() =>
      simulateCausalHistory(nodeIds, [{ type: 'receive', nodeId: 'A', fromEventId: 999, label: 'bad' }], 1000)
    ).toThrow();
  });

  it('produces one event per script action, in order', () => {
    const events = run();
    expect(events).toHaveLength(script.length);
    expect(events.map((e) => e.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('a send always happens-before its matching receive — the core causal guarantee', () => {
    const events = run();
    const send = events[2]; // "A sends its update to B"
    const receive = events[4]; // "B receives A's update"
    expect(compareClocks(send.clock, receive.clock)).toBe('before');
  });

  it('two local events on different nodes, before any message connects them, are concurrent', () => {
    const events = run();
    const aWrites = events[0]; // A writes x=1
    const bWrites = events[1]; // B writes y=2 — no message has passed yet
    expect(compareClocks(aWrites.clock, bWrites.clock)).toBe('concurrent');
  });

  it('causality is transitive through a relay: B\'s post-receive event happens-after A\'s original local event', () => {
    const events = run();
    const aOriginal = events[0]; // A writes x=1 — the very first thing A did, before it even sent
    const bAfterReceive = events[5]; // B writes x=4, informed by A — after B received A's send
    expect(compareClocks(aOriginal.clock, bAfterReceive.clock)).toBe('before');
  });

  it("C's independent write stays concurrent with B's post-receive event — no message ever linked them", () => {
    const events = run();
    const cWrites = events[3]; // C writes x=3
    const bAfterReceive = events[5]; // B writes x=4, informed by A only, never C
    expect(compareClocks(cWrites.clock, bAfterReceive.clock)).toBe('concurrent');
  });

  it("A's final event, after receiving C's update, happens-after both A's own history and C's send", () => {
    const events = run();
    const cSend = events[6]; // C sends its update to A
    const aFinal = events[8]; // A writes the final value
    expect(compareClocks(cSend.clock, aFinal.clock)).toBe('before');
  });
});

describe('pickLastWriteWinner vs compareClocks — the two-sided finding', () => {
  const nodeIds = ['A', 'B'];
  // A and B each write once, independently, having never exchanged a message — genuinely concurrent.
  const script: ClockAction[] = [
    { type: 'local', nodeId: 'A', label: 'A writes v1' },
    { type: 'local', nodeId: 'B', label: 'B writes v2' },
  ];

  it('the causal verdict is concurrent regardless of physical clock skew', () => {
    const noSkew = simulateCausalHistory(nodeIds, script, 1000, {});
    const skewed = simulateCausalHistory(nodeIds, script, 1000, { A: 5000, B: -5000 });
    expect(compareClocks(noSkew[0].clock, noSkew[1].clock)).toBe('concurrent');
    expect(compareClocks(skewed[0].clock, skewed[1].clock)).toBe('concurrent');
    // The clocks themselves are identical either way — skew never touches the logical clock.
    expect(noSkew[0].clock).toEqual(skewed[0].clock);
  });

  it('naive last-write-wins still confidently picks a winner for the same concurrent pair', () => {
    const events = simulateCausalHistory(nodeIds, script, 1000, {});
    const winner = pickLastWriteWinner(events[0], events[1]);
    expect(['A', 'B']).toContain(winner.nodeId);
  });

  it('adjusting clock skew alone flips the naive winner, while the causal verdict never moves', () => {
    const aAheadOfB = simulateCausalHistory(nodeIds, script, 1000, { A: 10_000, B: 0 });
    const bAheadOfA = simulateCausalHistory(nodeIds, script, 1000, { A: 0, B: 10_000 });

    const winnerWhenAAhead = pickLastWriteWinner(aAheadOfB[0], aAheadOfB[1]);
    const winnerWhenBAhead = pickLastWriteWinner(bAheadOfA[0], bAheadOfA[1]);

    expect(winnerWhenAAhead.nodeId).toBe('A');
    expect(winnerWhenBAhead.nodeId).toBe('B');
    // Same two logical events, opposite naive "winner" — purely a function of clock skew, nothing
    // about what either node actually knew when it wrote. The causal verdict stayed 'concurrent'
    // in both cases (asserted above), which is the entire point being demonstrated.
    expect(winnerWhenAAhead.nodeId).not.toBe(winnerWhenBAhead.nodeId);
  });
});
