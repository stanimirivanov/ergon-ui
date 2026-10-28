import { expect, it, vi } from 'vitest';
import {
  createHumanFollowUpBffAdapter,
  type FollowUpCompletionCommand,
} from '../src';
import { TENANT_ID, WORK_ITEM_ID } from './follow-up-fixtures';

const command: FollowUpCompletionCommand = {
  tenantId: TENANT_ID,
  workItemId: WORK_ITEM_ID,
  commandId: '66666666-6666-4666-8666-666666666666',
  claimId: '77777777-7777-4777-8777-777777777777',
  expectedOwnershipRevision: 1,
};

it('permanently retires cached CSRF instead of sending another command', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(
      Response.json({ headerName: 'X-CSRF-TOKEN', token: 'private-token' }),
    )
    .mockResolvedValueOnce(Response.json({}, { status: 503 }));
  const client = createHumanFollowUpBffAdapter({ fetch });
  await client.complete(command, new AbortController().signal);
  expect(fetch).toHaveBeenCalledTimes(2);
  client.retire();
  client.retire();
  expect(await client.complete(command, new AbortController().signal)).toEqual({
    ok: false,
    error: { kind: 'request-cancelled' },
  });
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('interrupts an in-flight shared CSRF acquisition and rejects late setup without a POST', async () => {
  let finish: (value: Response) => void = () => undefined;
  let signal: AbortSignal | undefined;
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation(async (_input, init) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    });
  const client = createHumanFollowUpBffAdapter({ fetch });
  const pending = client.complete(command, new AbortController().signal);
  const competing = client.complete(
    { ...command, commandId: '99999999-9999-4999-8999-999999999999' },
    new AbortController().signal,
  );
  await vi.waitFor(() => expect(signal).toBeDefined());
  client.retire();
  await vi.waitFor(() => expect(signal?.aborted).toBe(true));
  finish(
    Response.json({ headerName: 'X-CSRF-TOKEN', token: 'late-private-token' }),
  );
  expect(await pending).toEqual({
    ok: false,
    error: { kind: 'request-cancelled' },
  });
  expect(await competing).toEqual({
    ok: false,
    error: { kind: 'request-cancelled' },
  });
  expect(await client.complete(command, new AbortController().signal)).toEqual({
    ok: false,
    error: { kind: 'request-cancelled' },
  });
  expect(fetch).toHaveBeenCalledTimes(1);
});
