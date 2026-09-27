import type {
  HumanFollowUpFailure,
  HumanFollowUpPage,
  ResolverFollowUpCaseSummaryFailure,
  ResolverFollowUpCaseSummaryQuery,
  ResolverOwnedHumanFollowUpPage,
} from '@ergon/application-follow-up';
import type { ResolverFollowUpCaseSummary } from '@ergon/domain-follow-up';
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
  type ResolverFollowUpCaseSummaryPayload,
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
 * Decodes and semantically binds one server-authorized case-context response.
 * The request identity participates in validation so a validly shaped response
 * for different work cannot enter the domain or RTK Query cache.
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
        isValidCaseSummary(summary, query)
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

/**
 * Binds structurally decoded context to the requested work item, case, and run
 * and enforces the evidence, contract, ordering, and retry-handoff invariants
 * required by the domain projection.
 */
function isValidCaseSummary(
  summary: ResolverFollowUpCaseSummaryPayload,
  query: ResolverFollowUpCaseSummaryQuery,
): summary is ResolverFollowUpCaseSummary {
  const contract = summary.case.resolutionContract;
  const positiveIntegers = [
    summary.case.streamVersion,
    summary.resolutionRun.caseEvidenceStreamVersion,
    summary.resolutionRun.contractRevision,
    summary.resolutionRun.attemptNumber,
    summary.resolutionRun.stateVersion,
    summary.escalation.sourceAttemptNumber,
    summary.escalation.maximumAttempts,
    ...summary.observations.map((observation) => observation.streamVersion),
  ];

  return (
    summary.followUp.workItemId === query.workItemId &&
    summary.case.caseId === query.caseId &&
    summary.resolutionRun.runId === query.runId &&
    contract !== null &&
    contract.key === summary.resolutionRun.contractKey &&
    contract.revision === summary.resolutionRun.contractRevision &&
    summary.resolutionRun.caseEvidenceStreamVersion <=
      summary.case.streamVersion &&
    positiveIntegers.every(isPositiveInteger) &&
    summary.escalation.sourceAttemptNumber ===
      summary.resolutionRun.attemptNumber &&
    summary.escalation.sourceAttemptNumber >=
      summary.escalation.maximumAttempts &&
    summary.escalation.occurredAt === summary.followUp.openedAt &&
    Date.parse(summary.failedExecution.completedAt) <=
      Date.parse(summary.escalation.occurredAt) &&
    summary.observations.every((observation, index, observations) => {
      const previousObservation = observations[index - 1];
      return (
        observation.streamVersion <= summary.case.streamVersion &&
        (previousObservation === undefined ||
          previousObservation.streamVersion < observation.streamVersion)
      );
    })
  );
}

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}
