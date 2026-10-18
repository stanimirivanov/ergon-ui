import { describe, expect, it, vi } from 'vitest';
import {
  createRunSupervisionClient,
  normalizeRunCancellationFailure,
} from '../src';
import {
  decodeCancellationCommand,
  decodeCancellationReceipt,
  decodeCancellationReview,
} from '../src/bff/run-cancellation-schemas';
import {
  decodeAssignedRunConsole,
  decodeAssignedRunPage,
} from '../src/bff/run-supervision-schemas';
import {
  cancellationCommand as command,
  cancellationQuery as query,
  cancellationReceipt as receipt,
  cancellationReview as review,
} from './run-cancellation-fixtures';
import {
  jsonResponse,
  validConsole,
  validExecution,
} from './run-supervision-fixtures';
const signal = (): AbortSignal => new AbortController().signal;
const csrf = { headerName: 'X-CSRF-TOKEN', token: 'ephemeral' };

describe('untouched cancellation protocol', () => {
  it.each([200, 201])(
    'binds %s acknowledgements and strips caller/private extras',
    async (status) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(jsonResponse(csrf))
        .mockResolvedValueOnce(
          jsonResponse({ ...receipt, actorId: 'PRIVATE' }, status),
        );
      const input = { ...command, actorId: 'PRIVATE' };
      expect(
        await createRunSupervisionClient({ fetch }).cancelRun(input, signal()),
      ).toEqual({ ok: true, receipt });
      expect(fetch.mock.calls[1]?.[0]).toContain('/cancellation-commands');
      expect(fetch.mock.calls[1]?.[1]).toMatchObject({
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'X-CSRF-TOKEN': 'ephemeral' },
      });
      expect(JSON.parse(String(fetch.mock.calls[1]?.[1]?.body))).toEqual({
        commandId: command.commandId,
        expectedSupervisionRevision: 3,
        expectedRunVersion: 0,
      });
    },
  );
  it('retries only transient reads, never uncertain commands; explicit replay keeps identical intent', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new Error('PRIVATE'))
      .mockResolvedValueOnce(jsonResponse(review))
      .mockResolvedValueOnce(jsonResponse(csrf))
      .mockRejectedValueOnce(new Error('PRIVATE'))
      .mockResolvedValueOnce(jsonResponse(csrf))
      .mockResolvedValueOnce(jsonResponse(receipt));
    const client = createRunSupervisionClient({ fetch });
    expect(await client.getCancellationReview(query, signal())).toEqual({
      ok: true,
      review,
    });
    expect(await client.cancelRun(command, signal())).toEqual({
      ok: false,
      error: { kind: 'transport' },
    });
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(await client.cancelRun(command, signal())).toEqual({
      ok: true,
      receipt,
    });
    expect(fetch.mock.calls[3]?.[1]?.body).toBe(fetch.mock.calls[5]?.[1]?.body);
  });
  it.each([
    [409, 'run-cancellation-conflict', 'cancellation-conflict'],
    [503, 'run-cancellation-disabled', 'cancellation-disabled'],
    [503, 'run-cancellation-unavailable', 'cancellation-unavailable'],
    [400, 'invalid-run-cancellation', 'invalid-cancellation'],
    [404, 'assigned-resolution-run-not-found', 'not-found'],
    [404, 'route-not-found', 'cancellation-unsupported'],
    [403, 'invalid-browser-csrf-token', 'csrf-rejected'],
  ])('maps %s %s without raw problem details', async (status, type, kind) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        jsonResponse(
          { type: `urn:ergon:problem:${type}`, detail: 'PRIVATE' },
          Number(status),
        ),
      );
    expect(
      await createRunSupervisionClient({ fetch }).getCancellationReview(
        query,
        signal(),
      ),
    ).toEqual({ ok: false, error: { kind } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([
    { ...review, canCancel: false },
    { ...review, supported: false },
    { ...review, runVersion: 1 },
    { ...review, reason: 'AUTHORIZATION_OR_EXECUTION_RECORDED' },
    { ...review, observedAt: '2026-02-30T08:00:00Z' },
  ])('rejects inconsistent review %j', (value) =>
    expect(decodeCancellationReview(value)).toBeUndefined(),
  );
  it.each([
    'DISABLED',
    'RUN_NOT_UNTOUCHED',
    'AUTHORIZATION_OR_EXECUTION_RECORDED',
  ] as const)('decodes non-authorizing %s', (reason) =>
    expect(
      decodeCancellationReview({
        ...review,
        supported: reason !== 'DISABLED',
        canCancel: false,
        reason,
      }),
    ).toBeDefined(),
  );
  it.each([
    { ...receipt, commandId: query.tenantId },
    { ...receipt, runId: query.tenantId },
    { ...receipt, supervisionRevision: 4 },
    { ...receipt, expectedRunVersion: 1 },
    { ...receipt, reason: 'OTHER' },
    { ...receipt, cancelledAt: 'not-time' },
  ])('rejects unrelated receipt %j', (value) =>
    expect(decodeCancellationReceipt(value, command)).toBeUndefined(),
  );
  it('rejects invalid versions before acquisition and distinguishes safe failures from defects', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    expect(
      decodeCancellationCommand({
        ...command,
        expectedRunVersion: 1,
      } as unknown as typeof command),
    ).toBeUndefined();
    const controller = new AbortController();
    controller.abort();
    expect(
      await createRunSupervisionClient({ fetch }).cancelRun(
        command,
        controller.signal,
      ),
    ).toEqual({ ok: false, error: { kind: 'request-cancelled' } });
    expect(fetch).not.toHaveBeenCalled();
    expect(
      normalizeRunCancellationFailure({
        kind: 'cancellation-conflict',
        cause: 'PRIVATE',
      }),
    ).toEqual({ kind: 'cancellation-conflict' });
    expect(normalizeRunCancellationFailure(new Error('PRIVATE'))).toEqual({
      kind: 'unexpected-defect',
    });
  });
});

