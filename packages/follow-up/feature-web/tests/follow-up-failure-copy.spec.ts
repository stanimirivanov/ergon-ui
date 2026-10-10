import {
  normalizeHumanFollowUpClaimFailure,
  normalizeHumanFollowUpFailure,
  normalizeHumanFollowUpReleaseFailure,
  normalizeResolverFollowUpCaseSummaryFailure,
} from '@ergon/follow-up-data-access-web';
import { describe, expect, it } from 'vitest';

import {
  claimFailureCopy,
  inboxFailureCopy,
} from '../src/human-follow-up-inbox-copy';
import { caseSummaryFailureCopy } from '../src/resolver-follow-up-case-summary-copy';
import { ownedWorkFailureCopy } from '../src/resolver-owned-human-follow-ups-copy';
import { releaseFailureCopy } from '../src/resolver-owned-release-copy';

describe('safe follow-up failure copy', () => {
  it('distinguishes unknown cache defects from malformed responses in every read surface', () => {
    const error = { message: 'private sentinel', stack: 'secret stack' };
    const read = normalizeHumanFollowUpFailure(error);
    const summary = normalizeResolverFollowUpCaseSummaryFailure(error);
    for (const [copy, malformed] of [
      [inboxFailureCopy(read), inboxFailureCopy({ kind: 'invalid-response' })],
      [
        ownedWorkFailureCopy(read),
        ownedWorkFailureCopy({ kind: 'invalid-response' }),
      ],
      [
        caseSummaryFailureCopy(summary),
        caseSummaryFailureCopy({ kind: 'invalid-response' }),
      ],
    ]) {
      expect(copy?.description).toContain('unexpected workbench problem');
      expect(copy?.description).not.toContain('sentinel');
      expect(copy).not.toEqual(malformed);
    }
  });

  it('keeps claim and release uncertainty explicit with same-intent replay', () => {
    const error = new Error('private sentinel');
    const claim = claimFailureCopy(normalizeHumanFollowUpClaimFailure(error));
    const release = releaseFailureCopy(
      normalizeHumanFollowUpReleaseFailure(error),
    );
    expect(claim.canRetry).toBe(true);
    expect(claim.description).toContain(
      'Ownership may already have been recorded',
    );
    expect(claim.description).toContain('same command');
    expect(release.canRetry).toBe(true);
    expect(release.description).toContain(
      'release may already have been recorded',
    );
    expect(release.description).toContain('same release');
    expect(JSON.stringify([claim, release])).not.toContain('sentinel');
  });
});
