import { configureStore, type Middleware } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';

import {
  type CurrentActorCacheDependencies,
  type CurrentActorClient,
  currentActorApi,
} from '../src';

const TENANT_ID = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';
const OTHER_TENANT_ID = '1f262f80-c0c6-4c31-9fa0-5e701b8636ee';
const ACTOR_ID = '741bcdba-9521-4e96-bfcc-7a5a2830eec8';

describe('current actor cache adapter', () => {
  it('deduplicates one tenant while isolating a different tenant key', async () => {
    const resolve = vi
      .fn<CurrentActorClient['resolve']>()
      .mockImplementation(async (tenantId) => ({
        ok: true,
        actor: {
          actorId: ACTOR_ID,
          identityProvider: `provider-for-${tenantId}`,
          registeredAt: '2026-09-20T12:34:56Z',
          recordedAt: '2026-09-20T12:34:57Z',
        },
      }));
    const store = createSessionCacheStore({
      resolveCurrentActor: { resolve },
    });

    const first = store.dispatch(
      currentActorApi.endpoints.currentActor.initiate({ tenantId: TENANT_ID }),
    );
    const duplicate = store.dispatch(
      currentActorApi.endpoints.currentActor.initiate({ tenantId: TENANT_ID }),
    );
    const otherTenant = store.dispatch(
      currentActorApi.endpoints.currentActor.initiate({
        tenantId: OTHER_TENANT_ID,
      }),
    );

    await expect(first.unwrap()).resolves.toMatchObject({ actorId: ACTOR_ID });
    await expect(duplicate.unwrap()).resolves.toMatchObject({
      actorId: ACTOR_ID,
    });
    await expect(otherTenant.unwrap()).resolves.toMatchObject({
      actorId: ACTOR_ID,
    });
    expect(resolve).toHaveBeenCalledTimes(2);
    expect(resolve.mock.calls.map(([tenantId]) => tenantId)).toEqual([
      TENANT_ID,
      OTHER_TENANT_ID,
    ]);

    first.unsubscribe();
    duplicate.unsubscribe();
    otherTenant.unsubscribe();
  });

  it('places typed data-access failures in the RTK Query error channel', async () => {
    const store = createSessionCacheStore({
      resolveCurrentActor: {
        async resolve() {
          return { ok: false, error: { kind: 'forbidden' } };
        },
      },
    });

    const request = store.dispatch(
      currentActorApi.endpoints.currentActor.initiate({ tenantId: TENANT_ID }),
    );

    await expect(request.unwrap()).rejects.toEqual({ kind: 'forbidden' });
    request.unsubscribe();
  });

  it('passes RTK Query cancellation to the current-actor client', async () => {
    let observedSignal: AbortSignal | undefined;
    let notifyStarted: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
      notifyStarted = resolve;
    });
    const store = createSessionCacheStore({
      resolveCurrentActor: {
        resolve(_tenantId, signal) {
          observedSignal = signal;
          notifyStarted();
          return new Promise((resolve) => {
            signal.addEventListener('abort', () =>
              resolve({
                ok: false,
                error: { kind: 'request-cancelled' },
              }),
            );
          });
        },
      },
    });
    const request = store.dispatch(
      currentActorApi.endpoints.currentActor.initiate({ tenantId: TENANT_ID }),
    );

    await started;
    request.abort();
    await request;

    expect(observedSignal?.aborted).toBe(true);
    request.unsubscribe();
  });

  it.each(['throw', 'reject', 'missing-binding'] as const)(
    'contains %s before serialization or automatic diagnostic logging',
    async (mode) => {
      const sentinel = 'PRIVATE-SESSION-DEFECT';
      const actions: unknown[] = [];
      const errorLog = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const warningLog = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const failure = new Error(sentinel, { cause: new Error(sentinel) });
      const store = createSessionCacheStore(
        mode === 'missing-binding'
          ? {}
          : {
              resolveCurrentActor: {
                resolve() {
                  if (mode === 'throw') throw failure;
                  return Promise.reject(failure);
                },
              },
            },
        actions,
      );
      try {
        const request = store.dispatch(
          currentActorApi.endpoints.currentActor.initiate({
            tenantId: TENANT_ID,
          }),
        );
        await expect(request.unwrap()).rejects.toEqual({
          kind: 'unexpected-defect',
        });
        const cached = currentActorApi.endpoints.currentActor.select({
          tenantId: TENANT_ID,
        })(store.getState());
        expect(cached.error).toEqual({ kind: 'unexpected-defect' });
        expect(JSON.stringify(store.getState())).not.toContain(sentinel);
        expect(JSON.stringify(actions)).not.toContain(sentinel);
        expect(errorLog).not.toHaveBeenCalled();
        expect(warningLog).not.toHaveBeenCalled();
        request.unsubscribe();
      } finally {
        store.dispatch(currentActorApi.util.resetApiState());
        errorLog.mockRestore();
        warningLog.mockRestore();
      }
    },
  );

  it('drops diagnostic extras from expected client failures', async () => {
    const store = createSessionCacheStore({
      resolveCurrentActor: {
        async resolve() {
          return {
            ok: false,
            error: { kind: 'forbidden', message: 'PRIVATE-SESSION-DETAIL' },
          };
        },
      },
    });
    const request = store.dispatch(
      currentActorApi.endpoints.currentActor.initiate({ tenantId: TENANT_ID }),
    );
    try {
      await expect(request.unwrap()).rejects.toEqual({ kind: 'forbidden' });
      expect(JSON.stringify(store.getState())).not.toContain(
        'PRIVATE-SESSION-DETAIL',
      );
    } finally {
      request.unsubscribe();
      store.dispatch(currentActorApi.util.resetApiState());
    }
  });

  it('does not turn a client defect into cancellation based only on an aborted flag', async () => {
    const store = createSessionCacheStore({
      resolveCurrentActor: {
        resolve(_tenantId, signal) {
          Object.defineProperty(signal, 'aborted', { value: true });
          throw new DOMException('Aborted', 'AbortError');
        },
      },
    });
    const request = store.dispatch(
      currentActorApi.endpoints.currentActor.initiate({ tenantId: TENANT_ID }),
    );
    try {
      await expect(request.unwrap()).rejects.toEqual({
        kind: 'unexpected-defect',
      });
    } finally {
      request.unsubscribe();
      store.dispatch(currentActorApi.util.resetApiState());
    }
  });
});

function createSessionCacheStore(
  dependencies: CurrentActorCacheDependencies | Record<string, never>,
  actions: unknown[] = [],
) {
  const captureActions: Middleware = () => (next) => (action) => {
    actions.push(action);
    return next(action);
  };
  return configureStore({
    reducer: {
      [currentActorApi.reducerPath]: currentActorApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: dependencies },
      }).concat(currentActorApi.middleware, captureActions),
  });
}
