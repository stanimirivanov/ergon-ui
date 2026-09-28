import type { CurrentActor } from '@ergon/domain-session';

/**
 * Presentation-safe failures from reading the current confidential session.
 *
 * Status-bearing variants retain only the response status. Protocol recovery
 * locations and raw browser, provider, and network details are deliberately
 * omitted so failures may safely enter the RTK Query error channel.
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

/** Verified session actor or an explicit presentation-safe data-access failure. */
export type CurrentActorResult =
  | { readonly ok: true; readonly actor: CurrentActor }
  | { readonly ok: false; readonly error: CurrentActorFailure };

/**
 * Reads the actor authorized for a tenant-scoped browser request.
 *
 * The tenant identifier selects request context and does not confer authority.
 * Callers provide a validated tenant UUID. Implementations honor caller
 * cancellation and resolve it as the typed `request-cancelled` result.
 * Expected boundary failures resolve through `CurrentActorResult`; only an
 * unexpected implementation defect may reject the promise. Transport,
 * decoding, retry, and timeout details do not escape this data-access contract.
 */
export interface CurrentActorClient {
  resolve(tenantId: string, signal: AbortSignal): Promise<CurrentActorResult>;
}
