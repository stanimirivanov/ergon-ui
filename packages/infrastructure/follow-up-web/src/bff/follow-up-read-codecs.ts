import type {
  HumanFollowUpFailure,
  HumanFollowUpPage,
  ResolverFollowUpCaseSummaryFailure,
  ResolverFollowUpCaseSummaryQuery,
  ResolverOwnedHumanFollowUpPage,
} from '../client';
import {
  isResolverFollowUpCaseSummary,
  type ResolverFollowUpCaseSummary,
} from '@ergon/domain-follow-up';
import { Effect, Schema } from 'effect';

import {
  INVALID_RESPONSE,
  mapCaseSummaryHttpFailure,
  mapReadHttpFailure,
} from './follow-up-failures';
import {
  humanFollowUpPageSchema,
  resolverFollowUpCaseSummarySchema,
  resolverOwnedHumanFollowUpPageSchema,
} from './follow-up-wire-schemas';
import { readJson, readOptionalProblem } from './json-response';

/**
 * Decodes a visible-work response into an application page.
 * Successful but malformed bodies fail as `invalid-response`; non-success
 * responses use the reviewed problem/status mapping.
 */
export function decodeHumanFollowUpPage(
  response: Response,
): Effect.Effect<HumanFollowUpPage, HumanFollowUpFailure, never> {
  if (response.ok) {
    return readJson(response).pipe(
      Effect.flatMap(Schema.decodeUnknown(humanFollowUpPageSchema)),
      Effect.map((page): HumanFollowUpPage => page),
      Effect.mapError(() => INVALID_RESPONSE),
    );
  }

  return readOptionalProblem(response).pipe(
    Effect.flatMap((problem) =>
      Effect.fail(mapReadHttpFailure(response.status, problem)),
    ),
  );
}

/**
 * Decodes resolver-owned work and rejects any claim/work-item identity
 * mismatch enforced by the wire schema.
 */
export function decodeResolverOwnedHumanFollowUpPage(
  response: Response,
): Effect.Effect<ResolverOwnedHumanFollowUpPage, HumanFollowUpFailure, never> {
  if (response.ok) {
    return readJson(response).pipe(
      Effect.flatMap(
        Schema.decodeUnknown(resolverOwnedHumanFollowUpPageSchema),
      ),
      Effect.map((page): ResolverOwnedHumanFollowUpPage => page),
      Effect.mapError(() => INVALID_RESPONSE),
    );
  }

  return readOptionalProblem(response).pipe(
    Effect.flatMap((problem) =>
      Effect.fail(mapReadHttpFailure(response.status, problem)),
    ),
  );
}

/**
 * Decodes one server-authorized case-context response. Request identity is
 * checked here before the pure model refinement, so a valid projection for
 * different work cannot enter the RTK Query cache.
 */
export function decodeResolverFollowUpCaseSummary(
  response: Response,
  query: ResolverFollowUpCaseSummaryQuery,
): Effect.Effect<
  ResolverFollowUpCaseSummary,
  ResolverFollowUpCaseSummaryFailure,
  never
> {
  if (response.ok) {
    return readJson(response).pipe(
      Effect.flatMap(Schema.decodeUnknown(resolverFollowUpCaseSummarySchema)),
      Effect.flatMap((summary) =>
        summary.followUp.workItemId === query.workItemId &&
        summary.case.caseId === query.caseId &&
        summary.resolutionRun.runId === query.runId &&
        isResolverFollowUpCaseSummary(summary)
          ? Effect.succeed(summary)
          : Effect.fail(INVALID_RESPONSE),
      ),
      Effect.mapError(
        (): ResolverFollowUpCaseSummaryFailure => INVALID_RESPONSE,
      ),
    );
  }

  return readOptionalProblem(response).pipe(
    Effect.flatMap((problem) =>
      Effect.fail(mapCaseSummaryHttpFailure(response.status, problem)),
    ),
  );
}
