import type {
  AssignedRunConsoleResult,
  RunPinnedReadiness,
  RunPinnedReadinessClient,
  RunPinnedReadinessResult,
  RunControlClient,
} from '@ergon/run-supervision-data-access-web';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RUN_ID } from './assigned-run-fixtures';
import {
  deferred,
  failedConsole,
  installRetryTestEnvironment,
  renderRetryWorkspace,
  successfulRetryClient,
} from './run-retry-fixtures';

installRetryTestEnvironment();
const value: RunPinnedReadiness = {
  runId: RUN_ID,
  caseId: failedConsole.caseId,
  caseStreamVersion: failedConsole.caseEvidenceStreamVersion,
  supervisionRevision: 7,
  contractKey: failedConsole.contractKey,
  contractRevision: failedConsole.contractRevision,
  observedAt: '2026-10-21T08:00:00Z',
  evaluator: 'ergon.dev/evaluation/pinned-readiness/v1',
  status: 'READY',
  missingEvidence: [],
  applicability: {
    fact: 'account.access.state',
    expectedValue: 'LOCKED',
    actualValue: 'LOCKED',
  },
  selectedEvidence: [
    {
      factId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      streamVersion: failedConsole.caseEvidenceStreamVersion,
      property: 'account.access.state',
      accountReference: 'test-account',
      value: 'LOCKED',
      boundAt: '2026-10-21T08:00:00Z',
      recordedAt: '2026-10-21T07:59:00Z',
      source: {
        observationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        streamVersion: failedConsole.caseEvidenceStreamVersion - 1,
        originType: 'CONNECTOR',
        provider: 'identity-stub',
        reference: 'test-account',
        content: 'SELECTED <b>INERT</b>',
        observedAt: '2026-10-21T08:01:00Z',
        recordedAt: '2026-10-21T07:58:00Z',
      },
    },
  ],
};
async function open(): Promise<void> {
  fireEvent.click(
    await screen.findByRole('button', { name: 'Inspect run ' + RUN_ID }),
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Inspect pinned readiness' }),
  );
}

describe('exact pinned readiness inspection', () => {
  it('reads only on demand without control, returns focus and obtains a distinct reopening', async () => {
    const read = vi
      .fn<RunPinnedReadinessClient['getPinnedReadiness']>()
      .mockResolvedValue({ ok: true, value });
    const change = vi.fn<RunControlClient['changeRunControl']>();
    renderRetryWorkspace({
      ...successfulRetryClient(),
      getPinnedReadiness: read,
      changeRunControl: change,
      getRunControl: async () => ({
        ok: true,
        value: {
          status: 'AVAILABLE',
          supervisionRevision: 7,
          observedAt: value.observedAt,
        },
      }),
    });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Inspect run ' + RUN_ID }),
    );
    const trigger = await screen.findByRole('button', {
      name: 'Inspect pinned readiness',
    });
    expect(read).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    await screen.findByText('Ready at pinned boundary');
    expect(
      screen.getByText('SELECTED <b>INERT</b>').querySelector('b'),
    ).toBeNull();
    expect(screen.getByText(/READY does not authorize execution/)).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Review fresh-run retry' }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Close pinned readiness' }),
    );
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    await screen.findByText('Ready at pinned boundary');
    expect(read).toHaveBeenCalledTimes(2);
    expect(change).not.toHaveBeenCalled();
  });
  it('keeps missing precedence and mismatch distinct without treating missing evidence as unavailable', async () => {
    const missing: RunPinnedReadiness = {
      ...value,
      status: 'WAITING_FOR_EVIDENCE',
      applicability: null,
      missingEvidence: ['z.state', 'a.state'],
    };
    const mismatch: RunPinnedReadiness = {
      ...value,
      status: 'NOT_APPLICABLE',
      applicability: {
        fact: 'account.access.state',
        expectedValue: 'locked',
        actualValue: 'LOCKED',
      },
    };
    const read = vi
      .fn<RunPinnedReadinessClient['getPinnedReadiness']>()
      .mockResolvedValueOnce({ ok: true, value: missing })
      .mockResolvedValueOnce({ ok: true, value: mismatch });
    renderRetryWorkspace({
      ...successfulRetryClient(),
      getPinnedReadiness: read,
    });
    await open();
    await screen.findByText('Waiting for pinned evidence');
    expect(
      screen.queryByRole('region', { name: 'Assessed applicability' }),
    ).toBeNull();
    expect(
      screen
        .getAllByRole('listitem')
        .filter((item) => /z.state|a.state/.test(item.textContent ?? ''))
        .map((item) => item.textContent),
    ).toEqual(['z.state', 'a.state']);
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck pinned readiness' }),
    );
    await screen.findByText('Not applicable at pinned boundary');
    expect(screen.getByText('locked')).toBeTruthy();
  });
  it('hides selected source before held recheck then withdraws the full workspace on denial', async () => {
    const held = deferred<RunPinnedReadinessResult>();
    const read = vi
      .fn<RunPinnedReadinessClient['getPinnedReadiness']>()
      .mockResolvedValueOnce({ ok: true, value })
      .mockImplementationOnce(() => held.promise)
      .mockResolvedValueOnce({ ok: true, value });
    renderRetryWorkspace({
      ...successfulRetryClient(),
      getPinnedReadiness: read,
    });
    await open();
    await screen.findByText('SELECTED <b>INERT</b>');
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck pinned readiness' }),
    );
    expect(screen.queryByText('SELECTED <b>INERT</b>')).toBeNull();
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    await act(async () =>
      held.resolve({ ok: false, error: { kind: 'not-found' } }),
    );
    await screen.findByText('Pinned readiness unavailable');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('PRIVATE_FAILED_POLICY')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Inspect run ' + RUN_ID }),
    ).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Resolution run' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Recheck run access' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Inspect pinned readiness' }),
    );
    await screen.findByText('Ready at pinned boundary');
    expect(read).toHaveBeenCalledTimes(3);
  });
  it('keeps unsupported local, without inventing an empty assessment or internal fallback', async () => {
    const read = vi
      .fn<RunPinnedReadinessClient['getPinnedReadiness']>()
      .mockResolvedValue({
        ok: false,
        error: { kind: 'readiness-unsupported' },
      });
    renderRetryWorkspace({
      ...successfulRetryClient(),
      getPinnedReadiness: read,
    });
    await open();
    await screen.findByText(/No assessment has been returned/);
    expect(screen.queryByText('Waiting for pinned evidence')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Recheck selected run' }),
    ).toBeTruthy();
    expect(read).toHaveBeenCalledTimes(1);
  });
  it('retires the open private inspector with parent revalidation', async () => {
    const held = deferred<AssignedRunConsoleResult>();
    const base = successfulRetryClient();
    const getConsole = vi
      .fn<typeof base.getConsole>()
      .mockResolvedValueOnce({ ok: true, console: failedConsole })
      .mockImplementationOnce(() => held.promise);
    const read = vi
      .fn<RunPinnedReadinessClient['getPinnedReadiness']>()
      .mockResolvedValue({ ok: true, value });
    renderRetryWorkspace({ ...base, getConsole, getPinnedReadiness: read });
    await open();
    await screen.findByText('Ready at pinned boundary');
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck selected run' }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('SELECTED <b>INERT</b>')).toBeNull();
    await act(async () =>
      held.resolve({ ok: false, error: { kind: 'not-found' } }),
    );
    expect(read).toHaveBeenCalledTimes(1);
  });
});
