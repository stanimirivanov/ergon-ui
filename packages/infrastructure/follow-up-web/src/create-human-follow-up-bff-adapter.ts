import type {
  ClaimHumanFollowUp,
  GetOwnedFollowUpCaseSummary,
  ListOpenHumanFollowUps,
  ListOwnedHumanFollowUps,
} from '@ergon/application-follow-up';

import { createFollowUpClaimAdapter } from './bff/follow-up-claim-adapter';
import { createFollowUpReadAdapter } from './bff/follow-up-read-adapter';

/** Dependencies and per-request policy for the confidential-BFF adapter. */
export interface HumanFollowUpBffAdapterOptions {
  /** Fetch-compatible transport; requests remain same-origin and credentialed. */
  readonly fetch: typeof globalThis.fetch;
  /**
   * Positive timeout in milliseconds applied independently to each outbound
   * HTTP attempt. Defaults to 5,000 milliseconds.
   */
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
 * The adapter instance owns its in-memory CSRF state. Create it for one
 * browser-session composition lifetime and discard it when that session is
 * replaced; do not share it across authenticated browser sessions.
 *
 * @returns The four follow-up application ports backed by one adapter state.
 * @throws A `RangeError` when `requestTimeout` is not a positive finite number.
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
