import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';
import {
  createHumanFollowUpBffAdapter,
  followUpPriorityApi,
  humanFollowUpApi,
  normalizeFollowUpPriorityFailure,
  type FollowUpPriorityCommand,
} from '../src';
import {
  TENANT_ID,
  WORK_ITEM_ID,
  validPage,
  validOwnedPage,
  validCaseSummary,
} from './follow-up-fixtures';

const command: FollowUpPriorityCommand = {
  tenantId: TENANT_ID,
  workItemId: WORK_ITEM_ID,
  commandId: '66666666-6666-4666-8666-666666666666',
  claimId: '77777777-7777-4777-8777-777777777777',
  expectedOwnershipRevision: 1,
  expectedPriorityRevision: 0,
  priority: 'HIGH',
};
const receipt = {
  commandId: command.commandId,
  workItemId: WORK_ITEM_ID,
  claimId: command.claimId,
  expectedOwnershipRevision: 1,
  expectedPriorityRevision: 0,
  priorityRevision: 1,
  priority: 'HIGH',
  assignedAt: '2026-10-24T12:00:00Z',
  recordedAt: '2026-10-24T12:00:01Z',
};
const csrf = { headerName: 'X-CSRF-TOKEN', token: 'synthetic-token' };
const signal = () => new AbortController().signal;

describe('revision-fenced priority protocol', () => {
  it.each([200, 201])(
    'validates exact status %s acknowledgement and emits only approved intent',
    async (status) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(Response.json(csrf))
        .mockResolvedValueOnce(
          Response.json({ ...receipt, actor: 'PRIVATE' }, { status }),
        );
      const client = createHumanFollowUpBffAdapter({ fetch });
      expect(await client.assignPriority(command, signal())).toEqual({
        ok: true,
        assignment: receipt,
      });
      const [url, init] = fetch.mock.calls[1] ?? [];
      expect(url).toBe(
        `/bff/v1/tenants/${TENANT_ID}/human-follow-ups/${WORK_ITEM_ID}/priority-assignments`,
      );
      expect(init).toMatchObject({
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'X-CSRF-TOKEN': csrf.token },
      });
      expect(JSON.parse(String(init?.body))).toEqual({
        commandId: command.commandId,
        claimId: command.claimId,
        expectedOwnershipRevision: 1,
        expectedPriorityRevision: 0,
        priority: 'HIGH',
      });
    },
  );
  it.each([
    { priority: 'URGENT' },
    { priorityRevision: 2 },
    { expectedPriorityRevision: 1 },
    { commandId: command.claimId },
    { workItemId: command.commandId },
    { claimId: command.commandId },
    { expectedOwnershipRevision: 3 },
    { assignedAt: 'invalid' },
    { priorityRevision: Number.MAX_SAFE_INTEGER + 1 },
  ])('rejects contradictory receipt %j', async (patch) => {
    const client = createHumanFollowUpBffAdapter({
      fetch: vi
        .fn()
        .mockResolvedValueOnce(Response.json(csrf))
        .mockResolvedValueOnce(Response.json({ ...receipt, ...patch })),
    });
    expect(await client.assignPriority(command, signal())).toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });
  it.each([
    { expectedPriorityRevision: -1 },
    { expectedPriorityRevision: Number.MAX_SAFE_INTEGER },
    { expectedOwnershipRevision: 2 },
    { priority: 'CRITICAL' },
    { commandId: 'invalid' },
  ])('rejects unsafe intent without a POST %j', async (patch) => {
    const fetch = vi.fn().mockResolvedValue(Response.json(csrf));
    const client = createHumanFollowUpBffAdapter({ fetch });
    expect(
      await client.assignPriority(
        { ...command, ...patch } as FollowUpPriorityCommand,
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind: 'invalid-priority' } });
    expect(fetch.mock.calls).toHaveLength(1);
  });
  it.each([
    [404, 'human-follow-up-priority-not-found', 'not-found'],
    [409, 'human-follow-up-priority-conflict', 'priority-conflict'],
    [400, 'invalid-human-follow-up-priority', 'invalid-priority'],
    [503, 'human-follow-up-priority-unavailable', 'priority-unavailable'],
  ] as const)(
    'maps %s without exposing problem details',
    async (status, problem, kind) => {
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(Response.json(csrf))
        .mockResolvedValueOnce(
          Response.json(
            { type: `urn:ergon:problem:${problem}`, detail: 'PRIVATE' },
            { status },
          ),
        );
      expect(
        await createHumanFollowUpBffAdapter({ fetch }).assignPriority(
          command,
          signal(),
        ),
      ).toEqual({ ok: false, error: { kind } });
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );
  it('shares CSRF and never automatically retries an uncertain POST', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(csrf))
      .mockRejectedValueOnce(new Error('PRIVATE'))
      .mockResolvedValueOnce(Response.json(receipt));
    const client = createHumanFollowUpBffAdapter({ fetch });
    expect(await client.assignPriority(command, signal())).toEqual({
      ok: false,
      error: { kind: 'transport' },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(await client.assignPriority(command, signal())).toEqual({
      ok: true,
      assignment: receipt,
    });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[1]?.[1]?.body).toBe(fetch.mock.calls[2]?.[1]?.body);
  });
  it('contains client defects at the cache boundary and safely normalizes unknown failures', async () => {
    const store = configureStore({
      reducer: { [humanFollowUpApi.reducerPath]: humanFollowUpApi.reducer },
      middleware: (getDefault) =>
        getDefault({
          thunk: {
            extraArgument: {
              followUpPriority: {
                assignPriority: async () => {
                  throw new Error('PRIVATE');
                },
              },
            },
          },
        }).concat(humanFollowUpApi.middleware),
    });
    try {
      const result = await store.dispatch(
        followUpPriorityApi.endpoints.assignFollowUpPriority.initiate(command),
      );
      expect(result).toEqual({ error: { kind: 'unexpected-defect' } });
      expect(
        normalizeFollowUpPriorityFailure({
          kind: 'priority-conflict',
          cause: 'PRIVATE',
        }),
      ).toEqual({ kind: 'priority-conflict' });
      expect(normalizeFollowUpPriorityFailure(new Error('PRIVATE'))).toEqual({
        kind: 'unexpected-defect',
      });
    } finally {
      store.dispatch(humanFollowUpApi.util.resetApiState());
    }
  });
});

