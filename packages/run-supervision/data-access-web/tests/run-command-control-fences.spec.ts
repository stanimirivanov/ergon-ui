import { describe, expect, it, vi } from 'vitest';
import { createRunSupervisionClient, type RunControlFence } from '../src';
import { retryCommand } from './run-retry-fixtures';
import { escalationCommand } from './run-escalation-fixtures';
import { cancellationCommand } from './run-cancellation-fixtures';
import { TENANT_ID, RUN_ID } from './run-supervision-fixtures';

const callerExtras = { sessionBinding: 'PRIVATE' };
const base = {
  ...callerExtras,
  tenantId: TENANT_ID,
  runId: RUN_ID,
  commandId: '77777777-7777-4777-8777-777777777777',
  expectedSupervisionRevision: 3,
};
const requestId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const decisionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
type Client = ReturnType<typeof createRunSupervisionClient>;
type Path = {
  readonly name: string;
  readonly submit: (
    client: Client,
    fence: RunControlFence,
    signal: AbortSignal,
  ) => Promise<unknown>;
};
const paths: readonly Path[] = [
  {
    name: 'handover',
    submit: (c, control, s) =>
      c.handoverSupervisor(
        { ...base, control, supervisorActorId: requestId },
        s,
      ),
  },
  {
    name: 'approval',
    submit: (c, control, s) =>
      c.decideApproval({ ...base, control, requestId, outcome: 'APPROVED' }, s),
  },
  {
    name: 'proof',
    submit: (c, control, s) =>
      c.finalizeProof(
        {
          ...base,
          control,
          expectedRunVersion: 1,
          expectedCaseVersion: 6,
          factId: requestId,
          observationId: decisionId,
        },
        s,
      ),
  },
  {
    name: 'execution',
    submit: (c, control, s) =>
      c.submitExecution(
        {
          ...base,
          control,
          expectedRunVersion: 0,
          kind: 'execute',
          requestId,
          decisionId,
        },
        s,
      ),
  },
  {
    name: 'additional execution recovery',
    submit: (c, control, s) =>
      c.submitExecution(
        {
          ...base,
          control,
          expectedRunVersion: 0,
          kind: 'resume',
          attemptId: requestId,
        },
        s,
      ),
  },
  {
    name: 'retry',
    submit: (c, control, s) =>
      c.retryRun({ ...retryCommand, ...callerExtras, control }, s),
  },
  {
    name: 'escalation',
    submit: (c, control, s) =>
      c.escalateRun({ ...escalationCommand, ...callerExtras, control }, s),
  },
  {
    name: 'cancellation',
    submit: (c, control, s) =>
      c.cancelRun({ ...cancellationCommand, ...callerExtras, control }, s),
  },
];

describe('all effect-bearing browser command fences', () => {
  it.each(paths)(
    '$name validates and sends only the original non-secret fence, mapping a definite conflict without automatic replay',
    async ({ submit }) => {
      const control = {
        leaseId: requestId,
        revision: 4,
        holderId: 'PRIVATE',
        cookie: 'PRIVATE',
      };
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ headerName: 'X-CSRF-TOKEN', token: 'synthetic' }),
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              type: 'urn:ergon:problem:run-control-conflict',
              detail: 'PRIVATE',
            }),
            { status: 409 },
          ),
        );
      const result = await submit(
        createRunSupervisionClient({ fetch }),
        control,
        new AbortController().signal,
      );
      expect(result).toEqual({
        ok: false,
        error: { kind: 'control-conflict' },
      });
      expect(fetch).toHaveBeenCalledTimes(2);
      const body = String(fetch.mock.calls[1]?.[1]?.body);
      expect(JSON.parse(body).control).toEqual({
        leaseId: requestId,
        revision: 4,
      });
      expect(body).not.toContain('PRIVATE');
    },
  );
  it.each(paths)(
    '$name rejects an invalid acquisition fence before CSRF or POST',
    async ({ submit }) => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const result = await submit(
        createRunSupervisionClient({ fetch }),
        { leaseId: requestId, revision: 0 },
        new AbortController().signal,
      );
      expect(result).toMatchObject({ ok: false });
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});
