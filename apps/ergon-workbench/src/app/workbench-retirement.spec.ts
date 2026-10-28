import { expect, it, vi } from 'vitest';
import { runControlApi } from '@ergon/run-supervision-data-access-web';
import { createPrivateSessionTransport } from '@ergon/session-data-access-web';
import { createBrowserWorkbenchScope } from './browser-dependencies';

it('aborts a pending control command, empties its cache and rejects late acknowledgement without releasing a lease', async () => {
  let finish: (response: Response) => void = () => undefined;
  let signal: AbortSignal | undefined;
  const actions: string[] = [];
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation(async (input, init) => {
      if (String(input) === '/bff/v1/csrf')
        return Response.json({
          headerName: 'X-CSRF-TOKEN',
          token: 'command-token',
        });
      expect(String(input)).toContain('/control-commands');
      actions.push(String(init?.body));
      signal = init?.signal ?? undefined;
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    });
  const transport = createPrivateSessionTransport(fetch);
  const scope = createBrowserWorkbenchScope(transport.fetch);
  const pending = scope.store.dispatch(
    runControlApi.endpoints.changeRunControl.initiate({
      tenantId: '9ad66e9b-e81a-4b61-8d8f-5708312772d8',
      runId: '33333333-3333-4333-8333-333333333333',
      expectedSupervisionRevision: 1,
      commandId: '66666666-6666-4666-8666-666666666666',
      action: 'ACQUIRE',
    }),
  );
  await vi.waitFor(() => expect(signal).toBeDefined());
  scope.dispose();
  transport.retire();
  await vi.waitFor(() => expect(signal?.aborted).toBe(true));
  await pending;
  finish(
    Response.json({
      commandId: '66666666-6666-4666-8666-666666666666',
      runId: '33333333-3333-4333-8333-333333333333',
      action: 'ACQUIRE',
      supervisionRevision: 1,
      control: { leaseId: '77777777-7777-4777-8777-777777777777', revision: 1 },
      changedAt: '2026-10-28T09:00:00Z',
      expiresAt: '2026-10-28T09:02:00Z',
      recordedAt: '2026-10-28T09:00:00Z',
    }),
  );
  await Promise.resolve();
  expect(scope.store.getState().runSupervisionApi.mutations).toEqual({});
  expect(actions).toHaveLength(1);
  expect(JSON.parse(actions[0] ?? '{}').action).toBe('ACQUIRE');
  scope.dispose();
});
