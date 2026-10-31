import { expect, it } from 'vitest';
import { coherentBudget, type EvaluationBudgetDimension } from '../src';
it.each([
  [{ limit: 0, measured: 0, status: 'PASS', reason: null }, true],
  [
    { limit: 0, measured: null, status: 'UNKNOWN', reason: 'MISSING_USAGE' },
    true,
  ],
  [
    { limit: 0, measured: null, status: 'PASS', reason: 'MISSING_USAGE' },
    false,
  ],
  [
    {
      limit: null,
      measured: null,
      status: 'NOT_CONFIGURED',
      reason: 'OVERFLOW',
    },
    true,
  ],
  [{ limit: 5, measured: 6, status: 'PASS', reason: null }, false],
  [{ limit: 5, measured: 6, status: 'FAIL', reason: null }, true],
  [{ limit: 5, measured: null, status: 'ERROR', reason: 'OVERFLOW' }, true],
] as const)(
  'preserves unknown, zero and independent configuration (%j)',
  (value, expected) => {
    expect(coherentBudget(value as EvaluationBudgetDimension)).toBe(expected);
  },
);
