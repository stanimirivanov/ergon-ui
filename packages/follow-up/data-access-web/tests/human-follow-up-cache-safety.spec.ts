import { configureStore, type Middleware } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type HumanFollowUpCacheDependencies,
  type HumanFollowUpClaimCommand,
  type HumanFollowUpReleaseCommand,
  createHumanFollowUpBffAdapter,
  humanFollowUpApi,
} from '../src';
import {
  CASE_ID,
  COMMAND_ID,
  RUN_ID,
  TENANT_ID,
  WORK_ITEM_ID,
  jsonResponse,
  validCaseSummary,
  validClaim,
  validOwnedPage,
  validPage,
  validRelease,
} from './follow-up-fixtures';

const PRIVATE_SENTINEL = 'private-case-payload-must-not-escape';
const operationCases = [
  { name: 'inbox', dependency: 'listOpenHumanFollowUps', method: 'listOpen' },
  { name: 'owned', dependency: 'listOwnedHumanFollowUps', method: 'listOwned' },
  {
    name: 'summary',
    dependency: 'getOwnedFollowUpCaseSummary',
    method: 'getOwnedCaseSummary',
  },
  { name: 'claim', dependency: 'claimHumanFollowUp', method: 'claim' },
  { name: 'release', dependency: 'releaseHumanFollowUp', method: 'release' },
] as const;
type Operation = (typeof operationCases)[number];
type CacheStore = ReturnType<typeof createCacheStore>;
interface CacheRequest {
  abort(): void;
  unwrap(): Promise<unknown>;
}

const claimCommand: HumanFollowUpClaimCommand = {
  tenantId: TENANT_ID,
  workItemId: WORK_ITEM_ID,
  commandId: COMMAND_ID,
  expectedOwnershipRevision: 0,
};
const releaseCommand: HumanFollowUpReleaseCommand = {
  tenantId: TENANT_ID,
  workItemId: WORK_ITEM_ID,
  claimId: validClaim().claimId,
  expectedOwnershipRevision: 1,
};

afterEach(() => vi.restoreAllMocks());

