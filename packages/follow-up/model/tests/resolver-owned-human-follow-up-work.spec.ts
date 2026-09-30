import { describe, expect, it } from 'vitest';

import {
  isResolverOwnedHumanFollowUpWork,
  type ResolverOwnedHumanFollowUpWork,
} from '../src';

const pairedWork: ResolverOwnedHumanFollowUpWork = {
  workItem: {
    workItemId: 'work-1',
    caseId: 'case-1',
    runId: 'run-1',
    escalationEventId: 'event-1',
    reason: 'RETRY_ATTEMPT_LIMIT_REACHED',
    queueKey: 'access-restoration',
    status: 'OPEN',
    openedAt: '2026-09-21T09:30:00Z',
    recordedAt: '2026-09-21T09:30:01Z',
  },
  claim: {
    claimId: 'claim-1',
    workItemId: 'work-1',
    claimedAt: '2026-09-22T10:15:00Z',
    recordedAt: '2026-09-22T10:15:01Z',
  },
};

describe('resolver-owned follow-up refinement', () => {
  it('accepts a claim paired with its work item', () => {
    expect(isResolverOwnedHumanFollowUpWork(pairedWork)).toBe(true);
  });

  it('rejects a claim for a different work item', () => {
    const mismatched = {
      ...pairedWork,
      claim: { ...pairedWork.claim, workItemId: 'work-2' },
    };

    expect(isResolverOwnedHumanFollowUpWork(mismatched)).toBe(false);
  });
});
