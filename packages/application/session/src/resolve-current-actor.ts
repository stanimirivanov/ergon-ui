import type { CurrentActor } from '@ergon/domain-session';

import type { CurrentActorFailure } from './current-actor-failures';

/** Verified session actor or an explicit presentation-safe failure. */
export type CurrentActorResult =
  | { readonly ok: true; readonly actor: CurrentActor }
  | { readonly ok: false; readonly error: CurrentActorFailure };

/**
 * Resolves the actor authorized for a tenant-scoped browser request.
 *
 * The tenant identifier selects request context and does not confer authority.
 * Implementations must honor caller cancellation and resolve it as the typed
 * `request-cancelled` result. Transport, decoding, retry, and timeout behavior
 * remains an adapter concern and must not escape through this port.
 */
export interface ResolveCurrentActor {
  resolve(tenantId: string, signal: AbortSignal): Promise<CurrentActorResult>;
}
