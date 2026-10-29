import { expect, it, vi } from 'vitest';
import { evidenceApi } from '@ergon/evidence-data-access-web';
import { createEvidenceStore } from './evidence-store';

it('aborts all evidence handles, clears private caches and ignores late responses on scope retirement', async () => {
  let finish: ((response: Response) => void) | undefined;
  let signal: AbortSignal | null | undefined;
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation(async (_url, init) => {
      signal = init?.signal;
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
  const scope = createEvidenceStore(fetch);
  const request = scope.store.dispatch(
    evidenceApi.endpoints.pending.initiate({
      tenantId: '11111111-1111-4111-8111-111111111111',
      actorId: '22222222-2222-4222-8222-222222222222',
      cursor: null,
    }),
  );
  await vi.waitFor(() => expect(finish).toBeDefined());
  request.unsubscribe();
  scope.dispose();
  await vi.waitFor(() => expect(signal?.aborted).toBe(true));
  finish?.(Response.json({ entries: [], next: null }));
  await request;
  expect(scope.store.getState().evidenceApi.queries).toEqual({});
});