describe.each(operationCases)('$name cache boundary', (operation) => {
  it.each(['throw', 'reject'] as const)(
    'contains a client %s before actions, cache, or console can disclose it',
    async (mode) => {
      const cause = new Error(PRIVATE_SENTINEL);
      const invoke = vi.fn(() => {
        if (mode === 'throw') throw cause;
        return Promise.reject(cause);
      });
      const actions: unknown[] = [];
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const consoleWarn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const store = createCacheStore(withOperation(operation, invoke), actions);

      await expect(
        dispatchOperation(store, operation).unwrap(),
      ).rejects.toEqual({
        kind: 'unexpected-defect',
      });

      expect(invoke).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(actions)).not.toContain(PRIVATE_SENTINEL);
      expect(JSON.stringify(store.getState())).not.toContain(PRIVATE_SENTINEL);
      expect(actions).toContainEqual(
        expect.objectContaining({
          payload: { kind: 'unexpected-defect' },
          meta: expect.objectContaining({ rejectedWithValue: true }),
        }),
      );
      expect(consoleError).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
      store.dispatch(humanFollowUpApi.util.resetApiState());
    },
  );

  it('contains a missing dependency binding without a framework exception', async () => {
    const actions: unknown[] = [];
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const store = createCacheStore({}, actions);

    await expect(dispatchOperation(store, operation).unwrap()).rejects.toEqual({
      kind: 'unexpected-defect',
    });
    expect(JSON.stringify(actions)).not.toContain('not configured');
    expect(JSON.stringify(store.getState())).not.toContain('not configured');
    expect(consoleError).not.toHaveBeenCalled();
    store.dispatch(humanFollowUpApi.util.resetApiState());
  });

  it.each([
    { kind: 'forbidden' },
    { kind: 'transport' },
    { kind: 'request-cancelled' },
    { kind: 'service-unavailable', status: 503 },
  ] as const)(
    'preserves expected $kind without additional payloads',
    async (failure) => {
      const store = createCacheStore(
        withOperation(operation, async () => ({
          ok: false,
          error: { ...failure, message: PRIVATE_SENTINEL },
        })),
      );

      await expect(
        dispatchOperation(store, operation).unwrap(),
      ).rejects.toEqual(failure);
      expect(JSON.stringify(store.getState())).not.toContain(PRIVATE_SENTINEL);
      store.dispatch(humanFollowUpApi.util.resetApiState());
    },
  );

  it('does not label a thrown AbortError as typed client cancellation', async () => {
    // The fingerprint is meaningful only when RTK creates it, not when thrown.
    const cause = new Error('Aborted');
    cause.name = 'AbortError';
    const store = createCacheStore(
      withOperation(operation, () => {
        throw cause;
      }),
    );

    await expect(dispatchOperation(store, operation).unwrap()).rejects.toEqual({
      kind: 'unexpected-defect',
    });
    store.dispatch(humanFollowUpApi.util.resetApiState());
  });

  it('contains a late client defect when framework cancellation wins', async () => {
    const actions: unknown[] = [];
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    let rejectClient: (cause: unknown) => void = () => undefined;
    let markClientSettled: () => void = () => undefined;
    const clientSettled = new Promise<void>((resolve) => {
      markClientSettled = resolve;
    });
    const pendingClient = new Promise<never>((_resolve, reject) => {
      rejectClient = reject;
    });
    const invoke = vi.fn(async (_query: unknown, signal: unknown) => {
      expect(signal).toBeInstanceOf(AbortSignal);
      try {
        return await pendingClient;
      } finally {
        markClientSettled();
      }
    });
    const store = createCacheStore(withOperation(operation, invoke), actions);
    const request = dispatchOperation(store, operation);

    request.abort();
    rejectClient(new Error(PRIVATE_SENTINEL));
    await expect(request.unwrap()).rejects.toEqual({
      name: 'AbortError',
      message: 'Aborted',
    });
    await clientSettled;
    await Promise.resolve();
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(actions)).not.toContain(PRIVATE_SENTINEL);
    expect(JSON.stringify(store.getState())).not.toContain(PRIVATE_SENTINEL);
    expect(consoleError).not.toHaveBeenCalled();
    store.dispatch(humanFollowUpApi.util.resetApiState());
  });

  it.each([
    { kind: 'new-kind' },
    { kind: 'service-unavailable', status: '503' },
  ])('contains malformed expected failures %#', async (failure) => {
    const store = createCacheStore(
      withOperation(operation, async () => ({
        ok: false,
        error: { ...failure, cause: PRIVATE_SENTINEL },
      })),
    );
    await expect(dispatchOperation(store, operation).unwrap()).rejects.toEqual({
      kind: 'unexpected-defect',
    });
    expect(JSON.stringify(store.getState())).not.toContain(PRIVATE_SENTINEL);
    store.dispatch(humanFollowUpApi.util.resetApiState());
  });

  it('keeps unexpected direct BFF client defects as rejections', async () => {
    const response = new Response('{}');
    Object.defineProperty(response, 'ok', {
      get() {
        throw new Error(PRIVATE_SENTINEL);
      },
    });
    Object.defineProperty(response, 'status', {
      get() {
        throw new Error(PRIVATE_SENTINEL);
      },
    });
    const fetch = vi.fn(async (input: RequestInfo | URL) =>
      input.toString() === '/bff/v1/csrf'
        ? jsonResponse({ headerName: 'X-CSRF-TOKEN', token: 'token-1' })
        : response,
    );
    const adapter = createHumanFollowUpBffAdapter({ fetch });

    await expect(invokeDirectClient(adapter, operation)).rejects.toThrow(
      PRIVATE_SENTINEL,
    );
    expect(fetch).toHaveBeenCalledTimes(
      operation.name === 'claim' || operation.name === 'release' ? 2 : 1,
    );
  });
});