describe('cancelled Console compatibility', () => {
  const terminal = {
    ...validConsole(),
    state: 'CANCELLED',
    stateVersion: 1,
    execution: null,
    stateUpdatedAt: receipt.cancelledAt,
    transitions: [
      {
        sequence: 1,
        type: 'RUN_CANCELLED',
        fromState: 'WAITING_FOR_APPROVAL',
        toState: 'CANCELLED',
        occurredAt: receipt.cancelledAt,
        recordedAt: receipt.recordedAt,
      },
    ],
  };
  it('accepts terminal cancellation without a receipt and excludes it from active discovery', () => {
    expect(decodeAssignedRunConsole(terminal, query)).toEqual(terminal);
    expect(
      decodeAssignedRunPage({ entries: [terminal], nextCursor: null }, query),
    ).toBeUndefined();
    expect(
      decodeAssignedRunConsole(
        {
          ...terminal,
          effectiveRisk: 'LOW',
          requiredApproval: 'NONE',
          transitions: [
            {
              ...terminal.transitions[0],
              fromState: 'READY_FOR_AUTHORIZATION',
            },
          ],
        },
        query,
      ),
    ).toBeDefined();
  });
  it.each([
    { ...terminal, execution: validExecution() },
    { ...terminal, stateVersion: 2 },
    { ...terminal, transitions: [] },
    {
      ...terminal,
      transitions: [{ ...terminal.transitions[0], fromState: 'VERIFYING' }],
    },
    {
      ...terminal,
      transitions: [{ ...terminal.transitions[0], toState: 'VERIFYING' }],
    },
    {
      ...terminal,
      transitions: [
        { ...terminal.transitions[0], type: 'CAPABILITY_SUCCEEDED' },
      ],
    },
  ])('rejects impossible mixed terminal projection %j', (body) =>
    expect(decodeAssignedRunConsole(body, query)).toBeUndefined(),
  );
});
