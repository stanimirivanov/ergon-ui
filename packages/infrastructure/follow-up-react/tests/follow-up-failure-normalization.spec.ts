import { describe, expect, it } from 'vitest';

import {
  normalizeFollowUpCaseSummaryFailure,
  normalizeFollowUpClaimFailure,
  normalizeFollowUpReadFailure,
} from '../src/follow-up-failure-normalization';

describe('follow-up failure normalization', () => {
  it.each([
    ['authentication-required', { kind: 'authentication-required' }],
    ['invalid-page', { kind: 'invalid-page' }],
    ['request-cancelled', { kind: 'request-cancelled' }],
  ] as const)('preserves the read failure %s', (kind, expected) => {
    expect(normalizeFollowUpReadFailure({ kind })).toEqual(expected);
  });

  it('preserves a status-bearing read failure', () => {
    expect(
      normalizeFollowUpReadFailure({
        kind: 'service-unavailable',
        status: 503,
      }),
    ).toEqual({ kind: 'service-unavailable', status: 503 });
  });

  it('uses a non-authoritative status when a status-bearing failure is malformed', () => {
    expect(
      normalizeFollowUpReadFailure({
        kind: 'unexpected-response',
        status: '502',
      }),
    ).toEqual({ kind: 'unexpected-response', status: 0 });
  });

  it('accepts claim-only outcomes only at the claim boundary', () => {
    expect(normalizeFollowUpClaimFailure({ kind: 'already-claimed' })).toEqual({
      kind: 'already-claimed',
    });
    expect(normalizeFollowUpReadFailure({ kind: 'already-claimed' })).toEqual({
      kind: 'invalid-response',
    });
  });

  it('accepts non-disclosing absence only at the case-summary boundary', () => {
    expect(normalizeFollowUpCaseSummaryFailure({ kind: 'not-found' })).toEqual({
      kind: 'not-found',
    });
    expect(normalizeFollowUpReadFailure({ kind: 'not-found' })).toEqual({
      kind: 'invalid-response',
    });
  });

  it.each([undefined, null, 'transport', {}, { kind: 42 }, { kind: 'new' }])(
    'fails closed for unrecognized input %#',
    (error) => {
      expect(normalizeFollowUpReadFailure(error)).toEqual({
        kind: 'invalid-response',
      });
      expect(normalizeFollowUpClaimFailure(error)).toEqual({
        kind: 'invalid-response',
      });
      expect(normalizeFollowUpCaseSummaryFailure(error)).toEqual({
        kind: 'invalid-response',
      });
    },
  );
});
