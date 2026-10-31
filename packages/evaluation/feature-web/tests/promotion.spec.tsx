import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import {
  promotionApi,
  type PromotionClient,
} from '@ergon/evaluation-data-access-web';
import { PromotionWorkspace } from '../src';
const id = '11111111-1111-4111-8111-111111111111';
const artifact = { key: 'contract', revision: 'v1', sha256: 'a'.repeat(64) };
const reports = [
  { fixture: artifact, reportId: id, reportDigest: 'b'.repeat(64) },
];
const disposers: (() => void)[] = [];
afterEach(() => {
  cleanup();
  disposers.splice(0).forEach((f) => f());
});
it('withdraws review before I/O and fences rapid duplicate confirmations', async () => {
  let commands = 0,
    finish!: (v: Awaited<ReturnType<PromotionClient['read']>>) => void;
  const read = vi
    .fn<PromotionClient['read']>()
    .mockImplementation(async (query) => {
      if ('commandId' in query) {
        commands++;
        expect(
          screen.queryByRole('heading', { name: 'Exact promotion review' }),
        ).toBeNull();
        return new Promise((r) => {
          finish = r;
        });
      }
      return {
        ok: true,
        value: {
          intent: {
            expectedVersion: 1,
            suite: artifact,
            contract: artifact,
            policy: artifact,
            reports,
            rationale: query.rationale,
          },
          eligibility: {
            eligible: true,
            reasons: [],
            scenarios: [{ fixture: artifact, reasons: [] }],
          },
        },
      };
    });
  const store = configureStore({
    reducer: { [promotionApi.reducerPath]: promotionApi.reducer },
    middleware: (d) =>
      d({ thunk: { extraArgument: { promotionClient: { read } } } }).concat(
        promotionApi.middleware,
      ),
  });
  disposers.push(() => store.dispatch(promotionApi.util.resetApiState()));
  render(
    <Provider store={store}>
      <PromotionWorkspace
        query={{ tenantId: id, actorId: id }}
        signInHref="/bff/login"
        onCancel={vi.fn()}
      />
    </Provider>,
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'Contract key' }), {
    target: { value: 'contract' },
  });
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Promotion rationale' }),
    { target: { value: 'Reviewed' } },
  );
  fireEvent.change(
    screen.getByRole('textbox', {
      name: 'Exact report references',
    }),
    { target: { value: JSON.stringify(reports) } },
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Review promotion eligibility' }),
  );
  const button = await screen.findByRole('button', {
    name: 'Confirm promotion',
  });
  expect((button as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(commands).toBe(1));
  const query = read.mock.calls.at(-1)?.[0];
  if (query === undefined || !('commandId' in query))
    throw new Error('Expected exact command');
  finish({
    ok: true,
    value: {
      commandId: query.commandId,
      created: true,
      contract: artifact,
      suite: artifact,
      bindingVersion: 1,
      promotedAt: '2026-10-31T09:00:00Z',
    },
  });
  await screen.findByRole('heading', { name: 'Promotion recorded' });
});
