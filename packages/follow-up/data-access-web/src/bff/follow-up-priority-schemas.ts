import { Schema } from 'effect';

export const followUpPriority = Schema.Literal(
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT',
);
/** Reject precision loss at the browser boundary rather than guessing a BIGINT fence. */
export const priorityRevision = Schema.Int.pipe(
  Schema.between(0, Number.MAX_SAFE_INTEGER),
);
