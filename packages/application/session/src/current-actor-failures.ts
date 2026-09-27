/**
 * Presentation-safe failures from resolving the current confidential session.
 *
 * Status-bearing variants retain only the response status. Protocol recovery
 * locations and raw browser, provider, and network details are deliberately
 * omitted so failures may safely enter presentation state.
 */
export type CurrentActorFailure =
  | { readonly kind: 'authentication-required' }
  | { readonly kind: 'authentication-unavailable' }
  | { readonly kind: 'actor-not-registered' }
  | { readonly kind: 'identity-rejected' }
  | { readonly kind: 'forbidden' }
  | { readonly kind: 'timeout' }
  | { readonly kind: 'transport' }
  | { readonly kind: 'service-unavailable'; readonly status: number }
  | { readonly kind: 'unexpected-response'; readonly status: number }
  | { readonly kind: 'invalid-response' }
  | { readonly kind: 'request-cancelled' };
