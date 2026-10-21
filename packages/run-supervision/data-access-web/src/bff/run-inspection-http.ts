import { Effect } from 'effect';
import type { RunSupervisionFailure } from '../contracts';
import { normalizeRunSupervisionFailure } from '../normalize-run-supervision-failure';
import { readHttpFailure } from './run-supervision-http';

type InspectionFailure<K extends string> =
  RunSupervisionFailure | { readonly kind: K };

/** Share missing-route compatibility mechanics, never turn recognized protected denial into unsupported or empty data. */
export function readInspectionFailure<K extends string>(
  response: Response,
  signal: AbortSignal,
  unsupported: K,
): Effect.Effect<InspectionFailure<K>, InspectionFailure<K>, never> {
  return readHttpFailure(response, signal).pipe(
    Effect.map((failure): InspectionFailure<K> =>
      (failure.kind === 'unexpected-http-status' &&
        [404, 405].includes(failure.status)) ||
      (failure.kind === 'service-unavailable' && failure.status === 501)
        ? { kind: unsupported }
        : failure,
    ),
  );
}

/** Copy only recognized vocabulary before RTK serialization; hostile accessors and unknown diagnostics remain cause-free defects. */
export function normalizeInspectionFailure<K extends string>(
  value: unknown,
  unsupported: K,
): InspectionFailure<K> {
  try {
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      'kind' in value &&
      value.kind === unsupported
    )
      return { kind: unsupported };
  } catch {
    return { kind: 'unexpected-defect' };
  }
  return normalizeRunSupervisionFailure(value);
}
