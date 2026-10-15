import { expect, type Page } from '@playwright/test';
import type { PinnedRunEvidence } from '@ergon/run-supervision-data-access-web';
import { fulfillSimulatedBff } from './simulated-bff-response';
import {
  installSimulatedRunSupervisionBff,
  simulatedRunSupervisionSnapshot as snapshot,
  supervisorTenantPath,
  assignedRunId,
} from './simulated-run-supervision-bff';

type EvidenceMode =
  'legacy' | 'empty' | 'populated' | 'truncated' | 'malformed' | 'denied';
/** Deliberately untrusted long source text; assertions establish literal rendering rather than executing markup. */
export const syntheticEvidenceText =
  '<img src=x onerror=alert(1)> SOURCE_IS_UNTRUSTED\n' +
  'Connector report for a synthetic account; this is not an instruction or independent verification. '.repeat(
    35,
  ) +
  '\n' +
  'unbroken'.repeat(65);

function evidence(mode: EvidenceMode): PinnedRunEvidence {
  const count = mode === 'empty' ? 0 : mode === 'truncated' ? 100 : 2;
  return {
    caseId: snapshot.caseId,
    caseStreamVersion: mode === 'truncated' ? 203 : 6,
    truncated: mode === 'truncated',
    facts: Array.from({ length: count }, (_, index) => ({
      factId: `aaaaaaaa-aaaa-4aaa-8aaa-${(index + 1).toString(16).padStart(12, '0')}`,
      streamVersion: index * 2 + 3,
      property: 'account.access.state',
      accountReference: 'synthetic-account',
      value: index % 2 === 0 ? 'LOCKED' : 'ACTIVE',
      boundAt: '2026-10-15T08:00:02Z',
      recordedAt: '2026-10-15T08:00:03Z',
      source: {
        observationId: `bbbbbbbb-bbbb-4bbb-8bbb-${(index + 1).toString(16).padStart(12, '0')}`,
        streamVersion: index * 2 + 2,
        originType: 'CONNECTOR',
        provider: 'synthetic-identity',
        reference: 'synthetic-account',
        content:
          index === 0
            ? syntheticEvidenceText
            : `Synthetic historical report ${index + 1}`,
        observedAt: '2026-10-15T08:00:00Z',
        recordedAt: '2026-10-15T08:00:01Z',
      },
    })),
  };
}

/** Marked browser-only comparisons. Neither source filtering nor real authority is implemented by these fixtures. */
export async function installSimulatedRunEvidenceBff(page: Page): Promise<{
  readonly setMode: (mode: EvidenceMode) => void;
  readonly holdNextRead: () => void;
  readonly releaseRead: () => void;
  readonly reads: () => number;
  readonly commands: () => number;
}> {
  const base = await installSimulatedRunSupervisionBff(page);
  let mode: EvidenceMode = 'legacy';
  let reads = 0;
  let pending: Promise<void> | undefined;
  let release: (() => void) | undefined;
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/console',
    async (route) => {
      expect(route.request().method()).toBe('GET');
      expect(new URL(route.request().url()).pathname).toBe(
        `/bff/v1${supervisorTenantPath}/resolution-runs/${assignedRunId}/console`,
      );
      reads++;
      const wait = pending;
      pending = undefined;
      if (wait !== undefined) await wait;
      if (mode === 'denied') {
        await fulfillSimulatedBff(
          route,
          {
            type: 'urn:ergon:problem:assigned-resolution-run-not-found',
            title: 'Assigned resolution run not found',
            status: 404,
          },
          404,
        );
        return;
      }
      const pinned = evidence(mode);
      await fulfillSimulatedBff(route, {
        ...snapshot,
        caseEvidenceStreamVersion: pinned.caseStreamVersion,
        ...(mode === 'legacy'
          ? {}
          : {
              pinnedEvidence:
                mode === 'malformed'
                  ? { ...pinned, caseId: assignedRunId }
                  : pinned,
            }),
      });
    },
  );
  return {
    setMode: (next) => {
      mode = next;
    },
    reads: () => reads,
    commands: base.commands,
    holdNextRead: () => {
      if (release !== undefined)
        throw new Error('A synthetic evidence read is already held.');
      pending = new Promise<void>((resolve) => {
        release = resolve;
      });
    },
    releaseRead: () => {
      if (release === undefined)
        throw new Error('No synthetic evidence read is held.');
      release();
      release = undefined;
    },
  };
}
