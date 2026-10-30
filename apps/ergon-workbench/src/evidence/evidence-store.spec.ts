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
it('retires held assessment reads and bundle writes including their in-flight CSRF before late completion', async () => {
  const tenantId = '11111111-1111-4111-8111-111111111111',
    actorId = '22222222-2222-4222-8222-222222222222',
    id = '33333333-3333-4333-8333-333333333333';
  const signals: AbortSignal[] = [],
    finishes: ((r: Response) => void)[] = [];
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation(async (_url, init) => {
      if (init?.signal) signals.push(init.signal);
      return new Promise((resolve) => finishes.push(resolve));
    });
  const scope = createEvidenceStore(fetch);
  const read = scope.store.dispatch(
    evidenceApi.endpoints.assessment.initiate({ tenantId, actorId, id }),
  );
  const write = scope.store.dispatch(
    evidenceApi.endpoints.publish.initiate({
      tenantId,
      actorId,
      id,
      claims: [],
      procedures: [id],
      claimSets: [],
    }),
  );
  await vi.waitFor(() => expect(signals).toHaveLength(2));
  read.unsubscribe();
  scope.dispose();
  await vi.waitFor(() => expect(signals.every((s) => s.aborted)).toBe(true));
  for (const finish of finishes)
    finish(Response.json({ private: 'late resource' }));
  await Promise.all([read, write]);
  expect(scope.store.getState().evidenceApi.queries).toEqual({});
  expect(scope.store.getState().evidenceApi.mutations).toEqual({});
  expect(fetch).toHaveBeenCalledTimes(2);
});
