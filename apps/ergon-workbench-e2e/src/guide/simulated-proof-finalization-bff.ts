import { expect, type Page } from '@playwright/test';
import type {
  AssignedRunConsole,
  RunProofFinalizationCommand,
  RunProofFinalizationReceipt,
} from '@ergon/run-supervision-data-access-web';
import { fulfillSimulatedBff } from './simulated-bff-response';
import {
  installSimulatedRunSupervisionBff,
  assignedRunId,
  supervisorTenantPath,
} from './simulated-run-supervision-bff';
import { simulatedRunVerificationSnapshot } from './simulated-run-verification-bff';

type Intent = Omit<RunProofFinalizationCommand, 'tenantId' | 'runId'>;
type CommandResult = 'conflict' | 'lost' | 'success';

/** Stateful marked protocol fixture, not an evaluator, authorization engine, database or connector. */
export async function installSimulatedProofFinalizationBff(
  page: Page,
): Promise<{
  readonly setEnabled: (enabled: boolean) => void;
  readonly setNextResult: (result: CommandResult) => void;
  readonly commands: () => readonly Intent[];
  readonly holdCommand: () => void;
  readonly releaseCommand: () => void;
  readonly holdRead: () => void;
  readonly releaseRead: () => void;
  readonly denyReads: () => void;
}> {
  const base = await installSimulatedRunSupervisionBff(page);
  const commands: Intent[] = [];
  let enabled = false;
  let changed = false;
  let denied = false;
  let next: CommandResult = 'success';
  let receipt: RunProofFinalizationReceipt | undefined;
  let acceptedIntent: Intent | undefined;
  let commandWait: Promise<void> | undefined;
  let readWait: Promise<void> | undefined;
  let releaseCommand: (() => void) | undefined;
  let releaseRead: (() => void) | undefined;
  function snapshot(): AssignedRunConsole {
    const run = simulatedRunVerificationSnapshot(
      receipt === undefined ? 'matching' : 'accepted',
    );
    const proof = run.outcomeVerification;
    if (
      proof === undefined ||
      (proof.status !== 'MATCHING' && proof.status !== 'ACCEPTED')
    )
      throw new Error('Synthetic proof fixture requires evidence');
    const evidence = {
      ...proof.evidence,
      factId: changed
        ? 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
        : proof.evidence.factId,
      streamVersion: changed ? 8 : 6,
      source: {
        ...proof.evidence.source,
        streamVersion: changed ? 7 : 5,
        observationId: changed
          ? 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
          : proof.evidence.source.observationId,
      },
    };
    return {
      ...run,
      supervisionRevision: 0,
      handoverSupported: receipt === undefined,
      proofFinalizationSupported: enabled,
      outcomeVerification:
        proof.status === 'ACCEPTED'
          ? {
              ...proof,
              caseStreamVersion: changed ? 8 : 6,
              evidence,
              acceptance: {
                ...proof.acceptance,
                caseClosureStreamVersion: changed ? 9 : 7,
              },
            }
          : { ...proof, caseStreamVersion: changed ? 8 : 6, evidence },
    };
  }
  await page.route('**/bff/v1/csrf', (route) =>
    fulfillSimulatedBff(route, {
      headerName: 'X-CSRF-TOKEN',
      token: 'synthetic-proof-csrf',
    }),
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/console',
    async (route) => {
      expect(route.request().method()).toBe('GET');
      const pending = readWait;
      readWait = undefined;
      if (pending !== undefined) await pending;
      await fulfillSimulatedBff(
        route,
        denied
          ? { type: 'urn:ergon:problem:assigned-resolution-run-not-found' }
          : snapshot(),
        denied ? 404 : 200,
      );
    },
  );
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/proof-finalizations',
    async (route) => {
      expect(new URL(route.request().url()).pathname).toBe(
        `/bff/v1${supervisorTenantPath}/resolution-runs/${assignedRunId}/proof-finalizations`,
      );
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers()['x-csrf-token']).toBe(
        'synthetic-proof-csrf',
      );
      const intent = route.request().postDataJSON() as Intent;
      expect(intent.expectedSupervisionRevision).toBe(0);
      expect(intent.expectedRunVersion).toBe(1);
      commands.push(intent);
      const result = next;
      next = 'success';
      const pending = commandWait;
      commandWait = undefined;
      if (pending !== undefined) await pending;
      if (result === 'conflict') {
        changed = true;
        await fulfillSimulatedBff(
          route,
          { type: 'urn:ergon:problem:run-proof-finalization-conflict' },
          409,
        );
        return;
      }
      if (acceptedIntent !== undefined) {
        expect(intent).toEqual(acceptedIntent);
        await fulfillSimulatedBff(route, receipt);
        return;
      }
      expect(intent.expectedCaseVersion).toBe(changed ? 8 : 6);
      acceptedIntent = intent;
      receipt = {
        commandId: intent.commandId,
        runId: assignedRunId,
        supervisionRevision: 0,
        expectedRunVersion: 1,
        assessedCaseVersion: intent.expectedCaseVersion,
        factId: intent.factId,
        observationId: intent.observationId,
        runSequence: 2,
        caseClosureStreamVersion: intent.expectedCaseVersion + 1,
        acceptedAt: '2026-09-21T09:12:00Z',
        recordedAt: '2026-09-21T09:12:01Z',
      };
      base.setActiveRunsVisible(false);
      if (result === 'lost') await route.abort('failed');
      else await fulfillSimulatedBff(route, receipt, 201);
    },
  );
  return {
    setEnabled: (value) => {
      enabled = value;
    },
    setNextResult: (value) => {
      next = value;
    },
    commands: () => commands,
    holdCommand: () => {
      commandWait = new Promise((resolve) => {
        releaseCommand = resolve;
      });
    },
    releaseCommand: () => {
      if (!releaseCommand) throw new Error('No held command');
      releaseCommand();
      releaseCommand = undefined;
    },
    holdRead: () => {
      readWait = new Promise((resolve) => {
        releaseRead = resolve;
      });
    },
    releaseRead: () => {
      if (!releaseRead) throw new Error('No held read');
      releaseRead();
      releaseRead = undefined;
    },
    denyReads: () => {
      denied = true;
    },
  };
}
