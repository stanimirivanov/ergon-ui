import { Effect } from 'effect';
import type { RunRetrySuccessorFailure } from '../retry-successor-contracts';
import { normalizeRunSupervisionFailure } from '../normalize-run-supervision-failure';
import { readHttpFailure } from './run-supervision-http';

/** Recognized protected 404 remains denial; unknown missing routes never masquerade as an absent successor. */
export function readRetrySuccessorFailure(
  response: Response,
  signal: AbortSignal,
): Effect.Effect<RunRetrySuccessorFailure, RunRetrySuccessorFailure, never> {
  return readHttpFailure(response, signal).pipe(
    Effect.map((failure): RunRetrySuccessorFailure =>
      (failure.kind === 'unexpected-http-status' &&
        [404, 405].includes(failure.status)) ||
      (failure.kind === 'service-unavailable' && failure.status === 501)
        ? { kind: 'successor-unsupported' }
        : failure,
    ),
  );
}

/** Closed cause-free vocabulary, including against throwing accessors, before framework serialization. */
export function normalizeRetrySuccessorFailure(
  value: unknown,
): RunRetrySuccessorFailure {
  try {
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      'kind' in value &&
      value.kind === 'successor-unsupported'
    )
      return { kind: 'successor-unsupported' };
  } catch {
    return { kind: 'unexpected-defect' };
  }
  return normalizeRunSupervisionFailure(value);
}
