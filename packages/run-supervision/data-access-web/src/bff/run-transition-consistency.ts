import type {
  AssignedRunConsole,
  AssignedRunState,
  AssignedRunTransition,
} from '../contracts';

const shapes = {
  RUN_CANCELLED: { sequence: 1, toState: 'CANCELLED', fromState: null },
  CAPABILITY_SUCCEEDED: { sequence: 1, toState: 'VERIFYING', fromState: null },
  CAPABILITY_FAILED: { sequence: 1, toState: 'ACTION_FAILED', fromState: null },
  OUTCOME_PROOF_ACCEPTED: {
    sequence: 2,
    toState: 'VERIFIED_RESOLVED',
    fromState: 'VERIFYING',
  },
  RETRY_STARTED: {
    sequence: 2,
    toState: 'SUPERSEDED',
    fromState: 'ACTION_FAILED',
  },
  ESCALATION_REQUESTED: {
    sequence: 2,
    toState: 'ESCALATED',
    fromState: 'ACTION_FAILED',
  },
} satisfies Record<
  AssignedRunTransition['type'],
  {
    sequence: number;
    fromState: AssignedRunState | null;
    toState: AssignedRunState;
  }
>;

/** Validate the complete state-bounded prefix, never sort or repair an untrusted history. */
export function isConsistentRunHistory(run: AssignedRunConsole): boolean {
  // Cancellation is the only terminal path without a capability receipt. Even
  // an older server omitting history cannot make a mixed projection valid.
  if (
    run.state === 'CANCELLED' &&
    (run.stateVersion !== 1 || run.execution != null)
  )
    return false;
  const events = run.transitions;
  if (events === undefined) return true;
  if (events.length !== run.stateVersion) return false;
  let previous: AssignedRunState =
    run.requiredApproval === 'NONE'
      ? 'READY_FOR_AUTHORIZATION'
      : 'WAITING_FOR_APPROVAL';
  for (const [index, event] of events.entries()) {
    const shape = shapes[event.type];
    if (
      event.sequence !== index + 1 ||
      event.sequence !== shape.sequence ||
      event.fromState !== previous ||
      event.toState !== shape.toState ||
      (shape.fromState !== null && event.fromState !== shape.fromState)
    )
      return false;
    previous = event.toState;
  }
  if (previous !== run.state) return false;
  const last = events.at(-1);
  if (last !== undefined && !sameInstant(last.occurredAt, run.stateUpdatedAt))
    return false;
  const first = events[0];
  if (first === undefined) return true;
  if (first.type === 'RUN_CANCELLED')
    return (
      run.state === 'CANCELLED' && events.length === 1 && run.execution == null
    );
  return (
    run.execution != null &&
    first.type === `CAPABILITY_${run.execution.outcome}` &&
    sameInstant(first.occurredAt, run.execution.completedAt)
  );
}

// Schema decoding has already established UTC instants. Canonicalize only
// fractional zero padding; Date.parse would lose sub-millisecond differences.
function sameInstant(left: string, right: string): boolean {
  const canonical = (value: string) =>
    value.replace(/(\.\d*?)0+Z$/, '$1Z').replace('.Z', 'Z');
  return canonical(left) === canonical(right);
}
