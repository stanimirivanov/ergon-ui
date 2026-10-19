import { Effect } from 'effect';
import type { RunExecutionHistoryFailure } from '../execution-history-contracts';
import { normalizeRunSupervisionFailure } from '../normalize-run-supervision-failure';
import { readHttpFailure } from './run-supervision-http';

/** Known protected absence keeps its neutral meaning; unknown missing-route/method responses never become an empty audit. */
export function readExecutionHistoryFailure(
  response: Response,
  signal: AbortSignal,
): Effect.Effect<
  RunExecutionHistoryFailure,
  RunExecutionHistoryFailure,
  never
> {
  return readHttpFailure(response, signal).pipe(
    Effect.map((failure): RunExecutionHistoryFailure =>
      (failure.kind === 'unexpected-http-status' &&
        [404, 405].includes(failure.status)) ||
      (failure.kind === 'service-unavailable' && failure.status === 501)
        ? { kind: 'history-unsupported' }
        : failure,
    ),
  );
}

/** Retain only the closed failure vocabulary, including against throwing accessors; no diagnostics enter RTK state. */
export function normalizeExecutionHistoryFailure(
  value: unknown,
): RunExecutionHistoryFailure {
  try {
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      'kind' in value &&
      value.kind === 'history-unsupported'
    )
      return { kind: 'history-unsupported' };
  } catch {
    return { kind: 'unexpected-defect' };
  }
  return normalizeRunSupervisionFailure(value);
}
