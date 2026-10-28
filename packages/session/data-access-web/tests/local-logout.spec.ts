import { describe, expect, it, vi } from 'vitest';
import {
  createLocalLogoutClient,
  createPrivateSessionTransport,
  normalizeLocalLogoutResult,
} from '../src';

const token = { headerName: 'X-CSRF-TOKEN', token: 'synthetic-session-csrf' };
const missing = {
  type: 'urn:ergon:problem:browser-authentication-required',
  signInPath: '/bff/login',
};
describe('local logout protocol', () => {
  it('uses fresh invocation-local CSRF and one exact same-origin POST without a body or redirect following', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json(token))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ ...token, token: 'fresh' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = createLocalLogoutClient({ fetch });
    for (let i = 0; i < 2; i++)
      expect(await client.logout(new AbortController().signal)).toEqual({
        kind: 'signed-out',
      });
    expect(fetch.mock.calls.map(([path]) => path)).toEqual([
      '/bff/v1/csrf',
      '/bff/logout',
      '/bff/v1/csrf',
      '/bff/logout',
    ]);
    expect(fetch.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'error',
        headers: {
          Accept: 'application/problem+json',
          'X-CSRF-TOKEN': token.token,
        },
      }),
    );
    expect(fetch.mock.calls[1]?.[1]?.body).toBeUndefined();
    expect(fetch.mock.calls[3]?.[1]?.headers).toEqual(
      expect.objectContaining({ 'X-CSRF-TOKEN': 'fresh' }),
    );
  });
  it.each([
    [401, missing, 'sign-in-required'],
    [
      401,
      { ...missing, signInPath: 'https://evil.invalid' },
      'invalid-response',
    ],
    [403, {}, 'forbidden'],
    [503, {}, 'unavailable'],
    [302, {}, 'invalid-response'],
    [200, { headerName: 'Authorization', token: 'secret' }, 'invalid-response'],
    [200, { ...token, token: 'bad\r\nvalue' }, 'invalid-response'],
  ])(
    'contains CSRF-stage %s and never dispatches a POST',
    async (status, body, kind) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(Response.json(body, { status }));
      const result = await createLocalLogoutClient({ fetch }).logout(
        new AbortController().signal,
      );
      expect(result).toEqual(
        kind === 'sign-in-required'
          ? { kind }
          : { kind: 'failed', failure: kind },
      );
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it.each([
    [401, missing, 'sign-in-required'],
    [403, {}, 'forbidden'],
    [503, {}, 'unavailable'],
    [200, {}, 'invalid-response'],
  ])(
    'contains POST-stage %s without automatic replay',
    async (status, body, kind) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(Response.json(token))
        .mockResolvedValueOnce(Response.json(body, { status }));
      expect(
        await createLocalLogoutClient({ fetch }).logout(
          new AbortController().signal,
        ),
      ).toEqual(
        kind === 'sign-in-required'
          ? { kind }
          : { kind: 'failed', failure: kind },
      );
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );
  it('retires an unfinished CSRF body on timeout without a POST', async () => {
    let observed: AbortSignal | undefined;
    const fetch: typeof globalThis.fetch = async (_path, init) => {
      observed = init?.signal ?? undefined;
      return {
        status: 200,
        json: () => new Promise(() => undefined),
      } as unknown as Response;
    };
    expect(
      await createLocalLogoutClient({ fetch, requestTimeout: 10 }).logout(
        new AbortController().signal,
      ),
    ).toEqual({ kind: 'failed', failure: 'timeout' });
    expect(observed?.aborted).toBe(true);
  });
  it('keeps a lost POST acknowledgement uncertain without automatic retry', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json(token))
      .mockRejectedValueOnce(new Error('private network cause'));
    expect(
      await createLocalLogoutClient({ fetch }).logout(
        new AbortController().signal,
      ),
    ).toEqual({ kind: 'failed', failure: 'transport' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('contains caller cancellation and malformed injected outcomes without retaining diagnostics', async () => {
    const controller = new AbortController();
    const fetch: typeof globalThis.fetch = async () => {
      controller.abort();
      throw new Error('private diagnostic');
    };
    expect(
      await createLocalLogoutClient({ fetch }).logout(controller.signal),
    ).toEqual({ kind: 'failed', failure: 'request-cancelled' });
    expect(
      normalizeLocalLogoutResult({ kind: 'signed-out', privateText: 'secret' }),
    ).toEqual({ kind: 'signed-out' });
    expect(
      normalizeLocalLogoutResult({
        kind: 'failed',
        failure: 'unrecognized',
        cause: 'secret',
      }),
    ).toEqual({ kind: 'failed', failure: 'unexpected-defect' });
  });
});

describe('private session transport retirement', () => {
  it('aborts existing requests, rejects late headers and permanently blocks new work', async () => {
    let finish: (value: Response) => void = () => undefined;
    let observed: AbortSignal | undefined;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (_path, init) => {
        observed = init?.signal ?? undefined;
        return new Promise<Response>((resolve) => {
          finish = resolve;
        });
      });
    const scope = createPrivateSessionTransport(fetch);
    const pending = scope.fetch('/private');
    scope.retire();
    expect(observed?.aborted).toBe(true);
    finish(Response.json({ private: 'late' }));
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await expect(scope.fetch('/other')).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('preserves caller cancellation independently from root retirement', async () => {
    let observed: AbortSignal | undefined;
    const scope = createPrivateSessionTransport(async (_path, init) => {
      observed = init?.signal ?? undefined;
      return Response.json({});
    });
    const controller = new AbortController();
    await scope.fetch('/private', { signal: controller.signal });
    controller.abort();
    expect(observed?.aborted).toBe(true);
  });
});
