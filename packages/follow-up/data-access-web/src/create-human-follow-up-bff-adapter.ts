import type {
  ClaimHumanFollowUp,
  GetOwnedFollowUpCaseSummary,
  ListOpenHumanFollowUps,
  ListOwnedHumanFollowUps,
  ReleaseHumanFollowUp,
} from './client';

import { createFollowUpOwnershipAdapter } from './bff/follow-up-ownership-adapter';
import { createFollowUpReadAdapter } from './bff/follow-up-read-adapter';
import type { FollowUpNotesClient } from './client/follow-up-notes';
import { listFollowUpNotes } from './bff/follow-up-notes-adapter';

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
  ClaimHumanFollowUp &
  ReleaseHumanFollowUp &
  FollowUpNotesClient;

/**
 * Adapts the confidential browser BFF to the follow-up data-access contracts.
 *
 * Responses are fully decoded before reaching application state. Read
 * operations retry one classified transient failure; mutations are
 * never replayed automatically. The session-bound CSRF value remains inside the
 * returned adapter and is discarded when the server rejects it. Caller
 * cancellation interrupts Effect, propagates to the signal supplied to fetch,
 * and returns the operations' typed cancellation failure.
 * Returned operations can reject unexpected implementation defects. The RTK
 * Query integration contains those rejections without disclosing their details;
 * direct callers must not treat rejection as proof that a mutation did not occur.
 *
 * The adapter instance owns its in-memory CSRF state. Create it for one
 * browser-session composition lifetime and discard it when that session is
 * replaced; do not share it across authenticated browser sessions.
 *
 * @returns The seven follow-up operations backed by one adapter state.
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
    listNotes: listFollowUpNotes(fetch, requestTimeout),
    ...createFollowUpReadAdapter({ fetch, requestTimeout }),
    ...createFollowUpOwnershipAdapter({ fetch, requestTimeout }),
  };
}
