import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import {
  evaluationApi,
  type EvaluationClient,
} from '@ergon/evaluation-data-access-web';
import { EvaluationWorkspace } from '../src';
const id = '11111111-1111-4111-8111-111111111111';
const artifact = { key: 'fixture', revision: 'v1', sha256: 'a'.repeat(64) };
const summary = {
  reportId: id,
  fixture: artifact,
  reportDigest: 'b'.repeat(64),
  passed: false,
  recordedAt: '2026-10-30T12:00:00Z',
};
const disposers: (() => void)[] = [];
afterEach(() => {
  cleanup();
  disposers.splice(0).forEach((f) => f());
});
function mount(client: EvaluationClient, reportId: string | null = null) {
  const store = configureStore({
    reducer: { [evaluationApi.reducerPath]: evaluationApi.reducer },
    middleware: (d) =>
      d({ thunk: { extraArgument: { evaluationClient: client } } }).concat(
        evaluationApi.middleware,
      ),
  });
  disposers.push(() => store.dispatch(evaluationApi.util.resetApiState()));
  const onSelect = vi.fn(),
    onOlder = vi.fn();
  render(
    <Provider store={store}>
      <EvaluationWorkspace
        query={{ tenantId: id, actorId: id }}
        after={null}
        reportId={reportId}
        signInHref="/bff/login"
        onSelect={onSelect}
        onOlder={onOlder}
      />
    </Provider>,
  );
  return { onSelect, onOlder };
}
it('distinguishes an empty page from failure and loading', async () => {
  let finish!: (value: Awaited<ReturnType<EvaluationClient['read']>>) => void;
  mount({
    read: () =>
      new Promise((r) => {
        finish = r;
      }),
  });
  expect(screen.getByRole('status').textContent).toContain('Checking');
  finish({ ok: true, value: { items: [], nextAfter: null } });
  await screen.findByText('No evaluations in this checked page.');
  expect(screen.queryByRole('alert')).toBeNull();
});
it.each([
  'denied',
  'authentication-required',
  'invalid-response',
  'timeout',
] as const)('withdraws reports on %s', async (kind) => {
  mount({ read: async () => ({ ok: false, error: { kind } }) });
  await screen.findByRole('alert');
  expect(screen.queryByText(/No evaluations in/)).toBeNull();
  expect(screen.queryByRole('link', { name: 'Sign in again' }) !== null).toBe(
    kind === 'authentication-required',
  );
});
it('opens the exact selected report', async () => {
  const { onSelect } = mount({
    read: async () => ({
      ok: true,
      value: { items: [summary], nextAfter: null },
    }),
  });
  fireEvent.click(
    await screen.findByRole('button', { name: `Inspect report ${id}` }),
  );
  expect(onSelect).toHaveBeenCalledWith(id);
});
it('renders every status as text, inert check names and explicit unknown budget units', async () => {
  mount(
    {
      read: async () => ({
        ok: true,
        value: {
          summary,
          evaluator: artifact,
          assertions: artifact,
          checks: [
            {
              id: '<img src=x onerror=alert(1)>',
              required: true,
              status: 'FAIL',
              explanation: 'MISMATCH',
            },
            {
              id: 'success',
              required: true,
              status: 'PASS',
              explanation: 'MATCH',
            },
            {
              id: 'unsupported',
              required: false,
              status: 'UNSUPPORTED',
              explanation: 'UNSUPPORTED_ASSERTION',
            },
            {
              id: 'error',
              required: false,
              status: 'ERROR',
              explanation: 'OBSERVATION_ERROR',
            },
          ],
          budgets: {
            currency: 'USD',
            cost: {
              limit: 10,
              measured: null,
              status: 'UNKNOWN',
              reason: 'MISSING_PRICING',
            },
            simulatedLatency: {
              limit: null,
              measured: 0,
              status: 'NOT_CONFIGURED',
              reason: null,
            },
          },
        },
      }),
    },
    id,
  );
  await screen.findByRole('article', { name: 'Exact evaluation report' });
  for (const status of [
    'Required · FAIL',
    'Required · PASS',
    'Optional · UNSUPPORTED',
    'Optional · ERROR',
  ])
    expect(screen.getByText(status)).toBeTruthy();
  expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy();
  expect(document.querySelector('img')).toBeNull();
  expect(screen.getByText('Unknown')).toBeTruthy();
  expect(screen.getByText('Measured (USD nanos)')).toBeTruthy();
  expect(screen.getByText('Measured (nanoseconds)')).toBeTruthy();
});
