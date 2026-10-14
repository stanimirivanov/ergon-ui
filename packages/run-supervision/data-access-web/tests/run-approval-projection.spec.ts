import { describe, expect, it } from 'vitest';
import { decodeAssignedRunConsole } from '../src/bff/run-supervision-schemas';
import {
  RUN_ID,
  TENANT_ID,
  OTHER_RUN_ID,
  validConsole,
} from './run-supervision-fixtures';
const query = { tenantId: TENANT_ID, runId: RUN_ID };
const review = {
  status: 'PENDING',
  observedAt: '2026-10-14T12:00:00Z',
  canDecide: true,
  request: {
    requestId: OTHER_RUN_ID,
    authority: 'RESOLVER',
    requestedAt: '2026-10-14T11:55:00Z',
    expiresAt: '2026-10-14T12:10:00Z',
    recordedAt: '2026-10-14T11:55:01Z',
  },
  decision: null,
};
const run = {
  ...validConsole(),
  supervisionRevision: 3,
  handoverSupported: false,
  approvalReview: review,
};
describe('approval review projection', () => {
  it('preserves older omission, validates current review, and strips private attribution', () => {
    expect(
      decodeAssignedRunConsole(validConsole(), query)?.approvalReview,
    ).toBeUndefined();
    expect(
      decodeAssignedRunConsole(
        { ...run, approvalReview: { ...review, actorId: 'PRIVATE' } },
        query,
      )?.approvalReview,
    ).toEqual(review);
  });
  it.each([
    { ...review, request: null },
    { ...review, request: { ...review.request, authority: 'REQUESTER' } },
    { ...review, observedAt: review.request.expiresAt },
    { ...review, status: 'EXPIRED' },
    { ...review, status: 'DECIDED' },
    {
      ...review,
      request: { ...review.request, expiresAt: review.request.requestedAt },
    },
    null,
  ])(
    'rejects contradictory or null review without partial disclosure',
    (approvalReview) => {
      expect(
        decodeAssignedRunConsole({ ...run, approvalReview }, query),
      ).toBeUndefined();
    },
  );
  it('keeps exclusive expiry, unsupported decision controls and historical decisions distinct', () => {
    const expired = {
      ...review,
      status: 'EXPIRED',
      canDecide: false,
      observedAt: review.request.expiresAt,
    };
    expect(
      decodeAssignedRunConsole({ ...run, approvalReview: expired }, query)
        ?.approvalReview,
    ).toEqual(expired);
    expect(
      decodeAssignedRunConsole({ ...run, state: 'VERIFYING' }, query),
    ).toBeUndefined();
    const decided = {
      ...expired,
      status: 'DECIDED',
      decision: {
        decisionId: RUN_ID,
        outcome: 'REJECTED',
        decidedAt: review.observedAt,
        recordedAt: review.observedAt,
      },
    };
    expect(
      decodeAssignedRunConsole({ ...run, approvalReview: decided }, query)
        ?.approvalReview,
    ).toEqual(decided);
  });
  it('allows NOT_REQUESTED only for a required prerequisite and NOT_REQUIRED only for NONE', () => {
    const empty = {
      status: 'NOT_REQUESTED',
      observedAt: review.observedAt,
      canDecide: false,
      request: null,
      decision: null,
    };
    expect(
      decodeAssignedRunConsole({ ...run, approvalReview: empty }, query)
        ?.approvalReview,
    ).toEqual(empty);
    expect(
      decodeAssignedRunConsole(
        { ...run, approvalReview: { ...empty, status: 'NOT_REQUIRED' } },
        query,
      ),
    ).toBeUndefined();
  });
});
