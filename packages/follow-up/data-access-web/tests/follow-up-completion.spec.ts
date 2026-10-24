import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createHumanFollowUpBffAdapter,
  followUpCompletionApi,
  followUpNotesApi,
  humanFollowUpApi,
  type FollowUpCompletionClient,
  type FollowUpCompletionCommand,
} from '../src';
import { TENANT_ID, WORK_ITEM_ID } from './follow-up-fixtures';

const command: FollowUpCompletionCommand = {
  tenantId: TENANT_ID,
  workItemId: WORK_ITEM_ID,
  commandId: '66666666-6666-4666-8666-666666666666',
  claimId: '77777777-7777-4777-8777-777777777777',
  expectedOwnershipRevision: 1,
};
const receipt = {
  commandId: command.commandId,
  workItemId: WORK_ITEM_ID,
  claimId: command.claimId,
  expectedOwnershipRevision: 1,
  completedAt: '2026-10-23T12:00:00Z',
  recordedAt: '2026-10-23T12:00:01Z',
};
const csrf = { headerName: 'X-CSRF-TOKEN', token: 'synthetic-token' };
const signal = () => new AbortController().signal;
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('exact follow-up completion protocol', () => {
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
      expect(await client.complete(command, signal())).toEqual({
        ok: true,
        completion: receipt,
      });
      const [url, init] = fetch.mock.calls[1] ?? [];
      expect(url).toBe(
        `/bff/v1/tenants/${TENANT_ID}/human-follow-ups/${WORK_ITEM_ID}/completions`,
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
      });
    },
  );
  it.each([
    { commandId: command.claimId },
    { workItemId: command.commandId },
    { claimId: command.commandId },
    { expectedOwnershipRevision: 3 },
    { completedAt: 'not-an-instant' },
    { recordedAt: null },
  ])('rejects a contradictory receipt: %j', async (patch) => {
    const client = createHumanFollowUpBffAdapter({
      fetch: vi
        .fn()
        .mockResolvedValueOnce(Response.json(csrf))
        .mockResolvedValueOnce(Response.json({ ...receipt, ...patch })),
    });
    expect(await client.complete(command, signal())).toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });
  it.each([
    [404, 'human-follow-up-completion-not-found', 'not-found'],
    [409, 'human-follow-up-completion-conflict', 'completion-conflict'],
    [400, 'invalid-human-follow-up-completion', 'invalid-completion'],
    [503, 'human-follow-up-completion-unavailable', 'completion-unavailable'],
  ] as const)('maps exact problem %s:%s', async (status, problem, kind) => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(csrf))
      .mockResolvedValueOnce(
        Response.json({ type: `urn:ergon:problem:${problem}` }, { status }),
      );
    expect(
      await createHumanFollowUpBffAdapter({ fetch }).complete(
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
    expect(await client.complete(command, signal())).toEqual({
      ok: false,
      error: { kind: 'transport' },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(await client.complete(command, signal())).toEqual({
      ok: true,
      completion: receipt,
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
    expect(await client.complete(command, signal())).toEqual({
      ok: false,
      error: { kind: 'csrf-rejected' },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(await client.complete(command, signal())).toEqual({
      ok: true,
      completion: receipt,
    });
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it.each([0, 2, Number.MAX_SAFE_INTEGER + 1])(
    'rejects unsafe intent revision %s without POST',
    async (revision) => {
      const fetch = vi.fn().mockResolvedValue(Response.json(csrf));
      expect(
        await createHumanFollowUpBffAdapter({ fetch }).complete(
          {
            ...command,
            expectedOwnershipRevision: revision,
          },
          signal(),
        ),
      ).toEqual({ ok: false, error: { kind: 'invalid-completion' } });
      expect(
        fetch.mock.calls.every(([, init]) => init?.method !== 'POST'),
      ).toBe(true);
    },
  );
  it('accepts the largest safe claimed revision without requiring handover advancement headroom', async () => {
    const expectedOwnershipRevision = Number.MAX_SAFE_INTEGER;
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(csrf))
      .mockResolvedValueOnce(
        Response.json({ ...receipt, expectedOwnershipRevision }),
      );
    expect(
      await createHumanFollowUpBffAdapter({ fetch }).complete(
        { ...command, expectedOwnershipRevision },
        signal(),
      ),
    ).toEqual({
      ok: true,
      completion: { ...receipt, expectedOwnershipRevision },
    });
  });
  it('bounds a held POST and never retries its timeout', async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(csrf))
      .mockImplementationOnce(() => new Promise<Response>(() => undefined));
    const result = createHumanFollowUpBffAdapter({
      fetch,
      requestTimeout: 50,
    }).complete(command, signal());
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
    const result = createHumanFollowUpBffAdapter({ fetch }).complete(
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

describe('completion cache boundary', () => {
  it('contains defects and missing bindings without serialized causes or logs', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const extra of [
      {},
      {
        followUpCompletion: {
          complete: async () => {
            throw new Error('PRIVATE-CAUSE');
          },
        },
      },
    ]) {
      const store = makeStore(extra);
      const result = await store.dispatch(
        followUpCompletionApi.endpoints.completeFollowUp.initiate(command),
      );
      expect(result).toEqual({ error: { kind: 'unexpected-defect' } });
      expect(JSON.stringify(store.getState())).not.toContain('PRIVATE-CAUSE');
      store.dispatch(humanFollowUpApi.util.resetApiState());
    }
    expect(log).not.toHaveBeenCalled();
  });
  it.each(['success', 'conflict', 'uncertain'] as const)(
    'invalidates active owned, shared and notes reads after %s without synthesizing resource rows',
    async (outcome) => {
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
      const complete: FollowUpCompletionClient['complete'] = async () =>
        outcome === 'success'
          ? { ok: true, completion: receipt }
          : {
              ok: false,
              error: {
                kind:
                  outcome === 'conflict' ? 'completion-conflict' : 'transport',
              },
            };
      const store = makeStore({
        followUpCompletion: { complete },
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
        followUpCompletionApi.endpoints.completeFollowUp.initiate(command),
      );
      await vi.waitFor(() => {
        expect(owned).toHaveBeenCalledTimes(2);
        expect(inbox).toHaveBeenCalledTimes(2);
        expect(notes).toHaveBeenCalledTimes(2);
      });
      for (const handle of handles) handle.unsubscribe();
      store.dispatch(humanFollowUpApi.util.resetApiState());
    },
  );
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
