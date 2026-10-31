import { expect, it, vi } from 'vitest';
import { evaluationApi } from '@ergon/evaluation-data-access-web';
import { createEvaluationStore } from './evaluation-store';
const id = '11111111-1111-4111-8111-111111111111';
it('retires pending HTTP and rejects late cache resurrection', async () => {
  let finish!: (r: Response) => void;
  let signal: AbortSignal | undefined;
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation((_input, init) => {
      signal = init?.signal ?? undefined;
      return new Promise((r) => {
        finish = r;
      });
    });
  const scope = createEvaluationStore(fetch);
  const handle = scope.store.dispatch(
    evaluationApi.endpoints.history.initiate({
      tenantId: id,
      actorId: id,
      after: null,
    }),
  );
  await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
  scope.dispose();
  expect(signal?.aborted).toBe(true);
  finish(Response.json({ items: [], nextAfter: null }));
  await handle;
  expect(scope.store.getState().evaluationApi.queries).toEqual({});
});
