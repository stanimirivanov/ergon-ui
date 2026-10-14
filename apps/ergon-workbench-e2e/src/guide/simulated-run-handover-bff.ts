import { expect, type Page } from '@playwright/test';
import { fulfillSimulatedBff } from './simulated-bff-response';

/** Test-owned wire intent; deliberately independent of the consuming client's contract types. */
interface RunSupervisorHandoverCommand {
  readonly tenantId: string;
  readonly runId: string;
  readonly commandId: string;
  readonly supervisorActorId: string;
  readonly expectedSupervisionRevision: number;
}

export const handoverTenantPath =
  '/tenants/9ad66e9b-e81a-4b61-8d8f-5708312772d8';
export const handoverRunId = '33333333-3333-4333-8333-333333333333';
export const outgoingSupervisorId = '741bcdba-9521-4e96-bfcc-7a5a2830eec8';
export const handoverRecipients = Array.from(
  { length: 26 },
  (_, index) =>
    `77777777-7777-4777-8777-${(index + 1).toString(16).padStart(12, '0')}`,
);
const snapshot = {
  runId: handoverRunId,
  caseId: '22222222-2222-4222-8222-222222222222',
  caseEvidenceStreamVersion: 4,
  contractKey: 'access-restoration',
  contractRevision: 2,
  policyRevision: 'synthetic-handover-policy',
  stepId: 'verify-account-owner',
  capability: 'identity.lookup',
  effectiveRisk: 'HIGH',
  requiredApproval: 'RESOLVER',
  attemptNumber: 1,
  predecessorRunId: null,
  startedRecordedAt: '2026-10-14T07:00:00Z',
  state: 'WAITING_FOR_APPROVAL',
  stateVersion: 0,
  stateUpdatedAt: '2026-10-14T07:00:00Z',
  assignedAt: '2026-10-14T07:01:00Z',
  execution: null,
  transitions: [],
} as const;

/**
 * Marked synthetic supervision only. Simulate an intervening epoch and a
 * committed transfer whose response is unavailable; exact replay returns its
 * original receipt. No actual assignment, IdP session or database is changed.
 */
