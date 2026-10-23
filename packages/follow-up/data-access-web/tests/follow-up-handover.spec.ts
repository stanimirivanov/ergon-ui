import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createHumanFollowUpBffAdapter,
  followUpHandoverApi,
  followUpNotesApi,
  humanFollowUpApi,
  type FollowUpHandoverClient,
  type FollowUpHandoverCommand,
} from '../src';
import { TENANT_ID, WORK_ITEM_ID } from './follow-up-fixtures';

const command: FollowUpHandoverCommand = {
  tenantId: TENANT_ID,
  workItemId: WORK_ITEM_ID,
  commandId: '66666666-6666-4666-8666-666666666666',
  claimId: '77777777-7777-4777-8777-777777777777',
  recipientActorId: '99999999-9999-4999-8999-999999999999',
  expectedOwnershipRevision: 1,
};
const receipt = {
  commandId: command.commandId,
  workItemId: WORK_ITEM_ID,
  originalClaimId: command.claimId,
  expectedOwnershipRevision: 1,
  recipientActorId: command.recipientActorId,
  successorClaimId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  ownershipRevision: 3,
  handedOverAt: '2026-10-23T12:00:00Z',
  recordedAt: '2026-10-23T12:00:01Z',
};
const csrf = { headerName: 'X-CSRF-TOKEN', token: 'synthetic-token' };
const signal = () => new AbortController().signal;
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('exact follow-up handover protocol', () => {
  it.each([200, 201])(
    'sends only exact intent with shared CSRF and accepts status %s',
    async (status) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(Response.json(csrf))
        .mockResolvedValueOnce(
          Response.json(
            { ...receipt, subject: 'must-not-be-cached' },
            { status },
          ),
        );
      const client = createHumanFollowUpBffAdapter({ fetch });
      expect(await client.handOver(command, signal())).toEqual({
        ok: true,
        handover: receipt,
      });
      const [url, init] = fetch.mock.calls[1] ?? [];
      expect(url).toBe(
        `/bff/v1/tenants/${TENANT_ID}/human-follow-ups/${WORK_ITEM_ID}/handovers`,
      );
      expect(init).toMatchObject({
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'X-CSRF-TOKEN': csrf.token,
          'Content-Type': 'application/json',
        },
      });
      expect(JSON.parse(String(init?.body))).toEqual({
        commandId: command.commandId,
        claimId: command.claimId,
        expectedOwnershipRevision: 1,
        recipientActorId: command.recipientActorId,
      });
    },
  );
  it.each([
    { commandId: command.recipientActorId },
    { workItemId: command.recipientActorId },
    { originalClaimId: command.recipientActorId },
    { expectedOwnershipRevision: 3 },
    { recipientActorId: command.claimId },
    { successorClaimId: command.claimId },
    { ownershipRevision: 2 },
    { ownershipRevision: Number.MAX_SAFE_INTEGER + 1 },
    { handedOverAt: 'not-an-instant' },
    { recordedAt: null },
  ])('rejects a contradictory receipt: %j', async (patch) => {
    const client = createHumanFollowUpBffAdapter({
      fetch: vi
        .fn()
        .mockResolvedValueOnce(Response.json(csrf))
        .mockResolvedValueOnce(Response.json({ ...receipt, ...patch })),
    });
    expect(await client.handOver(command, signal())).toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });
  it.each([
    [404, 'human-follow-up-handover-not-found', 'not-found'],
    [409, 'human-follow-up-handover-conflict', 'handover-conflict'],
    [
      409,
      'human-follow-up-handover-recipient-unavailable',
      'recipient-unavailable',
    ],
    [400, 'invalid-human-follow-up-handover', 'invalid-handover'],
    [503, 'human-follow-up-handover-unavailable', 'handover-unavailable'],
  ] as const)('maps exact problem %s:%s', async (status, problem, kind) => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(csrf))
      .mockResolvedValueOnce(
        Response.json({ type: `urn:ergon:problem:${problem}` }, { status }),
      );
    expect(
      await createHumanFollowUpBffAdapter({ fetch }).handOver(
        command,
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind } });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('never repeats an uncertain POST automatically and replays identical intent explicitly', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(csrf))
      .mockRejectedValueOnce(new Error('private-network-cause'))
      .mockResolvedValueOnce(Response.json(receipt));
    const client = createHumanFollowUpBffAdapter({ fetch });
    expect(await client.handOver(command, signal())).toEqual({
      ok: false,
      error: { kind: 'transport' },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(await client.handOver(command, signal())).toEqual({
      ok: true,
      handover: receipt,
    });
    expect(fetch.mock.calls[1]?.[1]?.body).toBe(fetch.mock.calls[2]?.[1]?.body);
  });
  it('clears rejected CSRF only for an explicit subsequent attempt', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(csrf))
      .mockResolvedValueOnce(
        Response.json(
          { type: 'urn:ergon:problem:invalid-browser-csrf-token' },
          { status: 403 },
        ),
      )
      .mockResolvedValueOnce(Response.json({ ...csrf, token: 'replacement' }))
      .mockResolvedValueOnce(Response.json(receipt));
    const client = createHumanFollowUpBffAdapter({ fetch });
    expect(await client.handOver(command, signal())).toEqual({
      ok: false,
      error: { kind: 'csrf-rejected' },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(await client.handOver(command, signal())).toEqual({
      ok: true,
      handover: receipt,
    });
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it.each([0, 2, Number.MAX_SAFE_INTEGER])(
    'rejects unsafe intent revision %s without POST',
    async (revision) => {
      const fetch = vi.fn().mockResolvedValue(Response.json(csrf));
      expect(
        await createHumanFollowUpBffAdapter({ fetch }).handOver(
          {
            ...command,
            expectedOwnershipRevision: revision,
          },
          signal(),
        ),
      ).toEqual({ ok: false, error: { kind: 'invalid-handover' } });
      expect(
        fetch.mock.calls.every(([, init]) => init?.method !== 'POST'),
      ).toBe(true);
    },
  );
  it('bounds a held POST and never retries its timeout', async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(csrf))
      .mockImplementationOnce(() => new Promise<Response>(() => undefined));
    const result = createHumanFollowUpBffAdapter({
      fetch,
      requestTimeout: 50,
    }).handOver(command, signal());
    await vi.advanceTimersByTimeAsync(60);
    expect(await result).toEqual({ ok: false, error: { kind: 'timeout' } });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('propagates abort to a held POST without exposing its AbortError', async () => {
    const controller = new AbortController();
    let postSignal: AbortSignal | null | undefined;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json(csrf))
      .mockImplementationOnce((_url, init) => {
        postSignal = init?.signal;
        return new Promise<Response>((_resolve, reject) =>
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('private abort details', 'AbortError')),
          ),
        );
      });
    const result = createHumanFollowUpBffAdapter({ fetch }).handOver(
      command,
      controller.signal,
    );
    await vi.waitFor(() => expect(postSignal).toBeDefined());
    controller.abort();
    expect(await result).toEqual({
      ok: false,
      error: { kind: 'request-cancelled' },
    });
    expect(postSignal?.aborted).toBe(true);
  });
});

