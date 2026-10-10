import type { RunSupervisionFailure } from './contracts';

type StatelessFailureKind = Exclude<
  RunSupervisionFailure['kind'],
  'service-unavailable' | 'unexpected-http-status'
>;

const STATELESS_FAILURE_KINDS = {
  'authentication-required': true,
  'authentication-unavailable': true,
  'actor-not-registered': true,
  'identity-rejected': true,
  forbidden: true,
  'not-found': true,
  'invalid-page': true,
  'invalid-response': true,
  transport: true,
  timeout: true,
  'request-cancelled': true,
  'unexpected-defect': true,
} satisfies Readonly<Record<StatelessFailureKind, true>>;

/**
 * Narrows an RTK error to the safe, closed supervision failure vocabulary.
 *
 * Returns fresh literals containing only an accepted kind and, when required,
 * an integer HTTP status in 100–599. Unknown/malformed values and property-access
 * defects become `unexpected-defect`; no raw cause or diagnostic field survives.
 * The exact plain-object cancellation fingerprint emitted by RTK's pinned thunk
 * runtime is recognized separately. This does not infer cancellation from a
 * caller's signal or normalize a caught client rejection as cancellation.
 */
export function normalizeRunSupervisionFailure(
  error: unknown,
): RunSupervisionFailure {
  try {
    if (typeof error !== 'object' || error === null || Array.isArray(error)) {
      return { kind: 'unexpected-defect' };
    }
    if ('kind' in error) {
      const kind = error.kind;
      if (isStatelessFailureKind(kind)) return { kind };
      if (
        (kind === 'service-unavailable' || kind === 'unexpected-http-status') &&
        'status' in error
      ) {
        // Accessors are untrusted too: project the same value we validated.
        const status = error.status;
        if (
          typeof status === 'number' &&
          Number.isInteger(status) &&
          status >= 100 &&
          status <= 599
        ) {
          return { kind, status };
        }
      }
      return { kind: 'unexpected-defect' };
    }
    // RTK's own abort wins its race before an endpoint can return a typed result.
    // A DOMException/Error or arbitrary AbortError-shaped rejection is not proof.
    const keys = Object.keys(error);
    if (
      Object.getPrototypeOf(error) === Object.prototype &&
      keys.length === 2 &&
      keys.includes('name') &&
      keys.includes('message') &&
      'name' in error &&
      error.name === 'AbortError' &&
      'message' in error &&
      error.message === 'Aborted'
    ) {
      return { kind: 'request-cancelled' };
    }
  } catch {
    // Untrusted error objects may expose throwing getters or proxy traps.
  }
  return { kind: 'unexpected-defect' };
}

function isStatelessFailureKind(kind: unknown): kind is StatelessFailureKind {
  return (
    typeof kind === 'string' && Object.hasOwn(STATELESS_FAILURE_KINDS, kind)
  );
}
