export interface HumanFollowUpWorkItem {
  readonly workItemId: string;
  readonly caseId: string;
  readonly runId: string;
  readonly escalationEventId: string;
  readonly reason: string;
  readonly queueKey: string;
  readonly status: 'OPEN';
  readonly openedAt: string;
  readonly recordedAt: string;
}

export interface HumanFollowUpClaim {
  readonly claimId: string;
  readonly workItemId: string;
  readonly claimedAt: string;
  readonly recordedAt: string;
}

export interface ResolverOwnedHumanFollowUpWork {
  readonly workItem: HumanFollowUpWorkItem;
  readonly claim: HumanFollowUpClaim;
}