export async function installSimulatedRunHandoverBff(page: Page): Promise<{
  enable: () => void;
  advanceEpoch: () => void;
  holdLostResponse: () => void;
  releaseLostResponse: () => void;
  becomeRecipient: () => void;
  requests: () => readonly RunSupervisorHandoverCommand[];
  candidateReads: () => number;
  csrfReads: () => number;
}> {
  let enabled = false;
  let revision = 0;
  let supervisor = outgoingSupervisorId;
  let actor = outgoingSupervisorId;
  let candidateReads = 0;
  let csrfReads = 0;
  let release: (() => void) | undefined;
  let held: Promise<void> | undefined;
  const requests: RunSupervisorHandoverCommand[] = [];
  let recorded:
    { command: RunSupervisorHandoverCommand; receipt: object } | undefined;
  const base = `/bff/v1${handoverTenantPath}/resolution-runs/${handoverRunId}`;

  await page.route('**/bff/v1/tenants/*/session', (route) =>
    fulfillSimulatedBff(route, {
      actorId: actor,
      identityProvider: 'workforce-sso',
      registeredAt: '2026-10-13T07:00:00Z',
      recordedAt: '2026-10-13T07:00:01Z',
    }),
  );
  await page.route('**/bff/v1/tenants/*/human-follow-ups?*', (route) =>
    fulfillSimulatedBff(route, { items: [], nextCursor: null }),
  );
  await page.route('**/bff/v1/tenants/*/human-follow-ups/owned?*', (route) =>
    fulfillSimulatedBff(route, { items: [], nextCursor: null }),
  );
  await page.route('**/bff/v1/tenants/*/resolution-runs/assigned?*', (route) =>
    fulfillSimulatedBff(route, {
      entries:
        actor === supervisor
          ? [
              {
                runId: snapshot.runId,
                caseId: snapshot.caseId,
                state: snapshot.state,
                stateVersion: snapshot.stateVersion,
                stateUpdatedAt: snapshot.stateUpdatedAt,
                assignedAt: snapshot.assignedAt,
                supervisionRevision: revision,
              },
            ]
          : [],
      nextCursor: null,
    }),
  );
  await page.route('**/bff/v1/tenants/*/resolution-runs/*/console', (route) =>
    actor === supervisor
      ? fulfillSimulatedBff(route, {
          ...snapshot,
          supervisionRevision: revision,
          handoverSupported: enabled,
        })
      : fulfillSimulatedBff(
          route,
          {
            type: 'urn:ergon:problem:assigned-resolution-run-not-found',
            status: 404,
          },
          404,
        ),
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/handover-candidates?*',
    (route) => {
      expect(route.request().method()).toBe('GET');
      candidateReads++;
      const query = new URL(route.request().url()).searchParams;
      expect(Number(query.get('expectedSupervisionRevision'))).toBe(revision);
      expect(actor).toBe(supervisor);
      const after = query.get('afterActorId');
      const limit = Number(query.get('limit'));
      expect(limit).toBe(25);
      const available = [outgoingSupervisorId, ...handoverRecipients]
        .filter((id) => id !== actor && (after === null || id > after))
        .sort();
      const entries = available.slice(0, limit).map((actorId) => ({ actorId }));
      return fulfillSimulatedBff(route, {
        entries,
        nextActorId: available.length > limit ? entries.at(-1)?.actorId : null,
        supervisionRevision: revision,
      });
    },
  );
  await page.route('**/bff/v1/csrf', (route) => {
    csrfReads++;
    return fulfillSimulatedBff(route, {
      headerName: 'X-CSRF-TOKEN',
      token: 'synthetic-handover-token',
    });
  });
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/supervisor-handovers',
    async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(new URL(route.request().url()).pathname).toBe(
        `${base}/supervisor-handovers`,
      );
      expect(route.request().headers()['x-csrf-token']).toBe(
        'synthetic-handover-token',
      );
      const body: {
        commandId: string;
        expectedSupervisionRevision: number;
        supervisorActorId: string;
      } = route.request().postDataJSON();
      const command: RunSupervisorHandoverCommand = {
        ...body,
        tenantId: handoverTenantPath.split('/').at(-1) ?? '',
        runId: handoverRunId,
      };
      requests.push(command);
      expect(Object.keys(body).sort()).toEqual([
        'commandId',
        'expectedSupervisionRevision',
        'supervisorActorId',
      ]);
      if (
        recorded !== undefined &&
        recorded.command.commandId === command.commandId
      ) {
        expect(command).toEqual(recorded.command);
        await fulfillSimulatedBff(route, recorded.receipt);
        return;
      }
      if (command.expectedSupervisionRevision !== revision) {
        await fulfillSimulatedBff(
          route,
          {
            type: 'urn:ergon:problem:run-supervisor-handover-conflict',
            status: 409,
          },
          409,
        );
        return;
      }
      expect(enabled).toBe(true);
      expect(actor).toBe(supervisor);
      expect(handoverRecipients).toContain(command.supervisorActorId);
      supervisor = command.supervisorActorId;
      revision++;
      recorded = {
        command,
        receipt: {
          commandId: command.commandId,
          runId: handoverRunId,
          supervisionRevision: revision,
          handedOverAt: '2026-10-14T08:00:00.123457Z',
          recordedAt: '2026-10-14T08:00:01Z',
        },
      };
      if (held !== undefined) {
        await held;
        await fulfillSimulatedBff(
          route,
          {
            type: 'urn:ergon:problem:temporary-response-unavailable',
            status: 503,
          },
          503,
        );
      } else await fulfillSimulatedBff(route, recorded.receipt, 201);
    },
  );
  return {
    enable: () => {
      enabled = true;
    },
    advanceEpoch: () => {
      revision = 2;
    },
    holdLostResponse: () => {
      held = new Promise((resolve) => {
        release = resolve;
      });
    },
    releaseLostResponse: () => {
      release?.();
      release = undefined;
    },
    becomeRecipient: () => {
      actor = supervisor;
    },
    requests: () => requests,
    candidateReads: () => candidateReads,
    csrfReads: () => csrfReads,
  };
}
