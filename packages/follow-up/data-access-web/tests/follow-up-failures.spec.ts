import { describe, expect, it } from 'vitest';

import {
  isRetryableClaimSetupFailure,
  mapAbortedTransportFailure,
  mapCaseSummaryHttpFailure,
  mapClaimHttpFailure,
  mapReadHttpFailure,
  TIMEOUT_FAILURE,
  TRANSPORT_FAILURE,
} from '../src/bff/follow-up-failures';

const readFailureCases = [
  {
    status: 401,
    problem: {
      type: 'urn:ergon:problem:browser-authentication-required',
      signInPath: '/bff/login',
    },
    expected: { kind: 'authentication-required' },
  },
  {
    status: 403,
    problem: { type: 'urn:ergon:problem:human-actor-not-registered' },
    expected: { kind: 'actor-not-registered' },
  },
  {
    status: 403,
    problem: { type: 'urn:ergon:problem:untrusted-human-identity-issuer' },
    expected: { kind: 'identity-rejected' },
  },
  {
    status: 403,
    problem: {
      type: 'urn:ergon:problem:invalid-authenticated-human-identity',
    },
    expected: { kind: 'identity-rejected' },
  },
  {
    status: 400,
    problem: { type: 'urn:ergon:problem:invalid-human-follow-up-queue' },
    expected: { kind: 'invalid-filter' },
  },
  {
    status: 400,
    problem: { type: 'urn:ergon:problem:invalid-human-follow-up-page' },
    expected: { kind: 'invalid-page' },
  },
  {
    status: 400,
    problem: {
      type: 'urn:ergon:problem:invalid-resolver-owned-human-follow-up-page',
    },
    expected: { kind: 'invalid-page' },
  },
  {
    status: 503,
    problem: {
      type: 'urn:ergon:problem:browser-authentication-unavailable',
    },
    expected: { kind: 'authentication-unavailable' },
  },
] as const;

const claimFailureCases = [
  {
    status: 403,
    problem: { type: 'urn:ergon:problem:invalid-browser-csrf-token' },
    expected: { kind: 'csrf-rejected' },
  },
  {
    status: 403,
    problem: {
      type: 'urn:ergon:problem:human-follow-up-resolver-authority-required',
    },
    expected: { kind: 'resolver-authority-required' },
  },
  {
    status: 409,
    problem: { type: 'urn:ergon:problem:human-follow-up-already-claimed' },
    expected: { kind: 'already-claimed' },
  },
  {
    status: 409,
    problem: {
      type: 'urn:ergon:problem:human-follow-up-ownership-revision-conflict',
    },
    expected: { kind: 'ownership-revision-conflict' },
  },
  {
    status: 409,
    problem: {
      type: 'urn:ergon:problem:human-follow-up-claim-command-conflict',
    },
    expected: { kind: 'claim-command-conflict' },
  },
  {
    status: 400,
    problem: {
      type: 'urn:ergon:problem:invalid-human-follow-up-claim-command',
    },
    expected: { kind: 'invalid-claim-command' },
  },
  {
    status: 404,
    problem: {
      type: 'urn:ergon:problem:human-follow-up-work-item-not-found',
    },
    expected: { kind: 'not-found' },
  },
] as const;

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

  it.each(readFailureCases)(
    'maps read problem $problem.type to $expected.kind',
    ({ status, problem, expected }) => {
      expect(mapReadHttpFailure(status, problem)).toEqual(expected);
    },
  );

  it.each(claimFailureCases)(
    'maps claim problem $problem.type to $expected.kind',
    ({ status, problem, expected }) => {
      expect(mapClaimHttpFailure(status, problem)).toEqual(expected);
    },
  );

  it('shares common problem mappings between read and claim operations', () => {
    const problem = {
      type: 'urn:ergon:problem:human-actor-not-registered',
    };

    expect(mapReadHttpFailure(403, problem)).toEqual({
      kind: 'actor-not-registered',
    });
    expect(mapClaimHttpFailure(403, problem)).toEqual({
      kind: 'actor-not-registered',
    });
  });

  it('requires the canonical sign-in path for authentication failures', () => {
    const problem = {
      type: 'urn:ergon:problem:browser-authentication-required',
      signInPath: '/untrusted',
    };

    expect(mapReadHttpFailure(401, problem)).toEqual({
      kind: 'unexpected-response',
      status: 401,
    });
    expect(mapClaimHttpFailure(401, problem)).toEqual({
      kind: 'unexpected-response',
      status: 401,
    });
  });

  it.each([
    [403, { kind: 'forbidden' }],
    [502, { kind: 'service-unavailable', status: 502 }],
    [418, { kind: 'unexpected-response', status: 418 }],
  ] as const)(
    'maps HTTP status %s through the fallback table',
    (status, expected) => {
      expect(mapReadHttpFailure(status)).toEqual(expected);
      expect(mapClaimHttpFailure(status)).toEqual(expected);
    },
  );

  it('maps the case-summary not-found problem before read fallbacks', () => {
    expect(
      mapCaseSummaryHttpFailure(404, {
        type: 'urn:ergon:problem:resolver-follow-up-case-summary-not-found',
      }),
    ).toEqual({ kind: 'not-found' });
    expect(mapCaseSummaryHttpFailure(502)).toEqual({
      kind: 'service-unavailable',
      status: 502,
    });
  });
});
