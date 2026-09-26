import { describe, expect, it } from 'vitest';

import {
  isRetryableClaimSetupFailure,
  mapAbortedTransportFailure,
  TIMEOUT_FAILURE,
  TRANSPORT_FAILURE,
} from '../src/bff/follow-up-failures';

describe('follow-up infrastructure failures', () => {
  it('gives caller cancellation precedence over a racing AbortError', () => {
    const controller = new AbortController();
    controller.abort();

    expect(
      mapAbortedTransportFailure(controller.signal, TRANSPORT_FAILURE),
    ).toEqual({ kind: 'request-cancelled' });
  });

  it('does not retry a timed-out CSRF acquisition', () => {
    expect(isRetryableClaimSetupFailure(TIMEOUT_FAILURE)).toBe(false);
    expect(isRetryableClaimSetupFailure(TRANSPORT_FAILURE)).toBe(true);
  });
});
