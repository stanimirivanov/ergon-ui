import { describe, expect, it } from 'vitest';
import { hasConsistentFollowUpPriority, type FollowUpPriority } from '../src';

describe('independent priority default meaning', () => {
  it.each(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const)(
    'permits explicit %s assignments and only implicit NORMAL',
    (priority: FollowUpPriority) => {
      expect(
        hasConsistentFollowUpPriority({ priority, priorityRevision: 0 }),
      ).toBe(priority === 'NORMAL');
      expect(
        hasConsistentFollowUpPriority({ priority, priorityRevision: 1 }),
      ).toBe(true);
    },
  );
});
