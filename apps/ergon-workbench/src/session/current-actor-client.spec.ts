import { describe, expect, it } from 'vitest';

import { createCurrentActorClient } from './current-actor-client';

const TENANT_ID = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';
const ACTOR_ID = '741bcdba-9521-4e96-bfcc-7a5a2830eec8';

describe('current actor client', () => {
  it('sends the same-origin session cookie and decodes a valid actor', async () => {
    let requestedUrl: string | undefined;
    let credentials: unknown;

    async function fetchStub(
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) {
      requestedUrl = input.toString();
      credentials = init?.credentials;
      return jsonResponse({
        actorId: ACTOR_ID,
        identityProvider: 'workforce-sso',
        registeredAt: '2026-09-20T12:34:56.123456Z',
        recordedAt: '2026-09-20T12:34:57Z',
      });
    }

    const client = createCurrentActorClient({
      fetch: fetchStub,
    });

    const result = await client.resolve(
      TENANT_ID,
      new AbortController().signal,
    );

    expect(result).toEqual({
      ok: true,
      actor: {
        actorId: ACTOR_ID,
        identityProvider: 'workforce-sso',
        registeredAt: '2026-09-20T12:34:56.123456Z',
        recordedAt: '2026-09-20T12:34:57Z',
      },
    });
    expect(requestedUrl).toBe(`/bff/v1/tenants/${TENANT_ID}/session`);
    expect(credentials).toBe('same-origin');
  });

  it('accepts only the expected local sign-in path from an authentication problem', async () => {
    async function fetchStub() {
      return jsonResponse(
        {
          type: 'urn:ergon:problem:browser-authentication-required',
          title: 'Browser authentication required',
          status: 401,
          detail: 'An authenticated browser session is required',
          signInPath: '/bff/login',
        },
        401,
      );
    }

    const client = createCurrentActorClient({
      fetch: fetchStub,
    });

    const result = await client.resolve(
      TENANT_ID,
      new AbortController().signal,
    );

    expect(result).toEqual({
      ok: false,
      error: {
        kind: 'authentication-required',
        signInPath: '/bff/login',
      },
    });
  });

  it('does not expose an untrusted sign-in location', async () => {
    async function fetchStub() {
      return jsonResponse(
        {
          type: 'urn:ergon:problem:browser-authentication-required',
          title: 'Browser authentication required',
          status: 401,
          detail: 'An authenticated browser session is required',
          signInPath: 'https://attacker.example/collect',
        },
        401,
      );
    }

    const client = createCurrentActorClient({ fetch: fetchStub });

    const result = await client.resolve(
      TENANT_ID,
      new AbortController().signal,
    );

    expect(result).toEqual({
      ok: false,
      error: { kind: 'unexpected-response', status: 401 },
    });
  });

  it('does not retry a deliberately disabled browser boundary', async () => {
    let requestCount = 0;
    async function fetchStub() {
      requestCount += 1;
      return jsonResponse(
        {
          type: 'urn:ergon:problem:browser-authentication-unavailable',
          title: 'Browser authentication unavailable',
          status: 503,
          detail: 'Browser authentication is not configured',
        },
        503,
      );
    }

    const client = createCurrentActorClient({ fetch: fetchStub });

    const result = await client.resolve(
      TENANT_ID,
      new AbortController().signal,
    );

    expect(result).toEqual({
      ok: false,
      error: { kind: 'authentication-unavailable' },
    });
    expect(requestCount).toBe(1);
  });

  it('maps an unregistered actor problem without exposing its detail', async () => {
    async function fetchStub() {
      return jsonResponse(
        {
          type: 'urn:ergon:problem:human-actor-not-registered',
          title: 'Human actor not registered',
          status: 403,
          detail: 'sensitive provider subject',
        },
        403,
      );
    }

    const client = createCurrentActorClient({
      fetch: fetchStub,
    });

    const result = await client.resolve(
      TENANT_ID,
      new AbortController().signal,
    );

    expect(result).toEqual({
      ok: false,
      error: { kind: 'actor-not-registered' },
    });
  });

  it('rejects malformed success payloads before they reach the query cache', async () => {
    async function fetchStub() {
      return jsonResponse({ actorId: 'not-a-uuid' });
    }

    const client = createCurrentActorClient({
      fetch: fetchStub,
    });

    const result = await client.resolve(
      TENANT_ID,
      new AbortController().signal,
    );

    expect(result).toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    });
  });

  it('retries one transient service failure and then succeeds', async () => {
    let requestCount = 0;
    async function fetchStub() {
      requestCount += 1;
      if (requestCount === 1) {
        return jsonResponse(
          {
            type: 'urn:ergon:problem:temporary-failure',
            title: 'Temporary failure',
            status: 503,
            detail: 'Try later',
          },
          503,
        );
      }
      return jsonResponse({
        actorId: ACTOR_ID,
        identityProvider: 'workforce-sso',
        registeredAt: '2026-09-20T12:34:56Z',
        recordedAt: '2026-09-20T12:34:57Z',
      });
    }

    const client = createCurrentActorClient({
      fetch: fetchStub,
    });

    const result = await client.resolve(
      TENANT_ID,
      new AbortController().signal,
    );

    expect(result.ok).toBe(true);
    expect(requestCount).toBe(2);
  });

  it('interrupts timed-out fetches and returns a bounded failure', async () => {
    let requestCount = 0;
    function fetchStub(
      _input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ): Promise<Response> {
      requestCount += 1;
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      });
    }

    const client = createCurrentActorClient({
      fetch: fetchStub,
      requestTimeout: 5,
    });

    const result = await client.resolve(
      TENANT_ID,
      new AbortController().signal,
    );

    expect(result).toEqual({ ok: false, error: { kind: 'timeout' } });
    expect(requestCount).toBe(2);
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
