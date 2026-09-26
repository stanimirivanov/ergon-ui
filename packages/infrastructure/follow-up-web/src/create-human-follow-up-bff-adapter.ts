import type {
  ClaimHumanFollowUp,
  GetOwnedFollowUpCaseSummary,
  ListOpenHumanFollowUps,
  ListOwnedHumanFollowUps,
} from '@ergon/application-follow-up';

import { createFollowUpClaimAdapter } from './bff/follow-up-claim-adapter';
import { createFollowUpReadAdapter } from './bff/follow-up-read-adapter';

export interface HumanFollowUpBffAdapterOptions {
  readonly fetch: typeof globalThis.fetch;
  /** Positive timeout in milliseconds applied to each outbound HTTP request. */
  readonly requestTimeout?: number;
}

type HumanFollowUpBffAdapter = ListOpenHumanFollowUps &
  ListOwnedHumanFollowUps &
  GetOwnedFollowUpCaseSummary &
  ClaimHumanFollowUp;

/**
 * Adapts the confidential browser BFF to the follow-up application ports.
 *
 * Responses are fully decoded before reaching application state. Read
 * operations retry one classified transient failure; claim commands are never
 * replayed automatically. The session-bound CSRF value remains inside the
 * returned adapter and is discarded when the server rejects it. Caller
 * cancellation interrupts Effect, propagates to the signal supplied to fetch,
 * and returns the ports' typed cancellation failure.
 *
 * @throws {RangeError} When `requestTimeout` is not a positive finite number.
 */
export function createHumanFollowUpBffAdapter({
  fetch,
  requestTimeout = 5_000,
}: HumanFollowUpBffAdapterOptions): HumanFollowUpBffAdapter {
  if (!Number.isFinite(requestTimeout) || requestTimeout <= 0) {
    throw new RangeError('requestTimeout must be a positive finite number');
  }

  return {
    ...createFollowUpReadAdapter({ fetch, requestTimeout }),
    ...createFollowUpClaimAdapter({ fetch, requestTimeout }),
  };
}
