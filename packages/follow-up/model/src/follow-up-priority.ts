/** Administrative metadata only: never queue ordering, risk, SLA or authority. */
export type FollowUpPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

/**
 * Independent value/revision pair: zero denotes implicit NORMAL only; positive
 * NORMAL is explicit. It describes current metadata only in an authorized read,
 * never merely because it appears in a historical receipt.
 */
export interface FollowUpPriorityState {
  readonly priority: FollowUpPriority;
  readonly priorityRevision: number;
}

/**
 * Refines default meaning after structural decoding: revision zero is implicit
 * NORMAL; positive NORMAL revisions are explicit assignments. Does not validate
 * wire shape, revision bounds or current resolver authority.
 */
export function hasConsistentFollowUpPriority(
  value: FollowUpPriorityState,
): boolean {
  return value.priorityRevision !== 0 || value.priority === 'NORMAL';
}

/**
 * Historical acknowledgement, possibly already superseded. assignedAt is the
 * application's UTC event time; recordedAt is UTC persistence time. Revisions,
 * not clock order, identify successive assignments. It grants no current access.
 */
export interface FollowUpPriorityAssignment extends FollowUpPriorityState {
  readonly commandId: string;
  readonly workItemId: string;
  readonly claimId: string;
  readonly expectedOwnershipRevision: number;
  readonly expectedPriorityRevision: number;
  readonly assignedAt: string;
  readonly recordedAt: string;
}
