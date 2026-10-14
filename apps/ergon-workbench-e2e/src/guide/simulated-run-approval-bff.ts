import { expect, type Page } from '@playwright/test';
import { fulfillSimulatedBff } from './simulated-bff-response';
import {
  handoverRunId,
  handoverTenantPath,
  installSimulatedRunHandoverBff,
  syntheticAssignedRunSnapshot,
} from './simulated-run-handover-bff';

/** Producer-owned wire intent, deliberately independent of the browser client type. */
interface ApprovalCommand {
  readonly commandId: string;
  readonly requestId: string;
  readonly expectedSupervisionRevision: number;
  readonly outcome: 'APPROVED' | 'REJECTED';
}
export const approvalRunId = handoverRunId;
export const approvalTenantPath = handoverTenantPath;
type Mode =
  'unsupported' | 'not-requested' | 'requester' | 'expired' | 'eligible';
const initialRequest = {
  requestId: '99999999-9999-4999-8999-999999999999',
  authority: 'RESOLVER',
  requestedAt: '2026-10-14T12:00:00Z',
  expiresAt: '2026-10-14T12:15:00Z',
  recordedAt: '2026-10-14T12:00:01Z',
};

/**
 * Marked synthetic approvals: switches represent separate controlled server
 * snapshots, not real authority provisioning, time travel or request creation.
 * One first decision is immutable; exact replay returns it without another effect.
 */
export async function installSimulatedRunApprovalBff(page: Page): Promise<{
  setMode: (mode: Mode) => void;
  advanceEpoch: () => void;
  holdLostResponse: () => void;
  releaseLostResponse: () => void;
  newSyntheticRequest: () => void;
  commands: () => readonly ApprovalCommand[];
  effects: () => number;
  csrfReads: () => number;
}> {
  const baseBff = await installSimulatedRunHandoverBff(page);
  let mode: Mode = 'unsupported';
  let revision = 0;
  let effects = 0;
  let csrfReads = 0;
  let request = { ...initialRequest };
  let observedAt = '2026-10-14T12:05:00Z';
  const commands: ApprovalCommand[] = [];
  const receipts = new Map<
    string,
    {
      readonly command: ApprovalCommand;
      readonly receipt: {
        readonly commandId: string;
        readonly requestId: string;
        readonly runId: string;
        readonly supervisionRevision: number;
        readonly decisionId: string;
        readonly outcome: 'APPROVED' | 'REJECTED';
        readonly decidedAt: string;
        readonly recordedAt: string;
      };
    }
  >();
  let decision: {
    readonly decisionId: string;
    readonly outcome: 'APPROVED' | 'REJECTED';
    readonly decidedAt: string;
    readonly recordedAt: string;
  } | null = null;
  let held: Promise<void> | undefined;
  let release: (() => void) | undefined;
  await page.route('**/bff/v1/tenants/*/resolution-runs/*/console', (route) => {
    const status =
      mode === 'not-requested'
        ? 'NOT_REQUESTED'
        : decision !== null
          ? 'DECIDED'
          : mode === 'expired'
            ? 'EXPIRED'
            : 'PENDING';
    const review = {
      status,
      observedAt: mode === 'expired' ? request.expiresAt : observedAt,
      canDecide: mode === 'eligible' && decision === null,
      request:
        mode === 'not-requested'
          ? null
          : {
              ...request,
              authority: mode === 'requester' ? 'REQUESTER' : 'RESOLVER',
            },
      decision,
    };
    return fulfillSimulatedBff(route, {
      ...syntheticAssignedRunSnapshot,
      policyRevision: 'synthetic-approval-policy',
      requiredApproval: mode === 'requester' ? 'REQUESTER' : 'RESOLVER',
      supervisionRevision: revision,
      handoverSupported: false,
      ...(mode === 'unsupported' ? {} : { approvalReview: review }),
    });
  });
  await page.route('**/bff/v1/csrf', (route) => {
    csrfReads++;
    return fulfillSimulatedBff(route, {
      headerName: 'X-CSRF-TOKEN',
      token: 'synthetic-approval-token',
    });
  });
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/approval-requests/*/decisions',
    async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers()['x-csrf-token']).toBe(
        'synthetic-approval-token',
      );
      const body: unknown = route.request().postDataJSON();
      if (
        typeof body !== 'object' ||
        body === null ||
        !('commandId' in body) ||
        typeof body.commandId !== 'string' ||
        !('expectedSupervisionRevision' in body) ||
        typeof body.expectedSupervisionRevision !== 'number' ||
        !('outcome' in body) ||
        (body.outcome !== 'APPROVED' && body.outcome !== 'REJECTED')
      )
        throw new Error('Malformed synthetic approval intent');
      const requestId = new URL(route.request().url()).pathname
        .split('/')
        .at(-2);
      if (requestId === undefined) throw new Error('Request identity missing');
      expect(new URL(route.request().url()).pathname).toBe(
        `/bff/v1${approvalTenantPath}/resolution-runs/${approvalRunId}/approval-requests/${requestId}/decisions`,
      );
      const command: ApprovalCommand = {
        commandId: body.commandId,
        requestId,
        expectedSupervisionRevision: body.expectedSupervisionRevision,
        outcome: body.outcome,
      };
      commands.push(command);
      const historical = receipts.get(command.commandId);
      if (historical !== undefined) {
        expect(command).toEqual(historical.command);
        return fulfillSimulatedBff(route, historical.receipt);
      }
      if (
        mode !== 'eligible' ||
        decision !== null ||
        requestId !== request.requestId ||
        command.expectedSupervisionRevision !== revision
      )
        return fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:run-approval-conflict' },
          409,
        );
      decision = {
        decisionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        outcome: command.outcome,
        decidedAt: observedAt,
        recordedAt: new Date(Date.parse(observedAt) + 1000).toISOString(),
      };
      const receipt = {
        ...decision,
        commandId: command.commandId,
        runId: approvalRunId,
        requestId,
        supervisionRevision: revision,
      };
      receipts.set(command.commandId, { command, receipt });
      effects++;
      if (held !== undefined) {
        await held;
        held = undefined;
        return fulfillSimulatedBff(
          route,
          { type: 'urn:example:lost-response' },
          503,
        );
      }
      return fulfillSimulatedBff(route, receipt, 201);
    },
  );
  return {
    setMode: (value) => {
      mode = value;
    },
    advanceEpoch: () => {
      // Handover and return retain this actor but must advance two epochs.
      revision += 2;
      baseBff.advanceEpoch();
    },
    holdLostResponse: () => {
      held = new Promise<void>((resolve) => {
        release = resolve;
      });
    },
    releaseLostResponse: () => release?.(),
    newSyntheticRequest: () => {
      request = {
        ...initialRequest,
        requestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        requestedAt: '2026-10-14T13:00:00Z',
        expiresAt: '2026-10-14T13:15:00Z',
        recordedAt: '2026-10-14T13:00:01Z',
      };
      observedAt = '2026-10-14T13:05:00Z';
      decision = null;
      mode = 'eligible';
    },
    commands: () => commands,
    effects: () => effects,
    csrfReads: () => csrfReads,
  };
}
