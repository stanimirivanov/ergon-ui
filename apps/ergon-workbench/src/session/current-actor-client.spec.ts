import { describe, expect, it } from 'vitest';

import {
  createCurrentActorClient,
  type AccessTokenProvider,
} from './current-actor-client';

const TENANT_ID = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';
const ACTOR_ID = '741bcdba-9521-4e96-bfcc-7a5a2830eec8';

const tokenProvider: AccessTokenProvider = {
  async getAccessToken() {
    return 'short-lived-token';
  },
};

describe('current actor client', () => {
  it('sends the bearer credential and decodes a valid actor', async () => {
    let requestedUrl: string | undefined;
    let authorization: string | null = null;

    async function fetchStub(
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) {
      requestedUrl = input.toString();
      authorization = new Headers(init?.headers).get('Authorization');
      return jsonResponse({
        actorId: ACTOR_ID,
        identityProvider: 'workforce-sso',
        subject: 'employee-42',
        registeredAt: '2026-09-20T12:34:56.123456Z',
        recordedAt: '2026-09-20T12:34:57Z',
      });
    }

    const client = createCurrentActorClient({
      accessTokenProvider: tokenProvider,
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
    expect(requestedUrl).toBe(`/api/v1/tenants/${TENANT_ID}/human-actor`);
    expect(authorization).toBe('Bearer short-lived-token');
  });

  it('fails closed without invoking HTTP when no token is available', async () => {
    let requestCount = 0;
    async function fetchStub() {
      requestCount += 1;
      return jsonResponse({});
    }

    const client = createCurrentActorClient({
      accessTokenProvider: {
        async getAccessToken() {
          return null;
        },
      },
      fetch: fetchStub,
    });

    const result = await client.resolve(
      TENANT_ID,
      new AbortController().signal,
    );

    expect(result).toEqual({
      ok: false,
      error: { kind: 'authentication-required' },
    });
    expect(requestCount).toBe(0);
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
      accessTokenProvider: tokenProvider,
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
      accessTokenProvider: tokenProvider,
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
        subject: 'employee-42',
        registeredAt: '2026-09-20T12:34:56Z',
        recordedAt: '2026-09-20T12:34:57Z',
      });
    }

    const client = createCurrentActorClient({
      accessTokenProvider: tokenProvider,
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
      accessTokenProvider: tokenProvider,
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
