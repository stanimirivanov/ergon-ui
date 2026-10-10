import { configureStore, type Middleware } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createRunSupervisionClient,
  normalizeRunSupervisionFailure,
  runSupervisionApi,
  type RunSupervisionClient,
  type RunSupervisionFailure,
} from '../src';
import {
  RUN_ID,
  TENANT_ID,
  jsonResponse,
  validConsole,
  validPage,
} from './run-supervision-fixtures';

const SENTINEL = 'PRIVATE-supervision-defect-sentinel';
const listQuery = { tenantId: TENANT_ID };
const consoleQuery = { tenantId: TENANT_ID, runId: RUN_ID };
const unexpectedDefect = { kind: 'unexpected-defect' } as const;

afterEach(() => vi.restoreAllMocks());

describe('assigned-run failure normalization', () => {
  it.each<RunSupervisionFailure>([
    { kind: 'authentication-required' },
    { kind: 'authentication-unavailable' },
    { kind: 'actor-not-registered' },
    { kind: 'identity-rejected' },
    { kind: 'forbidden' },
    { kind: 'not-found' },
    { kind: 'invalid-page' },
    { kind: 'invalid-response' },
    { kind: 'transport' },
    { kind: 'timeout' },
    { kind: 'request-cancelled' },
    unexpectedDefect,
    { kind: 'service-unavailable', status: 503 },
    { kind: 'unexpected-http-status', status: 418 },
  ])(
    'retains the closed failure meaning and strips extra fields: $kind',
    (failure) => {
      const untrusted = {
        ...failure,
        cause: new Error(SENTINEL),
        name: SENTINEL,
        message: SENTINEL,
        stack: SENTINEL,
        body: SENTINEL,
      };
      const normalized = normalizeRunSupervisionFailure(untrusted);
      expect(normalized).toEqual(failure);
      expect(normalized).not.toBe(untrusted);
      expect(JSON.stringify(normalized)).not.toContain(SENTINEL);
    },
  );

  it.each([
    undefined,
    null,
    'transport',
    new Error(SENTINEL),
    { kind: 'new-unknown-failure', body: SENTINEL },
    { kind: 'service-unavailable' },
    { kind: 'service-unavailable', status: '503' },
    { kind: 'service-unavailable', status: 503.5 },
    { kind: 'service-unavailable', status: 99 },
    { kind: 'unexpected-http-status', status: 600 },
    { kind: 'unexpected-http-status', status: Number.NaN },
    { kind: 'unexpected-http-status', status: Number.POSITIVE_INFINITY },
    { name: 'AbortError', message: SENTINEL },
    new DOMException('Aborted', 'AbortError'),
  ])(
    'contains unknown or malformed failures without guessing their cause',
    (error) => {
      expect(normalizeRunSupervisionFailure(error)).toEqual(unexpectedDefect);
    },
  );

  it.each([100, 599])('accepts valid HTTP status boundary %i', (status) => {
    expect(
      normalizeRunSupervisionFailure({
        kind: 'unexpected-http-status',
        status,
      }),
    ).toEqual({ kind: 'unexpected-http-status', status });
  });

  it('contains property-access defects rather than rejecting normalization', () => {
    const error = {
      get kind(): string {
        throw new Error(SENTINEL);
      },
    };
    expect(normalizeRunSupervisionFailure(error)).toEqual(unexpectedDefect);
  });

  it('projects the exact status value validated without rereading an accessor', () => {
    let statusReads = 0;
    const error = {
      kind: 'service-unavailable',
      get status(): number | string {
        statusReads += 1;
        return statusReads === 1 ? 503 : SENTINEL;
      },
    };
    expect(normalizeRunSupervisionFailure(error)).toEqual({
      kind: 'service-unavailable',
      status: 503,
    });
    expect(statusReads).toBe(1);
  });

  it('requires the actual enumerable RTK abort fields rather than only a two-key count', () => {
    const error = { unrelated: true, diagnostic: SENTINEL };
    Object.defineProperties(error, {
      name: { value: 'AbortError', enumerable: false },
      message: { value: 'Aborted', enumerable: false },
    });
    expect(normalizeRunSupervisionFailure(error)).toEqual(unexpectedDefect);
    expect(
      normalizeRunSupervisionFailure({
        name: 'AbortError',
        message: 'Aborted',
      }),
    ).toEqual({ kind: 'request-cancelled' });
  });
});

