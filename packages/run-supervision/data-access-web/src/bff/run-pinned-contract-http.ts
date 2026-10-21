import { Effect } from 'effect';
import type { RunPinnedContractFailure } from '../pinned-contract-contracts';
import { normalizeRunSupervisionFailure } from '../normalize-run-supervision-failure';
import { readHttpFailure } from './run-supervision-http';

/** Recognized private denial remains neutral; unknown missing routes mean unsupported, never empty or an internal fallback. */
export function readPinnedContractFailure(
  response: Response,
  signal: AbortSignal,
): Effect.Effect<RunPinnedContractFailure, RunPinnedContractFailure, never> {
  return readHttpFailure(response, signal).pipe(
    Effect.map((failure): RunPinnedContractFailure =>
      (failure.kind === 'unexpected-http-status' &&
        [404, 405].includes(failure.status)) ||
      (failure.kind === 'service-unavailable' && failure.status === 501)
        ? { kind: 'contract-unsupported' }
        : failure,
    ),
  );
}

/** Closed cause-free vocabulary before RTK serialization, including hostile accessors. */
export function normalizePinnedContractFailure(
  value: unknown,
): RunPinnedContractFailure {
  try {
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      'kind' in value &&
      value.kind === 'contract-unsupported'
    )
      return { kind: 'contract-unsupported' };
  } catch {
    return { kind: 'unexpected-defect' };
  }
  return normalizeRunSupervisionFailure(value);
}
