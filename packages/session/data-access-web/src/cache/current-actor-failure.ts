import type { CurrentActorFailure } from '../current-actor-client';

/**
 * Narrows a cache/framework error to the session's disclosure-safe failure.
 *
 * Copies only recognized fields; unknown kinds or invalid HTTP statuses mean
 * an unexpected defect, never a malformed response. Only RTK's exact abort
 * fingerprint is cancellation. A rejected client promise is contained by the
 * query function instead, regardless of a concurrent abort.
 */
export function normalizeCurrentActorFailure(
  error: unknown,
): CurrentActorFailure {
  try {
    if (typeof error !== 'object' || error === null || Array.isArray(error)) {
      return { kind: 'unexpected-defect' };
    }
    if ('kind' in error) {
      const kind = error.kind;
      switch (kind) {
        case 'authentication-required':
        case 'authentication-unavailable':
        case 'actor-not-registered':
        case 'identity-rejected':
        case 'forbidden':
        case 'timeout':
        case 'transport':
        case 'invalid-response':
        case 'unexpected-defect':
        case 'request-cancelled':
          return { kind };
        case 'service-unavailable':
        case 'unexpected-response': {
          const status = 'status' in error ? error.status : undefined;
          if (
            typeof status === 'number' &&
            Number.isInteger(status) &&
            status >= 100 &&
            status <= 599
          ) {
            return { kind, status };
          }
          break;
        }
      }
    } else if (Object.getPrototypeOf(error) === Object.prototype) {
      const keys = Object.keys(error);
      if (
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
    }
  } catch {
    // Error accessors can throw; their cause is never a safe presentation value.
  }
  return { kind: 'unexpected-defect' };
}