describe('uncertain mutation intent', () => {
  it('allows only caller-triggered claim replay with the original intent', async () => {
    const claim = vi
      .fn<HumanFollowUpCacheDependencies['claimHumanFollowUp']['claim']>()
      .mockRejectedValueOnce(new Error(PRIVATE_SENTINEL))
      .mockResolvedValue({ ok: true, claim: validClaim() });
    const store = createCacheStore({
      ...defaultDependencies(),
      claimHumanFollowUp: { claim },
    });

    await expect(
      store
        .dispatch(
          humanFollowUpApi.endpoints.claimHumanFollowUp.initiate(claimCommand),
        )
        .unwrap(),
    ).rejects.toEqual({ kind: 'unexpected-defect' });
    expect(claim).toHaveBeenCalledTimes(1);
    await expect(
      store
        .dispatch(
          humanFollowUpApi.endpoints.claimHumanFollowUp.initiate(claimCommand),
        )
        .unwrap(),
    ).resolves.toEqual(validClaim());
    expect(claim.mock.calls.map(([command]) => command)).toEqual([
      claimCommand,
      claimCommand,
    ]);
    store.dispatch(humanFollowUpApi.util.resetApiState());
  });

  it('allows only caller-triggered release replay with the exact claim tuple', async () => {
    const release = vi
      .fn<HumanFollowUpCacheDependencies['releaseHumanFollowUp']['release']>()
      .mockRejectedValueOnce(new Error(PRIVATE_SENTINEL))
      .mockResolvedValue({ ok: true, release: validRelease() });
    const store = createCacheStore({
      ...defaultDependencies(),
      releaseHumanFollowUp: { release },
    });

    await expect(
      store
        .dispatch(
          humanFollowUpApi.endpoints.releaseHumanFollowUp.initiate(
            releaseCommand,
          ),
        )
        .unwrap(),
    ).rejects.toEqual({ kind: 'unexpected-defect' });
    expect(release).toHaveBeenCalledTimes(1);
    await expect(
      store
        .dispatch(
          humanFollowUpApi.endpoints.releaseHumanFollowUp.initiate(
            releaseCommand,
          ),
        )
        .unwrap(),
    ).resolves.toEqual(validRelease());
    expect(release.mock.calls.map(([command]) => command)).toEqual([
      releaseCommand,
      releaseCommand,
    ]);
    store.dispatch(humanFollowUpApi.util.resetApiState());
  });
});

function withOperation(
  operation: Operation,
  invoke: (...args: unknown[]) => unknown,
): unknown {
  return {
    ...defaultDependencies(),
    [operation.dependency]: { [operation.method]: invoke },
  };
}

function dispatchOperation(
  store: CacheStore,
  operation: Operation,
): CacheRequest {
  switch (operation.name) {
    case 'inbox':
      return store.dispatch(
        humanFollowUpApi.endpoints.humanFollowUps.initiate({
          tenantId: TENANT_ID,
          limit: 25,
        }),
      );
    case 'owned':
      return store.dispatch(
        humanFollowUpApi.endpoints.resolverOwnedHumanFollowUps.initiate({
          tenantId: TENANT_ID,
          limit: 25,
        }),
      );
    case 'summary':
      return store.dispatch(
        humanFollowUpApi.endpoints.resolverFollowUpCaseSummary.initiate({
          tenantId: TENANT_ID,
          workItemId: WORK_ITEM_ID,
          caseId: CASE_ID,
          runId: RUN_ID,
        }),
      );
    case 'claim':
      return store.dispatch(
        humanFollowUpApi.endpoints.claimHumanFollowUp.initiate(claimCommand),
      );
    case 'release':
      return store.dispatch(
        humanFollowUpApi.endpoints.releaseHumanFollowUp.initiate(
          releaseCommand,
        ),
      );
  }
}

function defaultDependencies(): HumanFollowUpCacheDependencies {
  return {
    listOpenHumanFollowUps: {
      async listOpen() {
        return { ok: true, page: validPage() };
      },
    },
    listOwnedHumanFollowUps: {
      async listOwned() {
        return { ok: true, page: validOwnedPage() };
      },
    },
    getOwnedFollowUpCaseSummary: {
      async getOwnedCaseSummary() {
        return { ok: true, summary: validCaseSummary() };
      },
    },
    claimHumanFollowUp: {
      async claim() {
        return { ok: true, claim: validClaim() };
      },
    },
    releaseHumanFollowUp: {
      async release() {
        return { ok: true, release: validRelease() };
      },
    },
  };
}

function invokeDirectClient(
  adapter: ReturnType<typeof createHumanFollowUpBffAdapter>,
  operation: Operation,
): Promise<unknown> {
  const signal = new AbortController().signal;
  switch (operation.name) {
    case 'inbox':
      return adapter.listOpen({ tenantId: TENANT_ID, limit: 25 }, signal);
    case 'owned':
      return adapter.listOwned({ tenantId: TENANT_ID, limit: 25 }, signal);
    case 'summary':
      return adapter.getOwnedCaseSummary(
        {
          tenantId: TENANT_ID,
          workItemId: WORK_ITEM_ID,
          caseId: CASE_ID,
          runId: RUN_ID,
        },
        signal,
      );
    case 'claim':
      return adapter.claim(claimCommand, signal);
    case 'release':
      return adapter.release(releaseCommand, signal);
  }
}

function createCacheStore(extra: unknown, actions: unknown[] = []) {
  const recordActions: Middleware = () => (next) => (action) => {
    actions.push(action);
    return next(action);
  };
  return configureStore({
    reducer: { [humanFollowUpApi.reducerPath]: humanFollowUpApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: extra } }).concat(
        recordActions,
        humanFollowUpApi.middleware,
      ),
  });
}
