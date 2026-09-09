import { describe, expect, it } from 'vitest';
import { simulateSaga, simulateTwoPhaseCommit } from './twoPhaseCommitVsSaga';
import type { ParticipantVote, SagaStepDefinition } from './twoPhaseCommitVsSaga';

describe('simulateTwoPhaseCommit — atomicity bought with blocking', () => {
  it('all-yes votes commit, and a surviving coordinator broadcasts the decision to everyone', () => {
    const votes: ParticipantVote[] = [
      { id: 'p1', vote: 'yes' },
      { id: 'p2', vote: 'yes' },
      { id: 'p3', vote: 'yes' },
    ];
    const result = simulateTwoPhaseCommit(votes, false);
    expect(result.decision).toBe('commit');
    expect(result.decisionReachedByCoordinator).toBe(true);
    expect(result.blockedParticipants).toEqual([]);
  });

  it('any single no-vote aborts the whole transaction', () => {
    const votes: ParticipantVote[] = [
      { id: 'p1', vote: 'yes' },
      { id: 'p2', vote: 'no' },
      { id: 'p3', vote: 'yes' },
    ];
    const result = simulateTwoPhaseCommit(votes, false);
    expect(result.decision).toBe('abort');
  });

  it('a no-voter is never blocked by a coordinator crash — it never entered the prepared state', () => {
    const votes: ParticipantVote[] = [
      { id: 'p1', vote: 'yes' },
      { id: 'p2', vote: 'no' },
    ];
    const result = simulateTwoPhaseCommit(votes, true);
    expect(result.blockedParticipants).not.toContain('p2');
  });

  it('the real finding: a coordinator crash after all-yes votes blocks every yes-voter indefinitely, regardless of how many there are', () => {
    // Unlike Raft's commit rule, there is no quorum here for participants to fall back on — 2PC
    // has exactly one coordinator, and its decision is the only thing that can unblock anyone.
    const votes: ParticipantVote[] = [
      { id: 'p1', vote: 'yes' },
      { id: 'p2', vote: 'yes' },
      { id: 'p3', vote: 'yes' },
      { id: 'p4', vote: 'yes' },
    ];
    const result = simulateTwoPhaseCommit(votes, true);
    expect(result.decisionReachedByCoordinator).toBe(false);
    expect(result.blockedParticipants).toEqual(['p1', 'p2', 'p3', 'p4']);
  });

  it('a mixed vote set still blocks only the participants that voted yes', () => {
    const votes: ParticipantVote[] = [
      { id: 'p1', vote: 'yes' },
      { id: 'p2', vote: 'no' },
      { id: 'p3', vote: 'yes' },
    ];
    const result = simulateTwoPhaseCommit(votes, true);
    expect(result.blockedParticipants.sort()).toEqual(['p1', 'p3']);
  });
});

describe('simulateSaga — liveness bought with no atomicity guarantee', () => {
  function step(id: string, succeeds: boolean, compensationSucceeds = true): SagaStepDefinition {
    return { id, succeeds, compensationSucceeds };
  }

  it('every step succeeding commits the whole saga with no compensation run at all', () => {
    const result = simulateSaga([step('reserve-inventory', true), step('charge-card', true), step('ship-order', true)]);
    expect(result.failedAtStep).toBeNull();
    expect(result.compensationsAttempted).toEqual([]);
    expect(result.steps.map((s) => s.phase)).toEqual(['committed', 'committed', 'committed']);
  });

  it('a mid-saga failure runs compensations for every earlier committed step, in reverse order', () => {
    const result = simulateSaga([step('reserve-inventory', true), step('charge-card', true), step('ship-order', false)]);
    expect(result.failedAtStep).toBe('ship-order');
    // ship-order itself never committed, so it is not compensated — only what came before it is.
    expect(result.compensationsAttempted).toEqual(['charge-card', 'reserve-inventory']);
    expect(result.steps.map((s) => s.phase)).toEqual(['compensated', 'compensated', 'failed']);
    expect(result.fullyCompensated).toBe(true);
  });

  it('a step never reached after the failure is marked skipped, not attempted at all', () => {
    const result = simulateSaga([step('reserve-inventory', true), step('charge-card', false), step('ship-order', true)]);
    expect(result.steps.map((s) => s.phase)).toEqual(['compensated', 'failed', 'skipped']);
  });

  it('never blocks: unlike 2PC, every committed step is real and visible the instant it happens, not held pending a decision', () => {
    // There is no equivalent of simulateTwoPhaseCommit's blockedParticipants here at all — the
    // saga's result type has no field for it, because nothing in this model ever waits on anyone.
    const result = simulateSaga([step('reserve-inventory', true), step('charge-card', false)]);
    expect(result).not.toHaveProperty('blockedParticipants');
  });

  it('the real finding: a compensation that itself fails leaves the saga with no way back to a consistent state', () => {
    // charge-card fails, triggering compensation of reserve-inventory — but that compensation
    // itself fails (the classic case: the reservation already expired and was reused elsewhere).
    // A saga has no equivalent of 2PC's "still holding the lock" fallback; the side effect from
    // reserve-inventory's original commit is just... still out there, uncompensated.
    const result = simulateSaga([step('reserve-inventory', true, false), step('charge-card', false)]);
    expect(result.compensationsFailed).toEqual(['reserve-inventory']);
    expect(result.fullyCompensated).toBe(false);
    expect(result.steps.find((s) => s.id === 'reserve-inventory')?.phase).toBe('compensation-failed');
  });

  it('a failed compensation stops the unwind there — earlier steps are not compensated out of order', () => {
    const result = simulateSaga([step('reserve-inventory', true), step('charge-card', true, false), step('ship-order', false)]);
    // ship-order fails; charge-card's compensation fails; reserve-inventory's compensation is
    // never even attempted, because unwinding past a failed compensation would compensate steps
    // out of their real dependency order.
    expect(result.compensationsAttempted).toEqual(['charge-card']);
    expect(result.steps.find((s) => s.id === 'reserve-inventory')?.phase).toBe('committed');
    expect(result.fullyCompensated).toBe(false);
  });
});
