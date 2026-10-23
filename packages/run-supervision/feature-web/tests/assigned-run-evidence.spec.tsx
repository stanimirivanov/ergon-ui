import { withDisabledRunControl } from './disabled-run-control';
import { configureStore } from '@reduxjs/toolkit';
import {
  runSupervisionApi,
  type RunSupervisionClient,
  type PinnedRunEvidence,
  type AssignedRunConsoleResult,
} from '@ergon/run-supervision-data-access-web';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { StrictMode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssignedRunWorkspace } from '../src';
import { AssignedRunEvidence } from '../src/assigned-run-evidence';
import { AssignedRunVerification } from '../src/assigned-run-verification';
import { matchingVerification, verifyingRun } from './run-verification-fixture';
import {
  assignedPage,
  assignedRunConsole,
  RUN_ID,
  TENANT_ID,
} from './assigned-run-fixtures';

const evidence: PinnedRunEvidence = {
  caseId: assignedRunConsole.caseId,
  caseStreamVersion: assignedRunConsole.caseEvidenceStreamVersion,
  truncated: false,
  facts: [
    {
      factId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      streamVersion: 3,
      property: 'account.access.state',
      value: 'LOCKED',
      accountReference: 'synthetic-account',
      boundAt: '2026-10-15T08:00:02Z',
      recordedAt: '2026-10-15T08:00:03Z',
      source: {
        observationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        streamVersion: 2,
        originType: 'CONNECTOR',
        provider: 'synthetic-identity',
        reference: 'synthetic-account',
        content: '<img src=x onerror=alert(1)>PRIVATE_SOURCE',
        observedAt: '2026-10-15T08:00:00Z',
        recordedAt: '2026-10-15T08:00:01Z',
      },
    },
  ],
};
const stores: ReturnType<typeof createStore>[] = [];
const originalShow = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
);
const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'close',
);
beforeEach(() => {
  // Only lifecycle is doubled; Chromium proves actual modality, inertness and keyboard behavior.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
});
afterEach(() => {
  cleanup();
  for (const store of stores)
    store.dispatch(runSupervisionApi.util.resetApiState());
  stores.length = 0;
  for (const [name, original] of [
    ['showModal', originalShow],
    ['close', originalClose],
  ] as const) {
    if (original === undefined)
      Reflect.deleteProperty(HTMLDialogElement.prototype, name);
    else Object.defineProperty(HTMLDialogElement.prototype, name, original);
  }
  vi.restoreAllMocks();
});

