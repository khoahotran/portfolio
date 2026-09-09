// Two real distributed-transaction coordination protocols, run side by side on the same kind of
// failure — a step in the middle of a multi-participant transaction going wrong — to show the
// actual trade-off: 2PC buys atomicity by blocking; Saga buys liveness by giving up atomicity.

export interface ParticipantVote {
  id: string;
  vote: 'yes' | 'no';
}

export interface TwoPhaseCommitResult {
  allVotedYes: boolean;
  decision: 'commit' | 'abort';
  decisionReachedByCoordinator: boolean;
  // Participants who voted 'yes' enter the "prepared" state — resources locked, awaiting the
  // coordinator's decision message. A participant who voted 'no' never enters that state: it
  // aborts on its own the moment it casts that vote, so it is never blocked by anything that
  // happens to the coordinator afterward.
  blockedParticipants: string[];
}

/**
 * Simulates the two phases of Two-Phase Commit: every participant votes, then (if the coordinator
 * survives to send it) a decision is broadcast. If the coordinator crashes after collecting votes
 * but before broadcasting the decision, every participant who voted 'yes' is left holding its
 * locks with no way to resolve them itself — 2PC gives participants no rule for deciding alone.
 */
export function simulateTwoPhaseCommit(
  votes: ParticipantVote[],
  coordinatorCrashesBeforeBroadcast: boolean
): TwoPhaseCommitResult {
  const allVotedYes = votes.length > 0 && votes.every((v) => v.vote === 'yes');
  const decision: 'commit' | 'abort' = allVotedYes ? 'commit' : 'abort';
  const preparedParticipants = votes.filter((v) => v.vote === 'yes').map((v) => v.id);
  const decisionReachedByCoordinator = !coordinatorCrashesBeforeBroadcast;
  return {
    allVotedYes,
    decision,
    decisionReachedByCoordinator,
    blockedParticipants: decisionReachedByCoordinator ? [] : preparedParticipants,
  };
}

export interface SagaStepDefinition {
  id: string;
  succeeds: boolean;
  // Real sagas assume compensations are retried until they succeed; this models what happens the
  // one time that assumption doesn't hold, instead of assuming it away. Defaults to true.
  compensationSucceeds?: boolean;
}

export type SagaStepPhase = 'committed' | 'failed' | 'compensated' | 'compensation-failed' | 'skipped';

export interface SagaStepOutcome {
  id: string;
  phase: SagaStepPhase;
}

export interface SagaResult {
  steps: SagaStepOutcome[];
  failedAtStep: string | null;
  compensationsAttempted: string[];
  compensationsFailed: string[];
  // True only if the saga failed and every previously-committed step was cleanly compensated —
  // the saga's only route back to a consistent state.
  fullyCompensated: boolean;
}

/**
 * Runs a sequence of local transactions in order. If one fails, walks backward through every
 * previously-committed step, running its compensation. Unlike 2PC, nothing here blocks waiting for
 * a coordinator — every step is a real, already-committed local transaction, visible to the rest
 * of the system, the moment it happens. That is Saga's actual cost: there is no prepared state to
 * fall back into, so a compensation that itself fails leaves committed side effects with no
 * built-in mechanism to unwind them — a state 2PC's blocking is specifically designed to prevent.
 */
export function simulateSaga(steps: SagaStepDefinition[]): SagaResult {
  const outcomes: SagaStepOutcome[] = [];
  const committedSoFar: string[] = [];
  let failedAtStep: string | null = null;

  for (const step of steps) {
    if (failedAtStep !== null) {
      outcomes.push({ id: step.id, phase: 'skipped' });
      continue;
    }
    if (step.succeeds) {
      outcomes.push({ id: step.id, phase: 'committed' });
      committedSoFar.push(step.id);
    } else {
      outcomes.push({ id: step.id, phase: 'failed' });
      failedAtStep = step.id;
    }
  }

  const compensationsAttempted: string[] = [];
  const compensationsFailed: string[] = [];
  if (failedAtStep !== null) {
    const byId = new Map(steps.map((s) => [s.id, s]));
    for (const id of [...committedSoFar].reverse()) {
      compensationsAttempted.push(id);
      const succeeds = byId.get(id)?.compensationSucceeds ?? true;
      const idx = outcomes.findIndex((o) => o.id === id);
      if (succeeds) {
        outcomes[idx] = { id, phase: 'compensated' };
      } else {
        outcomes[idx] = { id, phase: 'compensation-failed' };
        compensationsFailed.push(id);
        // A real orchestrator would retry this compensation forever rather than give up — but it
        // cannot skip past it to unwind the steps still earlier in the sequence, because doing so
        // would compensate them out of order while this step's own side effect is still standing.
        break;
      }
    }
  }

  return {
    steps: outcomes,
    failedAtStep,
    compensationsAttempted,
    compensationsFailed,
    fullyCompensated: failedAtStep !== null && compensationsFailed.length === 0 && compensationsAttempted.length === committedSoFar.length,
  };
}