describe('handover cache boundary', () => {
  it('contains defects and missing bindings without serialized causes or logs', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const extra of [
      {},
      {
        followUpHandover: {
          handOver: async () => {
            throw new Error('PRIVATE-CAUSE');
          },
        },
      },
    ]) {
      const store = makeStore(extra);
      const result = await store.dispatch(
        followUpHandoverApi.endpoints.handOverFollowUp.initiate(command),
      );
      expect(result).toEqual({ error: { kind: 'unexpected-defect' } });
      expect(JSON.stringify(store.getState())).not.toContain('PRIVATE-CAUSE');
      store.dispatch(humanFollowUpApi.util.resetApiState());
    }
    expect(log).not.toHaveBeenCalled();
  });
  it('invalidates active owned, shared and notes reads without synthesizing resource rows', async () => {
    const owned = vi.fn(async () => ({
      ok: true as const,
      page: { items: [], nextCursor: null },
    }));
    const inbox = vi.fn(async () => ({
      ok: true as const,
      page: { items: [], nextCursor: null },
    }));
    const notes = vi.fn(async () => ({
      ok: true as const,
      notes: { items: [], truncated: false },
    }));
    const handOver: FollowUpHandoverClient['handOver'] = async () => ({
      ok: true,
      handover: receipt,
    });
    const store = makeStore({
      followUpHandover: { handOver },
      listOwnedHumanFollowUps: { listOwned: owned },
      listOpenHumanFollowUps: { listOpen: inbox },
      followUpNotes: { listNotes: notes, appendNote: vi.fn() },
    });
    const handles = [
      store.dispatch(
        humanFollowUpApi.endpoints.humanFollowUps.initiate({
          tenantId: TENANT_ID,
          limit: 25,
        }),
      ),
      store.dispatch(
        humanFollowUpApi.endpoints.resolverOwnedHumanFollowUps.initiate({
          tenantId: TENANT_ID,
          limit: 25,
        }),
      ),
      store.dispatch(
        followUpNotesApi.endpoints.followUpNotes.initiate({
          tenantId: TENANT_ID,
          workItemId: WORK_ITEM_ID,
          claimId: command.claimId,
          expectedOwnershipRevision: 1,
        }),
      ),
    ];
    await Promise.all(handles);
    await store.dispatch(
      followUpHandoverApi.endpoints.handOverFollowUp.initiate(command),
    );
    await vi.waitFor(() => {
      expect(owned).toHaveBeenCalledTimes(2);
      expect(inbox).toHaveBeenCalledTimes(2);
      expect(notes).toHaveBeenCalledTimes(2);
    });
    for (const handle of handles) handle.unsubscribe();
    store.dispatch(humanFollowUpApi.util.resetApiState());
  });
});

function makeStore(extra: unknown) {
  return configureStore({
    reducer: { [humanFollowUpApi.reducerPath]: humanFollowUpApi.reducer },
    middleware: (getDefault) =>
      getDefault({ thunk: { extraArgument: extra } }).concat(
        humanFollowUpApi.middleware,
      ),
  });
}
