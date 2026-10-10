/**
 * Presentation-safe failures shared by follow-up read operations.
 *
 * Authentication and identity variants distinguish recovery paths without
 * exposing provider credentials. `invalid-filter` and `invalid-page` identify
 * rejected request contracts. `invalid-response` means the response could not
 * be trusted after transport succeeded. Status-bearing variants preserve only
 * the HTTP status; raw browser and network causes are deliberately excluded.
 * `unexpected-defect` contains a rejected client/composition defect at the cache
 * boundary; it does not imply a malformed server response.
 */
export type HumanFollowUpFailure =
  | { readonly kind: 'authentication-required' }
  | { readonly kind: 'authentication-unavailable' }
  | { readonly kind: 'actor-not-registered' }
  | { readonly kind: 'identity-rejected' }
  | { readonly kind: 'forbidden' }
  | { readonly kind: 'invalid-filter' }
  | { readonly kind: 'invalid-page' }
  | { readonly kind: 'timeout' }
  | { readonly kind: 'transport' }
  | { readonly kind: 'service-unavailable'; readonly status: number }
  | { readonly kind: 'unexpected-response'; readonly status: number }
  | { readonly kind: 'invalid-response' }
  | { readonly kind: 'unexpected-defect' }
  | { readonly kind: 'request-cancelled' };

/**
 * Case-summary read failure.
 *
 * `not-found` intentionally combines absence, stale ownership, and
 * non-disclosing authorization outcomes exposed by the browser contract.
 */
export type ResolverFollowUpCaseSummaryFailure =
  HumanFollowUpFailure | { readonly kind: 'not-found' };

/**
 * Failures shared by resolver ownership commands.
 *
 * `csrf-rejected` requires obtaining a fresh ephemeral token. Authentication,
 * authority, response, and execution failures carry no raw causes, keeping
 * results safe for presentation and Redux state.
 * `unexpected-defect` does not prove the command was rejected by the server:
 * preserve the original intent for any explicit replay after an uncertain write.
 */
export type HumanFollowUpCommandFailure =
  | { readonly kind: 'authentication-required' }
  | { readonly kind: 'authentication-unavailable' }
  | { readonly kind: 'actor-not-registered' }
  | { readonly kind: 'identity-rejected' }
  | { readonly kind: 'resolver-authority-required' }
  | { readonly kind: 'csrf-rejected' }
  | { readonly kind: 'forbidden' }
  | { readonly kind: 'timeout' }
  | { readonly kind: 'transport' }
  | { readonly kind: 'service-unavailable'; readonly status: number }
  | { readonly kind: 'unexpected-response'; readonly status: number }
  | { readonly kind: 'invalid-response' }
  | { readonly kind: 'unexpected-defect' }
  | { readonly kind: 'request-cancelled' };

/**
 * Claim failures include stale inbox revisions, no-longer-visible work, and a
 * command ID reused for different intent. None grants current ownership.
 */
export type HumanFollowUpClaimFailure =
  | HumanFollowUpCommandFailure
  | { readonly kind: 'already-claimed' }
  | { readonly kind: 'ownership-revision-conflict' }
  | { readonly kind: 'claim-command-conflict' }
  | { readonly kind: 'invalid-claim-command' }
  | { readonly kind: 'not-found' };

/** Release-specific failures preserve stale, unavailable, and non-disclosing outcomes. */
export type HumanFollowUpReleaseFailure =
  | HumanFollowUpCommandFailure
  | { readonly kind: 'ownership-revision-conflict' }
  | { readonly kind: 'invalid-release-command' }
  | { readonly kind: 'release-unavailable' }
  | { readonly kind: 'not-found' };
