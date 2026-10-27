import { Schema } from 'effect';
import type { ProgressFailure, ProgressQuery } from './progress-client';
import { requesterTextSchema } from './question-history';

/**
 * Immutable mounted replay intent: all identifiers are UUIDs and answer must
 * satisfy isRequesterAnswerText. Invalid input resolves invalid-answer before I/O.
 * Preserve every coordinate and exact text after uncertainty; never persist it.
 */
export interface RequesterAnswerCommand extends ProgressQuery {
  readonly requestId: string;
  readonly responseId: string;
  readonly answer: string;
}
/** Safe outcomes only; an uncertain failure never proves the POST was not recorded. */
export type RequesterAnswerFailure =
  | ProgressFailure
  | {
      readonly kind: 'answer-conflict' | 'invalid-answer' | 'csrf-rejected';
    };
export type RequesterAnswerResult =
  | { readonly ok: true; readonly responseId: string }
  | { readonly ok: false; readonly error: RequesterAnswerFailure };
/**
 * One explicit invocation obtains fresh session CSRF then sends at most one POST.
 * No automatic mutation retry. Cancellation retires the observation, not a write.
 * Expected failures resolve safely; rejected defects are contained by the RTK boundary.
 */
export interface RequesterAnswerClient {
  recordAnswer(
    command: RequesterAnswerCommand,
    signal: AbortSignal,
  ): Promise<RequesterAnswerResult>;
}
/** Matches Kotlin's nonblank, 1–4000 Unicode-code-point rules without trimming or normalizing text. */
export function isRequesterAnswerText(value: string): boolean {
  return Schema.is(requesterTextSchema)(value);
}
