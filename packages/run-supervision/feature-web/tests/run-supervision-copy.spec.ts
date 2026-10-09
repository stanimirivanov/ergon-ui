import { describe, expect, it } from 'vitest';

import {
  canOfferReadRetry,
  failureDescription,
} from '../src/run-supervision-copy';

describe('assigned read recovery copy', () => {
  it.each([
    'authentication-unavailable',
    'actor-not-registered',
    'identity-rejected',
    'forbidden',
    'invalid-page',
  ])('does not offer repeated reads for the permanent %s condition', (kind) => {
    expect(canOfferReadRetry({ kind })).toBe(false);
  });

  it('separates a disabled authentication boundary from a temporary service outage', () => {
    expect(
      failureDescription({ kind: 'authentication-unavailable' }),
    ).toContain('operator');
    expect(
      canOfferReadRetry({ kind: 'service-unavailable', status: 503 }),
    ).toBe(true);
    expect(canOfferReadRetry({ kind: 'not-found' })).toBe(true);
  });
});
