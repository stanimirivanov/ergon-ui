/** Historical administrative completion, never current access or verified case resolution. */
export interface FollowUpCompletion {
  readonly commandId: string;
  readonly workItemId: string;
  readonly claimId: string;
  readonly expectedOwnershipRevision: number;
  readonly completedAt: string;
  readonly recordedAt: string;
}
