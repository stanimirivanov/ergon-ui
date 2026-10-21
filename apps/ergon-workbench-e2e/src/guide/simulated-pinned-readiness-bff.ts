import { expect, type Page } from '@playwright/test';
import type { PinnedRunEvidence } from '@ergon/run-supervision-data-access-web';
import { fulfillSimulatedBff } from './simulated-bff-response';
import {
  installSimulatedRunSupervisionBff,
  assignedRunId,
  assignedCaseId,
} from './simulated-run-supervision-bff';
import { syntheticEvidenceText } from './simulated-run-evidence-bff';

type Mode =
  | 'ready'
  | 'missing'
  | 'partial'
  | 'mismatch'
  | 'bounded'
  | 'denied'
  | 'unsupported'
  | 'malformed';
const history: PinnedRunEvidence = {
  caseId: assignedCaseId,
  caseStreamVersion: 203,
  truncated: true,
  facts: Array.from({ length: 100 }, (_, i) => ({
    factId: `aaaaaaaa-aaaa-4aaa-8aaa-${(i + 1).toString(16).padStart(12, '0')}`,
    streamVersion: i * 2 + 3,
    property: 'account.access.state',
    accountReference: 'synthetic-account',
    value: 'ACTIVE',
    boundAt: '2026-10-21T08:01:00Z',
    recordedAt: '2026-10-21T08:00:00Z',
    source: {
      observationId: `bbbbbbbb-bbbb-4bbb-8bbb-${(i + 1).toString(16).padStart(12, '0')}`,
      streamVersion: i * 2 + 2,
      originType: 'CONNECTOR',
      provider: 'synthetic-identity',
      reference: 'synthetic-account',
      content: 'Earlier historical report ' + (i + 1),
      observedAt: '2026-10-21T08:02:00Z',
      recordedAt: '2026-10-21T07:59:00Z',
    },
  })),
};

/** Marked producer-owned comparisons, not real changes to immutable inputs or evaluator results. Prepared swaps demonstrate independent examples and failure handling, never authorization or persistence. */
export async function installSimulatedPinnedReadinessBff(page: Page): Promise<
  Awaited<ReturnType<typeof installSimulatedRunSupervisionBff>> & {
    setReadiness: (mode: Mode) => void;
    readinessReads: () => number;
    completedReadinessReads: () => number;
    holdReadiness: () => void;
    releaseReadiness: () => void;
  }
> {
  const base = await installSimulatedRunSupervisionBff(page, {
    supervisionRevision: 3,
    pinnedEvidence: history,
  });
  let mode: Mode = 'ready',
    reads = 0,
    completed = 0,
    held: Promise<void> | undefined,
    release: (() => void) | undefined;
  await page.route(
    '**/bff/v1/tenants/*/resolution-runs/*/pinned-readiness',
    async (route) => {
      expect(route.request().method()).toBe('GET');
      expect(new URL(route.request().url()).search).toBe('');
      reads++;
      const selected = mode,
        wait = held;
      held = undefined;
      try {
        if (wait) await wait;
        if (selected === 'denied')
          return await fulfillSimulatedBff(
            route,
            { type: 'urn:ergon:problem:assigned-resolution-run-not-found' },
            404,
          );
        if (selected === 'unsupported')
          return await fulfillSimulatedBff(route, { type: 'about:blank' }, 404);
        const missing = ['missing', 'partial', 'bounded'].includes(selected);
        return await fulfillSimulatedBff(route, {
          runId: assignedRunId,
          caseId: assignedCaseId,
          caseStreamVersion: selected === 'malformed' ? 204 : 203,
          supervisionRevision: 3,
          observedAt: '2026-10-21T08:00:00.123456789Z',
          contractKey: 'access-restoration',
          contractRevision: 2,
          evaluator: 'ergon.dev/evaluation/pinned-readiness/v1',
          status: missing
            ? 'WAITING_FOR_EVIDENCE'
            : selected === 'mismatch'
              ? 'NOT_APPLICABLE'
              : 'READY',
          missingEvidence:
            selected === 'missing'
              ? ['account.owner']
              : selected === 'bounded'
                ? Array.from({ length: 50 }, (_, i) => 'missing.fact-' + i)
                : selected === 'partial'
                  ? ['z.state', 'a.state']
                  : [],
          applicability: missing
            ? null
            : {
                fact: 'account.access.state',
                expectedValue: selected === 'mismatch' ? 'locked' : 'LOCKED',
                actualValue: 'LOCKED',
              },
          selectedEvidence:
            selected === 'missing'
              ? []
              : [
                  {
                    factId: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000065',
                    streamVersion: 203,
                    property: 'account.access.state',
                    accountReference: 'synthetic-account',
                    value: 'LOCKED',
                    boundAt: '2026-10-21T08:01:00Z',
                    recordedAt: '2026-10-21T08:00:00Z',
                    source: {
                      observationId: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000065',
                      streamVersion: 202,
                      originType: 'CONNECTOR',
                      provider: 'synthetic-identity',
                      reference: 'synthetic-account',
                      content: syntheticEvidenceText,
                      observedAt: '2026-10-21T08:02:00Z',
                      recordedAt: '2026-10-21T07:59:00Z',
                    },
                  },
                ],
        });
      } finally {
        completed++;
      }
    },
  );
  return {
    ...base,
    setReadiness: (next) => {
      mode = next;
    },
    readinessReads: () => reads,
    completedReadinessReads: () => completed,
    holdReadiness: () => {
      if (release) throw new Error('Readiness already held');
      held = new Promise((resolve) => {
        release = resolve;
      });
    },
    releaseReadiness: () => {
      if (!release) throw new Error('No held readiness');
      release();
      release = undefined;
    },
  };
}