describe('required current priority observations', () => {
  it.each([
    { priority: 'HIGH', priorityRevision: 0 },
    { priority: 'HIGH', priorityRevision: -1 },
    { priority: 'OTHER', priorityRevision: 1 },
    { priority: undefined, priorityRevision: undefined },
    { priority: 'NORMAL', priorityRevision: Number.MAX_SAFE_INTEGER + 1 },
  ])(
    'rejects inconsistent/unsupported pairs on all three reads %j',
    async (patch) => {
      const page = validPage(),
        owned = validOwnedPage(),
        summary = validCaseSummary();
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({ ...page, items: [{ ...page.items[0], ...patch }] }),
        )
        .mockResolvedValueOnce(
          Response.json({
            ...owned,
            items: owned.items.map((item) => ({
              ...item,
              workItem: { ...item.workItem, ...patch },
            })),
          }),
        )
        .mockResolvedValueOnce(
          Response.json({
            ...summary,
            followUp: { ...summary.followUp, ...patch },
          }),
        );
      const client = createHumanFollowUpBffAdapter({ fetch });
      expect(
        await client.listOpen({ tenantId: TENANT_ID, limit: 25 }, signal()),
      ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
      expect(
        await client.listOwned({ tenantId: TENANT_ID, limit: 25 }, signal()),
      ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
      expect(
        await client.getOwnedCaseSummary(
          {
            tenantId: TENANT_ID,
            workItemId: WORK_ITEM_ID,
            caseId: summary.case.caseId,
            runId: summary.resolutionRun.runId,
          },
          signal(),
        ),
      ).toEqual({ ok: false, error: { kind: 'invalid-response' } });
    },
  );
});
