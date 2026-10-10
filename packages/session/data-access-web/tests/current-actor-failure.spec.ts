import { describe, expect, it } from 'vitest';

import { normalizeCurrentActorFailure } from '../src';

describe('session failure normalization', () => {
  it.each([
    undefined,
    null,
    'private diagnostic',
    new Error('private diagnostic'),
    { kind: 'unknown' },
    { kind: 'service-unavailable' },
    { kind: 'service-unavailable', status: 0 },
    { kind: 'service-unavailable', status: 600 },
    { kind: 'service-unavailable', status: 503.5 },
    { kind: 'unexpected-response', status: Number.NaN },
  ])('never mislabels an unknown or malformed failure: %j', (failure) => {
    expect(normalizeCurrentActorFailure(failure)).toEqual({
      kind: 'unexpected-defect',
    });
  });

  it('copies recognized fields without retaining diagnostics', () => {
    expect(
      normalizeCurrentActorFailure({
        kind: 'forbidden',
        message: 'private diagnostic',
        cause: new Error('private cause'),
      }),
    ).toEqual({ kind: 'forbidden' });
    expect(
      normalizeCurrentActorFailure({
        kind: 'service-unavailable',
        status: 503,
        stack: 'private stack',
      }),
    ).toEqual({ kind: 'service-unavailable', status: 503 });
    expect(normalizeCurrentActorFailure({ kind: 'invalid-response' })).toEqual({
      kind: 'invalid-response',
    });
  });

  it('recognizes only the explicit RTK cancellation fingerprint', () => {
    expect(
      normalizeCurrentActorFailure({ name: 'AbortError', message: 'Aborted' }),
    ).toEqual({ kind: 'request-cancelled' });
    expect(normalizeCurrentActorFailure(new Error('Aborted'))).toEqual({
      kind: 'unexpected-defect',
    });
    expect(
      normalizeCurrentActorFailure({ name: 'AbortError', message: 'defect' }),
    ).toEqual({ kind: 'unexpected-defect' });
    expect(
      normalizeCurrentActorFailure(new DOMException('Aborted', 'AbortError')),
    ).toEqual({ kind: 'unexpected-defect' });
    expect(
      normalizeCurrentActorFailure({
        name: 'AbortError',
        message: 'Aborted',
        stack: 'private',
      }),
    ).toEqual({ kind: 'unexpected-defect' });
  });

  it('reads a status once and contains throwing accessors', () => {
    let statusReads = 0;
    const failure = {
      kind: 'service-unavailable',
      get status() {
        statusReads += 1;
        return statusReads === 1 ? 503 : 'private diagnostic';
      },
    };
    expect(normalizeCurrentActorFailure(failure)).toEqual({
      kind: 'service-unavailable',
      status: 503,
    });
    expect(statusReads).toBe(1);
    expect(
      normalizeCurrentActorFailure({
        get kind() {
          throw new Error('private');
        },
      }),
    ).toEqual({ kind: 'unexpected-defect' });
  });

  it('requires the cancellation fingerprint fields to be enumerable', () => {
    const failure = Object.defineProperties(
      { extraA: 1, extraB: 2 },
      {
        name: { value: 'AbortError' },
        message: { value: 'Aborted' },
      },
    );
    expect(normalizeCurrentActorFailure(failure)).toEqual({
      kind: 'unexpected-defect',
    });
  });
});
