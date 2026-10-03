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
  /** Current server ownership revision; zero before the first claim. */
  readonly ownershipRevision: number;
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
 * Browser-safe receipt for releasing an exact active claim.
 *
 * The revision is the new even ownership revision. A repeated release returns
 * the original receipt; neither resolver identity nor authority evidence is
 * exposed to the browser.
 */
export interface HumanFollowUpRelease {
  readonly claimId: string;
  readonly workItemId: string;
  readonly ownershipRevision: number;
  readonly releasedAt: string;
  readonly recordedAt: string;
}

/**
 * Open follow-up paired with the current resolver's active claim.
 *
 * The pair is valid only when `claim.workItemId` equals
 * `workItem.workItemId` and its ownership revision is positive and odd. A
 * consumer must apply the pure refinement below after separately validating
 * the shape of untrusted input.
 */
export interface ResolverOwnedHumanFollowUpWork {
  readonly workItem: HumanFollowUpWorkItem;
  readonly claim: HumanFollowUpClaim;
}

/**
 * Checks that an active claim identifies its paired open work item.
 * This does not validate wire fields or establish current resolver authority;
 * those checks remain at the BFF/data-access boundary.
 */
export function isResolverOwnedHumanFollowUpWork(
  candidate: ResolverOwnedHumanFollowUpWork,
): boolean {
  return (
    candidate.claim.workItemId === candidate.workItem.workItemId &&
    candidate.workItem.ownershipRevision > 0 &&
    candidate.workItem.ownershipRevision % 2 === 1
  );
}

/** Unowned inbox work starts at revision zero and returns on even releases. */
export function isAvailableHumanFollowUpWorkItem(
  candidate: HumanFollowUpWorkItem,
): boolean {
  return candidate.ownershipRevision % 2 === 0;
}
