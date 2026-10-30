import { StrictMode } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, expect, it, vi } from 'vitest';
import {
  evidenceApi,
  type EvidenceClient,
} from '@ergon/evidence-data-access-web';
import type { KnowledgeTarget } from '@ergon/evidence-model';
import { EvidenceKnowledgeWorkspace } from '../src';
import { actorId, tenantId } from './fixtures';
import {
  assessment,
  anchor,
  second,
  adjudication,
  bundle,
} from './knowledge-fixtures';
afterEach(cleanup);
function setup(
  target: KnowledgeTarget | null = { kind: 'assessment', id: anchor },
  overrides: Partial<EvidenceClient> = {},
  view: 'contradictions' | 'bundles' = 'contradictions',
) {
  const client: EvidenceClient = {
    pending: vi.fn(),
    inspect: vi.fn(),
    review: vi.fn(),
    assess: vi.fn(async () => ({ ok: true as const, value: assessment })),
    adjudication: vi.fn(async () => ({
      ok: true as const,
      value: adjudication,
    })),
    adjudicate: vi.fn(async () => ({
      ok: false as const,
      error: { kind: 'transport' as const },
    })),
    bundle: vi.fn(async () => ({ ok: true as const, value: bundle })),
    publish: vi.fn(async () => ({
      ok: false as const,
      error: { kind: 'transport' as const },
    })),
    ...overrides,
  };
  const store = configureStore({
    reducer: { [evidenceApi.reducerPath]: evidenceApi.reducer },
    middleware: (d) =>
      d({ thunk: { extraArgument: { evidenceClient: client } } }).concat(
        evidenceApi.middleware,
      ),
  });
  const onOpen = vi.fn(),
    onRecheck = vi.fn();
  const rendered = render(
    <StrictMode>
      <Provider store={store}>
        <EvidenceKnowledgeWorkspace
          query={{ tenantId, actorId }}
          view={view}
          target={target}
          signInHref="/bff/login"
          onOpen={onOpen}
          onRecheck={onRecheck}
        />
      </Provider>
    </StrictMode>,
  );
  return { ...rendered, client, store, onOpen, onRecheck };
}
it('shows complete cited alternatives, conservative findings and no conflict publication without a current preference', async () => {
  const mounted = setup();
  expect(
    await screen.findByRole('heading', {
      name: 'Claim-set assessment: CONFLICT',
    }),
  ).toBeTruthy();
  expect(screen.getAllByText('😀')).toHaveLength(2);
  expect(
    screen.getByRole('heading', { name: 'Bundle publication unavailable' }),
  ).toBeTruthy();
  expect(
    screen.queryByRole('button', { name: 'Confirm bundle publication' }),
  ).toBeNull();
  expect(mounted.client.adjudicate).not.toHaveBeenCalled();
});
it('withdraws citations before I/O and preserves immutable uncertain preference with one explicit exact replay', async () => {
  const adjudicate = vi
    .fn<EvidenceClient['adjudicate']>()
    .mockImplementationOnce(async () => {
      expect(screen.queryAllByText('😀')).toHaveLength(0);
      return { ok: false as const, error: { kind: 'timeout' } };
    })
    .mockImplementationOnce(async (intent) => ({
      ok: true as const,
      value: { ...adjudication, id: intent.id, rationale: intent.rationale },
    }));
  const mounted = setup(undefined, { adjudicate });
  await screen.findByText('Complete pair findings');
  fireEvent.change(
    screen.getByRole('combobox', { name: 'Adjudication choice' }),
    { target: { value: 'PREFER_CLAIM' } },
  );
  fireEvent.change(screen.getByRole('combobox', { name: 'Preferred claim' }), {
    target: { value: anchor },
  });
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Adjudication rationale' }),
    { target: { value: 'Prefer checked source' } },
  );
  fireEvent.click(screen.getByRole('button', { name: 'Confirm adjudication' }));
  const retry = await screen.findByRole('button', {
    name: 'Retry exact command',
  });
  expect(
    screen.getByRole('heading', { name: 'Documentary command result' }),
  ).toBe(document.activeElement);
  expect(adjudicate).toHaveBeenCalledTimes(1);
  fireEvent.click(retry);
  await waitFor(() => expect(mounted.onOpen).toHaveBeenCalled());
  expect(adjudicate.mock.calls[0]?.[0]).toEqual(adjudicate.mock.calls[1]?.[0]);
  expect(adjudicate.mock.calls[0]?.[0]).toMatchObject({
    candidateIds: [anchor, second],
    expectedRevision: 2,
    selectedClaimId: anchor,
  });
});
it('publishes only the preferred claim with complete context and permits exact uncertain bundle recovery', async () => {
  const publish = vi.fn<EvidenceClient['publish']>().mockResolvedValue({
    ok: false as const,
    error: { kind: 'transport' as const },
  });
  setup({ kind: 'adjudication', id: adjudication.id }, { publish });
  await screen.findByRole('heading', { name: 'Publish exact evidence bundle' });
  expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirm bundle publication' }),
  );
  const retry = await screen.findByRole('button', {
    name: 'Retry exact command',
  });
  expect(screen.queryAllByText('😀')).toHaveLength(0);
  fireEvent.click(retry);
  await waitFor(() => expect(publish).toHaveBeenCalledTimes(2));
  expect(publish.mock.calls[0]?.[0]).toEqual(publish.mock.calls[1]?.[0]);
  expect(publish.mock.calls[0]?.[0]).toMatchObject({
    claims: [anchor],
    claimSets: [
      {
        anchorId: anchor,
        revision: 2,
        candidateIds: [anchor, second],
        adjudicationId: adjudication.id,
      },
    ],
  });
});
it('requires recheck after stale commands and never silently sends a replacement', async () => {
  const publish = vi
    .fn<EvidenceClient['publish']>()
    .mockResolvedValue({ ok: false as const, error: { kind: 'conflict' } });
  const mounted = setup(
    { kind: 'adjudication', id: adjudication.id },
    { publish },
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Confirm bundle publication' }),
  );
  expect((await screen.findByRole('alert')).textContent).toContain('Recheck');
  expect(screen.queryAllByText('😀')).toHaveLength(0);
  expect(
    screen.queryByRole('button', { name: 'Retry exact command' }),
  ).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: 'Recheck documentary evidence' }),
  );
  expect(mounted.onRecheck).toHaveBeenCalledOnce();
  expect(publish).toHaveBeenCalledOnce();
});
it('does not offer historical/deferred or unknown validity as qualifying publication', async () => {
  const mounted = setup(
    { kind: 'adjudication', id: adjudication.id },
    {
      adjudication: async () => ({
        ok: true as const,
        value: { ...adjudication, current: false },
      }),
    },
  );
  expect(
    await screen.findByText('Historical decision — candidate set has changed'),
  ).toBeTruthy();
  expect(
    screen.queryByRole('button', { name: 'Confirm bundle publication' }),
  ).toBeNull();
  mounted.unmount();
  const unknown = {
    ...assessment,
    state: 'INSUFFICIENT_CANDIDATES' as const,
    findings: [],
    candidates: assessment.candidates.slice(0, 1).map((c) => ({
      ...c,
      claim: {
        ...c.claim,
        input: { ...c.claim.input, validFrom: null, validUntil: null },
      },
    })),
  };
  setup(undefined, {
    assess: async () => ({ ok: true as const, value: unknown }),
  });
  await screen.findByText('Validity: Unknown validity', { exact: true });
  expect(
    screen.queryByRole('button', { name: 'Confirm bundle publication' }),
  ).toBeNull();
});
it('renders exact historical manifests, requires valid procedure selection, and retires late forms on departure', async () => {
  const mounted = setup({ kind: 'bundle', id: bundle.id }, {}, 'bundles');
  expect(await screen.findByText(bundle.manifest.assessedAt)).toBeTruthy();
  expect(screen.getByText(bundle.sha256)).toBeTruthy();
  expect(screen.getByText(/Assessed alternative \(context\)/u)).toBeTruthy();
  mounted.unmount();
  const form = setup(null, {}, 'bundles');
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirm bundle publication' }),
  );
  expect(await screen.findByRole('alert')).toBeTruthy();
  fireEvent.change(
    screen.getByRole('textbox', {
      name: 'Accepted procedure IDs (optional, one per line)',
    }),
    { target: { value: second } },
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirm bundle publication' }),
  );
  form.unmount();
  await Promise.resolve();
  expect(form.client.publish).not.toHaveBeenCalled();
});
it('withdraws unknown or denied targets without exposing previously cached resources', async () => {
  setup(
    { kind: 'bundle', id: bundle.id },
    { bundle: async () => ({ ok: false as const, error: { kind: 'denied' } }) },
    'bundles',
  );
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByText(bundle.sha256)).toBeNull();
});
it('records explicit defer without a preferred claim and leaves compatible sets free of adjudication controls', async () => {
  const adjudicate = vi
    .fn<EvidenceClient['adjudicate']>()
    .mockResolvedValue({ ok: false, error: { kind: 'transport' } });
  const mounted = setup(undefined, { adjudicate });
  await screen.findByRole('button', { name: 'Confirm adjudication' });
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Adjudication rationale' }),
    { target: { value: 'Need further source review' } },
  );
  fireEvent.click(screen.getByRole('button', { name: 'Confirm adjudication' }));
  await screen.findByRole('button', { name: 'Retry exact command' });
  expect(adjudicate.mock.calls[0]?.[0]).toMatchObject({
    choice: 'DEFER',
    selectedClaimId: null,
    candidateIds: [anchor, second],
  });
  mounted.unmount();
  const compatible = {
    ...assessment,
    state: 'NO_DETECTED_CONFLICT' as const,
    candidates: assessment.candidates.map((c) => ({
      ...c,
      claim: { ...c.claim, input: { ...c.claim.input, booleanValue: true } },
    })),
    findings: [
      { left: anchor, right: second, comparison: 'COMPATIBLE' as const },
    ],
  };
  setup(undefined, { assess: async () => ({ ok: true, value: compatible }) });
  await screen.findByRole('heading', {
    name: 'Claim-set assessment: NO_DETECTED_CONFLICT',
  });
  expect(
    screen.queryByRole('button', { name: 'Confirm adjudication' }),
  ).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Confirm bundle publication' }),
  ).toBeTruthy();
});
it('captures canonical procedure-only publication with no invented claim assessments', async () => {
  const publish = vi
    .fn<EvidenceClient['publish']>()
    .mockResolvedValue({ ok: false, error: { kind: 'transport' } });
  setup(null, { publish }, 'bundles');
  fireEvent.change(
    screen.getByRole('textbox', {
      name: 'Accepted procedure IDs (optional, one per line)',
    }),
    { target: { value: second + '\n' + anchor } },
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirm bundle publication' }),
  );
  await screen.findByRole('button', { name: 'Retry exact command' });
  expect(publish.mock.calls[0]?.[0]).toMatchObject({
    claims: [],
    procedures: [anchor, second],
    claimSets: [],
  });
});
