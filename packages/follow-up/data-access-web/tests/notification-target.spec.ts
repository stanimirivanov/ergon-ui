import { expect, it } from 'vitest';
import {
  createFollowUpNotificationTargetClient,
  createHumanFollowUpBffAdapter,
} from '../src';
import {
  CASE_ID,
  RUN_ID,
  TENANT_ID,
  WORK_ITEM_ID,
  validCaseSummary,
  jsonResponse,
} from './follow-up-fixtures';

it('opens a work-only historical pointer through the complete current-owner summary decoder', async () => {
  const client = createFollowUpNotificationTargetClient({
    fetch: async () => jsonResponse(validCaseSummary()),
  });
  await expect(
    client.read(
      { tenantId: TENANT_ID, actorId: CASE_ID, workItemId: WORK_ITEM_ID },
      new AbortController().signal,
    ),
  ).resolves.toEqual({ ok: true, summary: validCaseSummary() });
});
it('rejects the wrong work even if the remaining summary is valid', async () => {
  const client = createFollowUpNotificationTargetClient({
    fetch: async () => jsonResponse(validCaseSummary()),
  });
  await expect(
    client.read(
      { tenantId: TENANT_ID, actorId: CASE_ID, workItemId: CASE_ID },
      new AbortController().signal,
    ),
  ).resolves.toEqual({ ok: false, error: { kind: 'invalid-response' } });
});
it('preserves strict case/run correlation for existing queue consumers', async () => {
  const client = createHumanFollowUpBffAdapter({
    fetch: async () => jsonResponse(validCaseSummary()),
  });
  await expect(
    client.getOwnedCaseSummary(
      {
        tenantId: TENANT_ID,
        workItemId: WORK_ITEM_ID,
        caseId: RUN_ID,
        runId: CASE_ID,
      },
      new AbortController().signal,
    ),
  ).resolves.toEqual({ ok: false, error: { kind: 'invalid-response' } });
});
