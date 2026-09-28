/**
 * Server-authorized open escalation that can be claimed by a human resolver.
 *
 * Identifiers are opaque UUID strings. Time values are validated UTC instants;
 * `openedAt` records the business event while `recordedAt` records persistence.
 */
export interface HumanFollowUpWorkItem {
  readonly workItemId: string;
  readonly caseId: string;
  readonly runId: string;
  readonly escalationEventId: string;
  /** Machine-readable reason supplied by the escalation policy. */
  readonly reason: string;
  /** Exact queue routing key; it is not a display label. */
  readonly queueKey: string;
  readonly status: 'OPEN';
  readonly openedAt: string;
  readonly recordedAt: string;
}

/**
 * Active ownership record for a follow-up work item.
 *
 * `claimedAt` is the ownership event time and `recordedAt` is its persistence
 * time. Both are validated UTC instants.
 */
export interface HumanFollowUpClaim {
  readonly claimId: string;
  readonly workItemId: string;
  readonly claimedAt: string;
  readonly recordedAt: string;
}

/**
 * Open follow-up paired with the current resolver's active claim.
 *
 * The pair is valid only when `claim.workItemId` equals
 * `workItem.workItemId`. Data-access decoders currently enforce that
 * relationship before constructing this value; moving the pure refinement to
 * the model is migration debt.
 */
export interface ResolverOwnedHumanFollowUpWork {
  readonly workItem: HumanFollowUpWorkItem;
  readonly claim: HumanFollowUpClaim;
}
