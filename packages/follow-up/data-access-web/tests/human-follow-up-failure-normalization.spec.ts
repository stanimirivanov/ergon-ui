import { describe, expect, it } from 'vitest';

import {
  normalizeHumanFollowUpFailure,
  normalizeHumanFollowUpClaimFailure,
  normalizeHumanFollowUpReleaseFailure,
  normalizeResolverFollowUpCaseSummaryFailure,
} from '../src';

const normalizers = [
  { name: 'read', normalize: normalizeHumanFollowUpFailure },
  { name: 'claim', normalize: normalizeHumanFollowUpClaimFailure },
  { name: 'release', normalize: normalizeHumanFollowUpReleaseFailure },
  { name: 'summary', normalize: normalizeResolverFollowUpCaseSummaryFailure },
];

describe.each(normalizers)('$name failure normalization', ({ normalize }) => {
  it.each([
    undefined,
    null,
    'transport',
    { kind: 'new-kind' },
    { kind: 1 },
    new Error('private defect detail'),
    { name: 'AbortError', message: 'cancelled by framework' },
    { name: 'AbortError' },
    { name: 'OtherError', message: 'Aborted' },
    { name: 'AbortError', message: 'Aborted', stack: 'private stack' },
    { name: 'AbortError', message: 'Aborted', cause: 'private cause' },
    Object.assign(new Error('Aborted'), { name: 'AbortError' }),
    new DOMException('Aborted', 'AbortError'),
    { kind: 'service-unavailable' },
    { kind: 'unexpected-response', status: '503' },
    { kind: 'service-unavailable', status: 503.5 },
    { kind: 'unexpected-response', status: Number.NaN },
    { kind: 'unexpected-response', status: Number.POSITIVE_INFINITY },
    { kind: 'unexpected-response', status: 99 },
    { kind: 'service-unavailable', status: 600 },
  ])('contains malformed or unknown failures %#', (value) => {
    expect(normalize(value)).toEqual({ kind: 'unexpected-defect' });
  });

  it.each(['service-unavailable', 'unexpected-response'])(
    'preserves only a validated %s status',
    (kind) => {
      for (const status of [100, 503, 599]) {
        expect(
          normalize({ kind, status, message: 'private', cause: new Error() }),
        ).toEqual({ kind, status });
      }
    },
  );

  it('strips surplus serialized and raw error details from expected failures', () => {
    expect(
      normalize({
        kind: 'transport',
        name: 'PrivateError',
        message: 'private response body',
        stack: 'private stack',
        cause: new Error('private cause'),
      }),
    ).toEqual({ kind: 'transport' });
    expect(normalize({ kind: 'request-cancelled' })).toEqual({
      kind: 'request-cancelled',
    });
  });

  it('contains exceptions thrown by untrusted error accessors', () => {
    const value = {
      get kind(): string {
        throw new Error('private accessor defect');
      },
    };
    expect(normalize(value)).toEqual({ kind: 'unexpected-defect' });
  });

  it('validates and returns the same once-read status and kind values', () => {
    let kindReads = 0;
    let statusReads = 0;
    const value = {
      get kind() {
        kindReads += 1;
        return kindReads === 1 ? 'unexpected-response' : 'unknown';
      },
      get status() {
        statusReads += 1;
        return statusReads === 1 ? 503 : 'private';
      },
    };
    expect(normalize(value)).toEqual({
      kind: 'unexpected-response',
      status: 503,
    });
    expect(kindReads).toBe(1);
    expect(statusReads).toBe(1);
  });

  it('recognizes only the framework cancellation fingerprint without a kind', () => {
    expect(normalize({ name: 'AbortError', message: 'Aborted' })).toEqual({
      kind: 'request-cancelled',
    });
    expect(
      normalize({ kind: 'transport', name: 'AbortError', message: 'Aborted' }),
    ).toEqual({ kind: 'transport' });
    expect(
      normalize({ kind: 'new-kind', name: 'AbortError', message: 'Aborted' }),
    ).toEqual({ kind: 'unexpected-defect' });
  });
});

describe('operation-specific failure sets', () => {
  it('rejects variants that are not part of the operation contract', () => {
    expect(normalizeHumanFollowUpFailure({ kind: 'not-found' })).toEqual({
      kind: 'unexpected-defect',
    });
    expect(
      normalizeHumanFollowUpClaimFailure({ kind: 'release-unavailable' }),
    ).toEqual({
      kind: 'unexpected-defect',
    });
    expect(
      normalizeHumanFollowUpReleaseFailure({ kind: 'claim-command-conflict' }),
    ).toEqual({
      kind: 'unexpected-defect',
    });
  });

  it('preserves summary absence and distinct claim/release recovery meanings', () => {
    expect(
      normalizeResolverFollowUpCaseSummaryFailure({ kind: 'not-found' }),
    ).toEqual({
      kind: 'not-found',
    });
    expect(
      normalizeHumanFollowUpClaimFailure({ kind: 'claim-command-conflict' }),
    ).toEqual({
      kind: 'claim-command-conflict',
    });
    expect(
      normalizeHumanFollowUpReleaseFailure({ kind: 'release-unavailable' }),
    ).toEqual({
      kind: 'release-unavailable',
    });
  });
});
