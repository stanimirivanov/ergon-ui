import { expect, type Page } from '@playwright/test';
import { fulfillSimulatedBff } from './simulated-bff-response';
import {
  assignedRunId,
  simulatedRunSupervisionSnapshot as snapshot,
  installSimulatedRunSupervisionBff,
} from './simulated-run-supervision-bff';

export const cancellationPrivatePolicy = 'synthetic-private-untouched-policy';
type ReviewMode =
  | 'eligible'
  | 'disabled'
  | 'unsupported'
  | 'denied'
  | 'stale'
  | 'authorization-recorded'
  | 'not-untouched';
type CommandMode =
  'success' | 'conflict' | 'lost-committed' | 'lost-uncommitted';
interface CancellationIntent {
  readonly commandId: string;
  readonly expectedSupervisionRevision: number;
  readonly expectedRunVersion: number;
}

/** Producer-owned marked wire fixtures only. Counters are synthetic checkpoints, not authority, transaction or provider evidence. */
export async function installSimulatedRunCancellationBff(page: Page): Promise<{
  readonly setReview: (mode: ReviewMode) => void;
  readonly setNext: (mode: CommandMode) => void;
  readonly setReadAccess: (allowed: boolean) => void;
  readonly holdCommand: () => void;
  readonly releaseCommand: () => void;
  readonly holdRead: () => void;
  readonly releaseRead: () => void;
  readonly intents: () => readonly CancellationIntent[];
  readonly cancellations: () => number;
  readonly reviews: () => number;
}> {
  await installSimulatedRunSupervisionBff(page);
  let mode: ReviewMode = 'disabled';
  let next: CommandMode = 'success';
  let canRead = true;
  let cancelled = false;
  let epoch = 0;
  let cancellations = 0;
  let reviews = 0;
  const intents: CancellationIntent[] = [];
  let recorded: { intent: CancellationIntent; receipt: object } | undefined;
  let commandWait: Promise<void> | undefined;
  let releaseCommand: (() => void) | undefined;
  let readWait: Promise<void> | undefined;
  let releaseRead: (() => void) | undefined;
  const time = '2026-10-18T10:00:00.123456Z';
  await page.route('**/bff/v1/csrf', (route) =>
    fulfillSimulatedBff(route, {
      headerName: 'X-CSRF-TOKEN',
      token: 'synthetic-cancellation-csrf',
    }),
  );
  await page.route('**/bff/v1/tenants/*/resolution-runs/assigned?*', (route) =>
    fulfillSimulatedBff(route, {
      entries:
        canRead && !cancelled
          ? [
              {
                runId: assignedRunId,
                caseId: snapshot.caseId,
                state: snapshot.state,
                stateVersion: 0,
                stateUpdatedAt: snapshot.stateUpdatedAt,
                assignedAt: snapshot.assignedAt,
                supervisionRevision: epoch,
              },
            ]
          : [],
      nextCursor: null,
    }),
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/console',
    async (route) => {
      const wait = readWait;
      readWait = undefined;
      if (wait) await wait;
      if (!canRead)
        return fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:assigned-resolution-run-not-found' },
          404,
        );
      return fulfillSimulatedBff(route, {
        ...snapshot,
        policyRevision: cancellationPrivatePolicy,
        supervisionRevision: epoch,
        handoverSupported: false,
        execution: null,
        state: cancelled ? 'CANCELLED' : snapshot.state,
        stateVersion: cancelled ? 1 : 0,
        stateUpdatedAt: cancelled ? time : snapshot.stateUpdatedAt,
        transitions: cancelled
          ? [
              {
                sequence: 1,
                type: 'RUN_CANCELLED',
                fromState: snapshot.state,
                toState: 'CANCELLED',
                occurredAt: time,
                recordedAt: time,
              },
            ]
          : [],
        outcomeVerification: {
          property: 'account.access.state',
          expectedValue: 'ACTIVE',
          status: 'NOT_ASSESSED',
          reason: 'RUN_NOT_VERIFYING',
          caseStreamVersion: null,
          evidence: null,
          acceptance: null,
        },
      });
    },
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/cancellation-review',
    (route) => {
      reviews += 1;
      if (mode === 'unsupported' || mode === 'denied')
        return fulfillSimulatedBff(
          route,
          {
            type: `urn:ergon:problem:${mode === 'denied' ? 'assigned-resolution-run-not-found' : 'route-not-found'}`,
          },
          404,
        );
      return fulfillSimulatedBff(route, {
        supported: mode !== 'disabled',
        observedAt: time,
        supervisionRevision: epoch + (mode === 'stale' ? 1 : 0),
        runVersion: mode === 'not-untouched' ? 1 : 0,
        canCancel: mode === 'eligible' || mode === 'stale',
        reason:
          mode === 'disabled'
            ? 'DISABLED'
            : mode === 'authorization-recorded'
              ? 'AUTHORIZATION_OR_EXECUTION_RECORDED'
              : mode === 'not-untouched'
                ? 'RUN_NOT_UNTOUCHED'
                : 'ELIGIBLE',
        authorityEvidenceId: 'PRIVATE_EXTRA',
      });
    },
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/cancellation-commands',
    async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers()['x-csrf-token']).toBe(
        'synthetic-cancellation-csrf',
      );
      const intent: CancellationIntent = route.request().postDataJSON();
      intents.push(intent);
      expect(await page.getByRole('dialog').count()).toBe(0);
      expect(
        await page
          .getByText(cancellationPrivatePolicy, { exact: true })
          .count(),
      ).toBe(0);
      expect(
        await page
          .getByRole('button', { name: `Inspect run ${assignedRunId}` })
          .count(),
      ).toBe(0);
      const wait = commandWait;
      commandWait = undefined;
      if (wait) await wait;
      if (recorded?.intent.commandId === intent.commandId) {
        expect(intent).toEqual(recorded.intent);
        return fulfillSimulatedBff(route, recorded.receipt);
      }
      expect(intent).toEqual({
        commandId: expect.stringMatching(/^[0-9a-f-]{36}$/i),
        expectedSupervisionRevision: epoch,
        expectedRunVersion: 0,
      });
      const response = next;
      next = 'success';
      if (response === 'conflict') {
        epoch += 1;
        return fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:run-cancellation-conflict' },
          409,
        );
      }
      if (response === 'lost-uncommitted') return route.abort('failed');
      expect(mode).toBe('eligible');
      expect(cancelled).toBe(false);
      const receipt = {
        commandId: intent.commandId,
        runId: assignedRunId,
        supervisionRevision: epoch,
        expectedRunVersion: 0,
        reason: 'OPERATOR_REQUESTED',
        cancelledAt: time,
        recordedAt: time,
      };
      recorded = { intent, receipt };
      cancelled = true;
      cancellations += 1;
      if (response === 'lost-committed') return route.abort('failed');
      return fulfillSimulatedBff(route, receipt, 201);
    },
  );
  return {
    setReview: (value) => {
      mode = value;
    },
    setNext: (value) => {
      next = value;
    },
    setReadAccess: (value) => {
      canRead = value;
    },
    holdCommand: () => {
      commandWait = new Promise<void>((resolve) => {
        releaseCommand = resolve;
      });
    },
    releaseCommand: () => releaseCommand?.(),
    holdRead: () => {
      readWait = new Promise<void>((resolve) => {
        releaseRead = resolve;
      });
    },
    releaseRead: () => releaseRead?.(),
    intents: () => intents,
    cancellations: () => cancellations,
    reviews: () => reviews,
  };
}
