import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  humanFollowUpApi,
  type GetOwnedFollowUpCaseSummary,
  type ListOwnedHumanFollowUps,
} from '@ergon/follow-up-data-access-web';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { ResolverOwnedHumanFollowUps } from '../src';
import {
  FIRST_WORK_ITEM_ID,
  TENANT_ID,
  resolverFollowUpCaseSummary,
  successfulOwnedFollowUpResult,
} from './follow-up-fixtures';
import { createFollowUpTestStore } from './follow-up-test-store';
import { installNativeDialogTestDouble } from './native-dialog-test-double';

let restoreDialog: () => void;
beforeEach(() => {
  restoreDialog = installNativeDialogTestDouble();
});
afterEach(() => {
  cleanup();
  restoreDialog();
});

it('retires an open comparison across pending/failed ownership checks and fresh recovery', async () => {
  let finishOwned: (
    result: Awaited<ReturnType<ListOwnedHumanFollowUps['listOwned']>>,
  ) => void = () => undefined;
  const heldOwned = new Promise<
    Awaited<ReturnType<ListOwnedHumanFollowUps['listOwned']>>
  >((resolve) => {
    finishOwned = resolve;
  });
  const owned = successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null);
  const listOwned = vi
    .fn<ListOwnedHumanFollowUps['listOwned']>()
    .mockResolvedValueOnce(owned)
    .mockImplementationOnce(() => heldOwned)
    .mockResolvedValueOnce(owned);
  const base = resolverFollowUpCaseSummary(
    FIRST_WORK_ITEM_ID,
    'Private primary source',
  );
  const first = base.observations[0];
  if (first === undefined) throw new Error('The fixture must contain a source');
  const summary = {
    ...base,
    case: { ...base.case, streamVersion: 5 },
    observations: [
      first,
      {
        ...first,
        observationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        streamVersion: 5,
        summary: 'Second private source',
        content: 'Private comparison source',
      },
    ],
  };
  const getOwnedCaseSummary = vi
    .fn<GetOwnedFollowUpCaseSummary['getOwnedCaseSummary']>()
    .mockResolvedValue({ ok: true, summary });
  const store = createFollowUpTestStore({ listOwned, getOwnedCaseSummary });
  render(
    <Provider store={store}>
      <ResolverOwnedHumanFollowUps
        tenantId={TENANT_ID}
        signInHref="/bff/login"
        consoleActorDetails={<span>Verified resolver test identity</span>}
      />
    </Provider>,
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Open resolver console' }),
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Compare sources' }),
  );
  const dialog = screen.getByRole('dialog', { name: 'Source comparison' });
  expect(screen.getByText('Private comparison source')).toBeTruthy();
  act(() => {
    store.dispatch(
      humanFollowUpApi.util.invalidateTags([
        { type: 'ResolverOwnedHumanFollowUps', id: TENANT_ID },
      ]),
    );
  });
  await waitFor(() => expect(listOwned).toHaveBeenCalledTimes(2));
  // Background cache invalidation starts the read independently of a feature
  // intent; wait for its pending render, while the response is still held.
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(dialog.hasAttribute('open')).toBe(false);
  expect(screen.queryByText('Private comparison source')).toBeNull();
  expect(screen.queryAllByText('Private primary source')).toHaveLength(0);
  await act(async () => {
    finishOwned({ ok: false, error: { kind: 'transport' } });
    await heldOwned;
  });
  const failure = await screen.findByRole('heading', {
    name: 'Your active work is temporarily unavailable.',
  });
  expect(document.activeElement).toBe(failure);
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText('Private primary source');
  expect(getOwnedCaseSummary).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.queryByText('Private comparison source')).toBeNull();
});
