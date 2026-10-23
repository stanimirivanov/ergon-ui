/**
 * Immutable acknowledgement of a past ownership transfer, never current access.
 * Original and successor claims remain distinct; the revision advances by two
 * without a release event. No case completion or run authority is implied.
 */
export interface FollowUpHandover {
  readonly commandId: string;
  readonly workItemId: string;
  readonly originalClaimId: string;
  readonly expectedOwnershipRevision: number;
  readonly recipientActorId: string;
  readonly successorClaimId: string;
  readonly ownershipRevision: number;
  readonly handedOverAt: string;
  readonly recordedAt: string;
}
