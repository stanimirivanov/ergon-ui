import { configureStore } from '@reduxjs/toolkit';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, expect, it, vi } from 'vitest';
import {
  evidenceApi,
  type EvidenceClient,
} from '@ergon/evidence-data-access-web';
import { EvidenceWorkspace } from '../src';
import {
  actorId,
  inspection,
  page,
  proposal,
  receipt,
  tenantId,
} from './fixtures';

afterEach(cleanup);
function setup(overrides: Partial<EvidenceClient> = {}, selected = true) {
  const client: EvidenceClient = {
    assess: vi.fn(),
    adjudication: vi.fn(),
    adjudicate: vi.fn(),
    bundle: vi.fn(),
    publish: vi.fn(),
    pending: vi.fn(async () => ({ ok: true as const, value: page })),
    inspect: vi.fn(async () => ({ ok: true as const, value: inspection })),
    review: vi.fn(async () => ({
      ok: false as const,
      error: { kind: 'transport' as const },
    })),
    ...overrides,
  };
  const store = configureStore({
    reducer: { [evidenceApi.reducerPath]: evidenceApi.reducer },
    middleware: (defaults) =>
      defaults({ thunk: { extraArgument: { evidenceClient: client } } }).concat(
        evidenceApi.middleware,
      ),
  });
  const onRecheck = vi.fn();
  const onOpen = vi.fn();
  const rendered = render(
    <Provider store={store}>
      <EvidenceWorkspace
        query={{ tenantId, actorId }}
        selection={selected ? proposal : null}
        cursor={null}
        signInHref="/bff/login"
        onOpen={onOpen}
        onPage={vi.fn()}
        onRecheck={onRecheck}
      />
    </Provider>,
  );
  return { ...rendered, store, client, onRecheck, onOpen };
}
it('browses the pending queue and opens only the selected exact proposal', async () => {
  const mounted = setup({}, false);
  fireEvent.click(await screen.findByRole('button', { name: 'Inspect claim' }));
  expect(mounted.onOpen).toHaveBeenCalledWith(proposal);
  expect(mounted.client.inspect).not.toHaveBeenCalled();
});
it('renders quotations inertly and validates rationale before any command', async () => {
  const quote = '<img src="x" onerror="alert(1)">';
  const data = {
    ...inspection,
    claim: {
      ...inspection.claim!,
      quote,
      start: 0,
      endExclusive: quote.length,
    },
  };
  const mounted = setup({ inspect: async () => ({ ok: true, value: data }) });
  expect(await screen.findByText(quote)).toBeTruthy();
  expect(mounted.container.querySelector('img')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm review' }));
  expect((await screen.findByRole('alert')).textContent).toContain(
    'Enter a nonblank rationale',
  );
  expect(mounted.client.review).not.toHaveBeenCalled();
});
it('withdraws inspection and repeats only immutable uncertain intent with no automatic retry', async () => {
  const review = vi
    .fn<EvidenceClient['review']>()
    .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
    .mockImplementationOnce(async (intent) => ({
      ok: true,
      value: {
        ...receipt,
        commandId: intent.commandId,
        rationale: intent.rationale,
      },
    }));
  const mounted = setup({ review });
  await screen.findByText('😀');
  fireEvent.change(screen.getByRole('textbox', { name: 'Rationale' }), {
    target: { value: 'Checked original quotation' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm review' }));
  const retry = await screen.findByRole('button', {
    name: 'Retry exact review',
  });
  expect(screen.queryByText('😀')).toBeNull();
  expect(review).toHaveBeenCalledTimes(1);
  await waitFor(() =>
    expect(mounted.store.getState().evidenceApi.queries).toEqual({}),
  );
  fireEvent.click(retry);
  await waitFor(() => expect(mounted.onRecheck).toHaveBeenCalledTimes(1));
  expect(review.mock.calls[1]?.[0]).toEqual(review.mock.calls[0]?.[0]);
});
it('withholds terminal controls and distinguishes stale or denied outcomes without retaining quotes', async () => {
  const terminal = {
    ...inspection,
    status: 'ACCEPTED' as const,
    version: 1 as const,
    claim: { ...inspection.claim!, status: 'ACCEPTED' as const },
    review: receipt,
  };
  const mounted = setup({
    inspect: async () => ({ ok: true, value: terminal }),
  });
  await screen.findByText('No further review is permitted for this proposal.');
  expect(screen.queryByRole('button', { name: 'Confirm review' })).toBeNull();
  mounted.unmount();
  const rejected = setup({
    review: async () => ({ ok: false, error: { kind: 'conflict' } }),
  });
  await screen.findByText('😀');
  fireEvent.change(screen.getByRole('textbox', { name: 'Rationale' }), {
    target: { value: 'Checked' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm review' }));
  await screen.findByText(/The evidence changed/);
  expect(
    screen.queryByRole('button', { name: 'Retry exact review' }),
  ).toBeNull();
  expect(screen.queryByText('😀')).toBeNull();
  rejected.unmount();
  setup({ inspect: async () => ({ ok: false, error: { kind: 'denied' } }) });
  await screen.findByText(
    'Evidence is not currently available to this session.',
  );
  expect(screen.queryByRole('button', { name: 'Confirm review' })).toBeNull();
});
it('retires pending review callbacks on departure without reopening private content', async () => {
  let finish:
    ((value: { ok: false; error: { kind: 'transport' } }) => void) | undefined;
  const mounted = setup({
    review: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  await screen.findByText('😀');
  fireEvent.change(screen.getByRole('textbox', { name: 'Rationale' }), {
    target: { value: 'Checked' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm review' }));
  await waitFor(() => expect(finish).toBeDefined());
  mounted.unmount();
  finish?.({ ok: false, error: { kind: 'transport' } });
  await Promise.resolve();
  expect(mounted.onRecheck).not.toHaveBeenCalled();
});
