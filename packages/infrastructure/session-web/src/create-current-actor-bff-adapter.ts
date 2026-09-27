import type { ResolveCurrentActor } from '@ergon/application-session';

import { createCurrentActorReadAdapter } from './bff/current-actor-read-adapter';

/** Dependencies and per-attempt policy for the current-actor BFF adapter. */
export interface CurrentActorBffAdapterOptions {
  /** Fetch-compatible transport used for same-origin credentialed requests. */
  readonly fetch: typeof globalThis.fetch;
  /**
   * Positive timeout in milliseconds applied independently to each outbound
   * HTTP attempt. Defaults to 5,000 milliseconds.
   */
  readonly requestTimeout?: number;
}

/**
 * Adapts the confidential browser session resource to current-actor resolution.
 *
 * Responses are decoded before entering application state. The idempotent read
 * retries one transport, timeout, or server-unavailability failure. Caller
 * cancellation interrupts Effect and the signal supplied to fetch, then
 * resolves as the typed `request-cancelled` failure. Provider subjects,
 * credentials, raw problem details, and browser errors never enter the result.
 *
 * @returns A stateless implementation of the current-actor resolution port.
 * @throws A `RangeError` when `requestTimeout` is not a positive finite number.
 */
export function createCurrentActorBffAdapter({
  fetch,
  requestTimeout = 5_000,
}: CurrentActorBffAdapterOptions): ResolveCurrentActor {
  if (!Number.isFinite(requestTimeout) || requestTimeout <= 0) {
    throw new RangeError('requestTimeout must be a positive finite number');
  }

  return createCurrentActorReadAdapter({ fetch, requestTimeout });
}
