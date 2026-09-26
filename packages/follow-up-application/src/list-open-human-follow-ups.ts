import type { HumanFollowUpWorkItem } from '@ergon/follow-up-domain';

import type { HumanFollowUpFailure } from './human-follow-up-failures';

/** Exact oldest-first keyset position; both values must travel together. */
export interface HumanFollowUpCursor {
  readonly afterOpenedAt: string;
  readonly afterWorkItemId: string;
}

export interface HumanFollowUpPage {
  readonly items: readonly HumanFollowUpWorkItem[];
  readonly nextCursor: HumanFollowUpCursor | null;
}

/** Bounded inbox request scoped to one tenant and optional exact queue. */
export interface HumanFollowUpQuery {
  readonly tenantId: string;
  readonly queueKey?: string;
  readonly limit: number;
  readonly cursor?: HumanFollowUpCursor;
}

export type HumanFollowUpResult =
  | { readonly ok: true; readonly page: HumanFollowUpPage }
  | { readonly ok: false; readonly error: HumanFollowUpFailure };

/** Lists decoded follow-up work visible to the current tenant actor. */
export interface ListOpenHumanFollowUps {
  listOpen(
    query: HumanFollowUpQuery,
    signal: AbortSignal,
  ): Promise<HumanFollowUpResult>;
}
