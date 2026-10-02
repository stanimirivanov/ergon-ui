/**
 * Presentation-safe failures shared by follow-up read operations.
 *
 * Authentication and identity variants distinguish recovery paths without
 * exposing provider credentials. `invalid-filter` and `invalid-page` identify
 * rejected request contracts. `invalid-response` means the response could not
 * be trusted after transport succeeded. Status-bearing variants preserve only
 * the HTTP status; raw browser and network causes are deliberately excluded.
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
 * Failures specific to acquiring resolver ownership.
 *
 * `csrf-rejected` requires obtaining a fresh ephemeral token;
 * `ownership-revision-conflict` means the inbox row is stale;
 * `claim-command-conflict` means a command ID was reused for different intent;
 * and `not-found` covers a no-longer-visible item. Raw causes are omitted
 * so results remain safe for presentation and Redux state.
 */
export type HumanFollowUpClaimFailure =
  | { readonly kind: 'authentication-required' }
  | { readonly kind: 'authentication-unavailable' }
  | { readonly kind: 'actor-not-registered' }
  | { readonly kind: 'identity-rejected' }
  | { readonly kind: 'resolver-authority-required' }
  | { readonly kind: 'csrf-rejected' }
  | { readonly kind: 'already-claimed' }
  | { readonly kind: 'ownership-revision-conflict' }
  | { readonly kind: 'claim-command-conflict' }
  | { readonly kind: 'invalid-claim-command' }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'forbidden' }
  | { readonly kind: 'timeout' }
  | { readonly kind: 'transport' }
  | { readonly kind: 'service-unavailable'; readonly status: number }
  | { readonly kind: 'unexpected-response'; readonly status: number }
  | { readonly kind: 'invalid-response' }
  | { readonly kind: 'request-cancelled' };
