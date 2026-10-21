import type { Effect } from 'effect';
import type { RunPinnedContractFailure } from '../pinned-contract-contracts';
import {
  normalizeInspectionFailure,
  readInspectionFailure,
} from './run-inspection-http';

/** Recognized private denial remains neutral; unknown missing routes mean unsupported, never empty or an internal fallback. */
export function readPinnedContractFailure(
  response: Response,
  signal: AbortSignal,
): Effect.Effect<RunPinnedContractFailure, RunPinnedContractFailure, never> {
  return readInspectionFailure(response, signal, 'contract-unsupported');
}

/** Closed cause-free vocabulary before RTK serialization, including hostile accessors. */
export function normalizePinnedContractFailure(
  value: unknown,
): RunPinnedContractFailure {
  return normalizeInspectionFailure(value, 'contract-unsupported');
}
