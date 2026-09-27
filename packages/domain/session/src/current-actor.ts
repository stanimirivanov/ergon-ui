/**
 * Server-verified actor bound to the current authenticated session.
 *
 * The value contains no provider subject or credential. Identifiers and UTC
 * timestamp representations are validated before an adapter constructs this
 * projection; `registeredAt` is the actor-binding time and `recordedAt` its
 * persistence time.
 */
export interface CurrentActor {
  readonly actorId: string;
  readonly identityProvider: string;
  readonly registeredAt: string;
  readonly recordedAt: string;
}
