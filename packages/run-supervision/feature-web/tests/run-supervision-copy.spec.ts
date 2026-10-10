import { describe, expect, it } from 'vitest';
import {
  normalizeRunSupervisionFailure,
  type RunSupervisionFailure,
} from '@ergon/run-supervision-data-access-web';

import { runSupervisionFailureCopy } from '../src/run-supervision-copy';

describe('assigned read recovery copy', () => {
  it.each([
    [{ kind: 'authentication-required' }, 'sign-in'],
    [{ kind: 'authentication-unavailable' }, 'none'],
    [{ kind: 'actor-not-registered' }, 'none'],
    [{ kind: 'identity-rejected' }, 'none'],
    [{ kind: 'forbidden' }, 'none'],
    [{ kind: 'invalid-page' }, 'reset-page'],
    [{ kind: 'not-found' }, 'retry-read'],
    [{ kind: 'invalid-response' }, 'retry-read'],
    [{ kind: 'unexpected-defect' }, 'retry-read'],
    [{ kind: 'transport' }, 'retry-read'],
    [{ kind: 'timeout' }, 'retry-read'],
    [{ kind: 'request-cancelled' }, 'retry-read'],
    [{ kind: 'service-unavailable', status: 503 }, 'retry-read'],
    [{ kind: 'unexpected-http-status', status: 502 }, 'retry-read'],
  ] satisfies readonly (readonly [RunSupervisionFailure, string])[])(
    'pairs the %j failure with its executable %s recovery',
    (failure, recovery) => {
      expect(runSupervisionFailureCopy(failure).recovery).toBe(recovery);
    },
  );

  it('separates a disabled authentication boundary from a temporary service outage', () => {
    expect(
      runSupervisionFailureCopy({ kind: 'authentication-unavailable' })
        .description,
    ).toContain('operator');
    expect(
      runSupervisionFailureCopy({ kind: 'service-unavailable', status: 503 })
        .recovery,
    ).toBe('retry-read');
  });

  it('uses defect copy for an unknown framework error, not invalid-response copy', () => {
    const copy = runSupervisionFailureCopy(
      normalizeRunSupervisionFailure({
        message: 'private sentinel',
        stack: 'secret',
      }),
    );
    expect(copy.description).toContain('unexpected problem');
    expect(copy.description).not.toContain('response');
    expect(copy.description).not.toContain('sentinel');
    expect(copy).not.toEqual(
      runSupervisionFailureCopy({ kind: 'invalid-response' }),
    );
  });
});