describe('pinned evidence inspection', () => {
  it('presents exact source-to-binding-to-pin attribution without a latest-value or proof claim', () => {
    render(<AssignedRunEvidence evidence={evidence} />);
    expect(
      screen.getByRole('note', { name: 'Pinned binding attribution' })
        .textContent,
    ).toBe('Source #2 → binding #3 → pinned prefix #3');
    expect(
      screen.getByText('Historical inputs · not outcome proof'),
    ).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Source provider')).toBeTruthy();
    expect(
      screen.queryByRole('region', { name: 'Durable acceptance record' }),
    ).toBeNull();
  });

  it('renders proof text literally, restores focus and retires replaced proof inspection permanently', () => {
    const view = render(
      <StrictMode>
        <AssignedRunVerification run={verifyingRun} />
      </StrictMode>,
    );
    const trigger = screen.getByRole('button', {
      name: 'Inspect verification evidence',
    });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog').textContent).toContain(
      'PRIVATE_PROOF_SOURCE',
    );
    expect(screen.getByRole('dialog').querySelector('img')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Close verification inspector' }),
    );
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    view.rerender(
      <StrictMode>
        <AssignedRunVerification
          run={{
            ...verifyingRun,
            outcomeVerification: {
              ...matchingVerification,
              status: 'PENDING',
              reason: 'ELIGIBLE_EVIDENCE_MISSING',
              evidence: null,
            },
          }}
        />
      </StrictMode>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    view.rerender(
      <StrictMode>
        <AssignedRunVerification run={verifyingRun} />
      </StrictMode>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('distinguishes old-server omission and an empty supported snapshot', () => {
    const view = render(<AssignedRunEvidence evidence={undefined} />);
    expect(
      screen.getByText(/Unsupported is not an empty snapshot/),
    ).toBeTruthy();
    view.rerender(
      <StrictMode>
        <AssignedRunEvidence evidence={{ ...evidence, facts: [] }} />
      </StrictMode>,
    );
    expect(
      screen.getByText(/No supported account-access bindings/),
    ).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('renders source text literally, restores focus and permanently retires removed binding inspection', () => {
    const view = render(
      <StrictMode>
        <AssignedRunEvidence evidence={evidence} />
      </StrictMode>,
    );
    const trigger = screen.getByRole('button', {
      name: 'Inspect source for binding 3',
    });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog').textContent).toContain(
      evidence.facts[0]?.source.content,
    );
    expect(screen.getByRole('dialog').querySelector('img')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Close source inspector' }),
    );
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    view.rerender(
      <StrictMode>
        <AssignedRunEvidence evidence={{ ...evidence, facts: [] }} />
      </StrictMode>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    view.rerender(
      <StrictMode>
        <AssignedRunEvidence evidence={evidence} />
      </StrictMode>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('shows incomplete-history semantics without inventing confidence or a latest value', () => {
    render(<AssignedRunEvidence evidence={{ ...evidence, truncated: true }} />);
    expect(screen.getByRole('status').textContent).toContain(
      'do not infer a latest value',
    );
    expect(screen.getByText(/not assessed contradictions/)).toBeTruthy();
  });
  it.each(['pinned', 'proof'] as const)(
    'withdraws open %s inspection during held revalidation and keeps it hidden after access denial',
    async (kind) => {
      let resolve: (value: AssignedRunConsoleResult) => void = () => undefined;
      const held = new Promise<AssignedRunConsoleResult>((complete) => {
        resolve = complete;
      });
      const read = vi
        .fn<RunSupervisionClient['getConsole']>()
        .mockResolvedValueOnce({
          ok: true,
          console: { ...verifyingRun, pinnedEvidence: evidence },
        })
        .mockReturnValue(held);
      const client: RunSupervisionClient = {
        listAssigned: async () => ({ ok: true, page: assignedPage() }),
        getConsole: read,
      };
      const store = createStore(client);
      stores.push(store);
      render(
        <StrictMode>
          <Provider store={store}>
            <AssignedRunWorkspace
              tenantId={TENANT_ID}
              signInHref="/bff/login"
              renderWorkspace={({ content, toolbar }) => (
                <>
                  {toolbar}
                  <main>{content}</main>
                </>
              )}
            />
          </Provider>
        </StrictMode>,
      );
      fireEvent.click(
        await screen.findByRole('button', { name: `Inspect run ${RUN_ID}` }),
      );
      const caseEvidence = await screen.findByRole('region', {
        name: 'Case evidence',
      });
      await within(caseEvidence).findByRole('button', {
        name: 'Inspect source for binding 3',
      });
      expect(
        caseEvidence
          .closest('[data-pane-slot]')
          ?.getAttribute('data-pane-slot'),
      ).toBe('leading');
      expect(
        within(caseEvidence).getByRole('region', {
          name: 'Pinned case evidence',
        }),
      ).toBeTruthy();
      const proof = screen.getByRole('region', { name: 'Outcome proof' });
      expect(
        within(proof).queryByRole('region', { name: 'Pinned case evidence' }),
      ).toBeNull();
      expect(
        within(proof).queryByRole('region', { name: 'Case context' }),
      ).toBeNull();
      const evidenceHeading = within(caseEvidence).getByRole('heading', {
        name: 'Case evidence',
      });
      fireEvent.click(
        await screen.findByRole('button', {
          name:
            kind === 'pinned'
              ? 'Inspect source for binding 3'
              : 'Inspect verification evidence',
        }),
      );
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByRole('dialog').textContent).toContain(
        kind === 'proof' ? 'PRIVATE_PROOF_SOURCE' : 'PRIVATE_SOURCE',
      );
      // Cache revalidation represents authority withdrawal while a modal is open.
      act(() => {
        store.dispatch(
          runSupervisionApi.util.invalidateTags([
            { type: 'RunDetail', id: `${TENANT_ID}:${RUN_ID}` },
          ]),
        );
      });
      await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
      // Background invalidation starts in RTK; assert withdrawal in its committed
      // render, not synchronous hide-before-I/O promised only by explicit workflows.
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(screen.getByRole('heading', { name: 'Case evidence' })).toBe(
        evidenceHeading,
      );
      expect(
        within(caseEvidence).queryByRole('region', { name: 'Case context' }),
      ).toBeNull();
      expect(
        within(caseEvidence).getByText(
          /withheld until a successful current run read/,
        ),
      ).toBeTruthy();
      expect(screen.queryByText(/PRIVATE_PROOF_SOURCE/)).toBeNull();
      expect(
        screen.queryByText(evidence.facts[0]?.source.content ?? ''),
      ).toBeNull();
      await act(async () => {
        resolve({ ok: false, error: { kind: 'not-found' } });
      });
      expect(
        await screen.findByRole('heading', {
          name: 'Run context is unavailable',
        }),
      ).toBeTruthy();
      expect(screen.queryByText(/PRIVATE_PROOF_SOURCE/)).toBeNull();
      expect(
        screen.queryByText(evidence.facts[0]?.source.content ?? ''),
      ).toBeNull();
    },
  );
});

function createStore(client: RunSupervisionClient) {
  return configureStore({
    reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
    middleware: (defaults) =>
      defaults({
        thunk: {
          extraArgument: { runSupervision: withDisabledRunControl(client) },
        },
      }).concat(runSupervisionApi.middleware),
  });
}
