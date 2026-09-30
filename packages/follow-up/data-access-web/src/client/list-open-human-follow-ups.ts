import type { HumanFollowUpWorkItem } from '@ergon/domain-follow-up';

import type { HumanFollowUpFailure } from './human-follow-up-failures';

/**
 * Exclusive oldest-first keyset position returned by the server.
 *
 * The validated UTC instant and work-item UUID form one cursor and must travel
 * together; neither value is independently meaningful.
 */
export interface HumanFollowUpCursor {
  readonly afterOpenedAt: string;
  readonly afterWorkItemId: string;
}

/** Oldest-first page of currently visible open work. */
export interface HumanFollowUpPage {
  readonly items: readonly HumanFollowUpWorkItem[];
  /** Exact continuation position, or `null` when no later page exists. */
  readonly nextCursor: HumanFollowUpCursor | null;
}

/**
 * Bounded inbox request scoped to one tenant and optional exact queue.
 *
 * `tenantId` is request context, not authority; the server derives authority
 * from the authenticated browser session. `limit` must be a positive,
 * server-supported page size.
 */
export interface HumanFollowUpQuery {
  readonly tenantId: string;
  readonly queueKey?: string;
  readonly limit: number;
  readonly cursor?: HumanFollowUpCursor;
}

/** Decoded inbox page or a failure safe for presentation and Redux state. */
export type HumanFollowUpResult =
  | { readonly ok: true; readonly page: HumanFollowUpPage }
  | { readonly ok: false; readonly error: HumanFollowUpFailure };

/**
 * Lists decoded follow-up work visible to the current tenant actor.
 *
 * Implementations must honor `signal`, resolve cancellation as the typed
 * `request-cancelled` outcome, and must not infer tenant authority from the
 * query alone.
 */
export interface ListOpenHumanFollowUps {
  listOpen(
    query: HumanFollowUpQuery,
    signal: AbortSignal,
  ): Promise<HumanFollowUpResult>;
}