describe('assigned-run RTK failure boundary', () => {
  it.each(['synchronous throw', 'rejected promise'] as const)(
    'contains a %s from both endpoints before cache, action, or console disclosure',
    async (failureMode) => {
      const cause = new Error(SENTINEL);
      cause.name = SENTINEL;
      cause.stack = SENTINEL;
      const fail = () => {
        if (failureMode === 'synchronous throw') throw cause;
        return Promise.reject(cause);
      };
      const listAssigned = vi.fn<RunSupervisionClient['listAssigned']>(fail);
      const getConsole = vi.fn<RunSupervisionClient['getConsole']>(fail);
      const { store, actions } = observedStore({
        runSupervision: { listAssigned, getConsole },
      });
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const consoleWarn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const list = store.dispatch(
        runSupervisionApi.endpoints.listAssignedRuns.initiate(listQuery),
      );
      const detail = store.dispatch(
        runSupervisionApi.endpoints.getAssignedRunConsole.initiate(
          consoleQuery,
        ),
      );

      await expect(list.unwrap()).rejects.toEqual(unexpectedDefect);
      await expect(detail.unwrap()).rejects.toEqual(unexpectedDefect);
      expect(listAssigned).toHaveBeenCalledOnce();
      expect(getConsole).toHaveBeenCalledOnce();
      expect(JSON.stringify(store.getState())).not.toContain(SENTINEL);
      expect(JSON.stringify(actions)).not.toContain(SENTINEL);
      expect(consoleError).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
      list.unsubscribe();
      detail.unsubscribe();
      store.dispatch(runSupervisionApi.util.resetApiState());
    },
  );

  it.each([undefined, {}, { runSupervision: {} }])(
    'contains missing or malformed dependency binding for both endpoints',
    async (extra) => {
      const { store, actions } = observedStore(extra);
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const list = store.dispatch(
        runSupervisionApi.endpoints.listAssignedRuns.initiate(listQuery),
      );
      const detail = store.dispatch(
        runSupervisionApi.endpoints.getAssignedRunConsole.initiate(
          consoleQuery,
        ),
      );
      await expect(list.unwrap()).rejects.toEqual(unexpectedDefect);
      await expect(detail.unwrap()).rejects.toEqual(unexpectedDefect);
      expect(JSON.stringify(actions)).not.toContain('not configured');
      expect(JSON.stringify(store.getState())).not.toContain('not configured');
      expect(consoleError).not.toHaveBeenCalled();
      list.unsubscribe();
      detail.unsubscribe();
      store.dispatch(runSupervisionApi.util.resetApiState());
    },
  );

  it.each<RunSupervisionFailure>([
    { kind: 'not-found' },
    { kind: 'request-cancelled' },
    { kind: 'service-unavailable', status: 503 },
    unexpectedDefect,
  ])(
    'retains expected endpoint failures without extra private fields: $kind',
    async (failure) => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const consoleWarn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const error = { ...failure, body: SENTINEL, cause: new Error(SENTINEL) };
      const { store, actions } = observedStore({
        runSupervision: {
          listAssigned: async () => ({ ok: false, error }),
          getConsole: async () => ({ ok: false, error }),
        } satisfies RunSupervisionClient,
      });
      const list = store.dispatch(
        runSupervisionApi.endpoints.listAssignedRuns.initiate(listQuery),
      );
      const detail = store.dispatch(
        runSupervisionApi.endpoints.getAssignedRunConsole.initiate(
          consoleQuery,
        ),
      );
      await expect(list.unwrap()).rejects.toEqual(failure);
      await expect(detail.unwrap()).rejects.toEqual(failure);
      expect(JSON.stringify(store.getState())).not.toContain(SENTINEL);
      expect(JSON.stringify(actions)).not.toContain(SENTINEL);
      expect(consoleError).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
      list.unsubscribe();
      detail.unsubscribe();
      store.dispatch(runSupervisionApi.util.resetApiState());
    },
  );

  it('contains late rejected clients without raw logging after RTK cancellation wins', async () => {
    let rejectClient: ((cause: unknown) => void) | undefined;
    let signal: AbortSignal | undefined;
    const getConsole = vi.fn<RunSupervisionClient['getConsole']>(
      (_query, requestSignal) => {
        signal = requestSignal;
        return new Promise((_resolve, reject) => {
          rejectClient = reject;
        });
      },
    );
    const { store, actions } = observedStore({
      runSupervision: { ...successfulClient(), getConsole },
    });
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const detail = store.dispatch(
      runSupervisionApi.endpoints.getAssignedRunConsole.initiate(consoleQuery),
    );
    detail.abort();
    await expect(detail.unwrap()).rejects.toEqual({
      name: 'AbortError',
      message: 'Aborted',
    });
    expect(signal?.aborted).toBe(true);
    expect(
      normalizeRunSupervisionFailure(
        runSupervisionApi.endpoints.getAssignedRunConsole.select(consoleQuery)(
          store.getState(),
        ).error,
      ),
    ).toEqual({ kind: 'request-cancelled' });
    rejectClient?.(new Error(SENTINEL));
    // Allow the endpoint's catch to settle after RTK's abort race has completed.
    await Promise.resolve();
    await Promise.resolve();
    expect(consoleError).not.toHaveBeenCalled();
    expect(JSON.stringify(actions)).not.toContain(SENTINEL);
    expect(getConsole).toHaveBeenCalledOnce();
    detail.unsubscribe();
    store.dispatch(runSupervisionApi.util.resetApiState());
  });

  it('contains a client defect even when the signal already reports aborted', async () => {
    const getConsole = vi.fn<RunSupervisionClient['getConsole']>(
      (_query, signal) => {
        // Isolate the endpoint catch from RTK's own abort-event race: only its
        // observed flag changes. A flag must never classify a rejected client.
        Object.defineProperty(signal, 'aborted', { value: true });
        throw new DOMException(SENTINEL, 'AbortError');
      },
    );
    const { store, actions } = observedStore({
      runSupervision: { ...successfulClient(), getConsole },
    });
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const detail = store.dispatch(
      runSupervisionApi.endpoints.getAssignedRunConsole.initiate(consoleQuery),
    );
    await expect(detail.unwrap()).rejects.toEqual(unexpectedDefect);
    expect(getConsole).toHaveBeenCalledOnce();
    expect(consoleError).not.toHaveBeenCalled();
    expect(JSON.stringify(actions)).not.toContain(SENTINEL);
    detail.unsubscribe();
    store.dispatch(runSupervisionApi.util.resetApiState());
  });

  it('records a failed recheck rather than promoting a retained console snapshot to success', async () => {
    const getConsole = vi
      .fn<RunSupervisionClient['getConsole']>()
      .mockResolvedValueOnce({ ok: true, console: validConsole() })
      .mockRejectedValueOnce(new Error(SENTINEL));
    const { store, actions } = observedStore({
      runSupervision: { ...successfulClient(), getConsole },
    });
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const detail = store.dispatch(
      runSupervisionApi.endpoints.getAssignedRunConsole.initiate(consoleQuery),
    );
    await detail.unwrap();
    await expect(detail.refetch().unwrap()).rejects.toEqual(unexpectedDefect);
    const state = runSupervisionApi.endpoints.getAssignedRunConsole.select(
      consoleQuery,
    )(store.getState());
    expect(state.isError).toBe(true);
    expect(state.error).toEqual(unexpectedDefect);
    // Retained data is not authority; feature rendering must prioritize failure.
    expect(state.data).toEqual(validConsole());
    expect(consoleError).not.toHaveBeenCalled();
    expect(JSON.stringify(actions)).not.toContain(SENTINEL);
    detail.unsubscribe();
    store.dispatch(runSupervisionApi.util.resetApiState());
  });

  it('contains a genuine client decoder defect without retrying the transport', async () => {
    const response = jsonResponse(validConsole());
    Object.defineProperty(response, 'status', {
      get: () => {
        throw new Error(SENTINEL);
      },
    });
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(response);
    const { store, actions } = observedStore({
      runSupervision: createRunSupervisionClient({ fetch }),
    });
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const detail = store.dispatch(
      runSupervisionApi.endpoints.getAssignedRunConsole.initiate(consoleQuery),
    );
    await expect(detail.unwrap()).rejects.toEqual(unexpectedDefect);
    expect(fetch).toHaveBeenCalledOnce();
    expect(consoleError).not.toHaveBeenCalled();
    expect(JSON.stringify(store.getState())).not.toContain(SENTINEL);
    expect(JSON.stringify(actions)).not.toContain(SENTINEL);
    detail.unsubscribe();
    store.dispatch(runSupervisionApi.util.resetApiState());
  });
});

function successfulClient(): RunSupervisionClient {
  return {
    listAssigned: async () => ({ ok: true, page: validPage() }),
    getConsole: async () => ({ ok: true, console: validConsole() }),
  };
}

function observedStore(extra: unknown) {
  const actions: unknown[] = [];
  const observer: Middleware = () => (next) => (action) => {
    actions.push(action);
    return next(action);
  };
  const store = configureStore({
    reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
    middleware: (defaults) =>
      defaults({ thunk: { extraArgument: extra } }).concat(
        observer,
        runSupervisionApi.middleware,
      ),
  });
  return { store, actions };
}
