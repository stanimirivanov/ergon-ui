// @vitest-environment jsdom
import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';
import {
  humanFollowUpApi,
  usePriorityOwnershipCheck,
  type ListOwnedHumanFollowUps,
  type FollowUpPriorityCommand,
  type ResolverOwnedHumanFollowUpResult,
} from '../src';
import { TENANT_ID, WORK_ITEM_ID, validOwnedPage } from './follow-up-fixtures';

const query = { tenantId: TENANT_ID, limit: 25 };
const command: FollowUpPriorityCommand = {
  tenantId: TENANT_ID,
  workItemId: WORK_ITEM_ID,
  commandId: '66666666-6666-4666-8666-666666666666',
  claimId: '77777777-7777-4777-8777-777777777777',
  expectedOwnershipRevision: 1,
  expectedPriorityRevision: 0,
  priority: 'HIGH',
};
function setup(listOwned: ListOwnedHumanFollowUps['listOwned']) {
  const store = configureStore({
    reducer: { [humanFollowUpApi.reducerPath]: humanFollowUpApi.reducer },
    middleware: (getDefault) =>
      getDefault({
        thunk: { extraArgument: { listOwnedHumanFollowUps: { listOwned } } },
      }).concat(humanFollowUpApi.middleware),
  });
  const hook = renderHook(() => usePriorityOwnershipCheck(query), {
    wrapper: ({ children }) => createElement(Provider, { store, children }),
  });
  return { store, hook };
}
describe('distinct priority replay ownership observation', () => {
  it('waits for an older exact-key read and does not consume its successful ownership', async () => {
    let finish!: (result: ResolverOwnedHumanFollowUpResult) => void;
    const listOwned = vi
      .fn<ListOwnedHumanFollowUps['listOwned']>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce({
        ok: true,
        page: { items: [], nextCursor: null },
      });
    const { store, hook } = setup(listOwned);
    const older = store.dispatch(
      humanFollowUpApi.endpoints.resolverOwnedHumanFollowUps.initiate(query),
    );
    try {
      const check = hook.result.current(command, new AbortController().signal);
      expect(listOwned).toHaveBeenCalledTimes(1);
      await act(async () => finish({ ok: true, page: validOwnedPage() }));
      await expect(check).resolves.toBe(false);
      expect(listOwned).toHaveBeenCalledTimes(2);
    } finally {
      older.unsubscribe();
      hook.unmount();
      store.dispatch(humanFollowUpApi.util.resetApiState());
    }
  });
  it('does not acquire a later read when its waiting lifetime is cancelled', async () => {
    let finish!: (result: ResolverOwnedHumanFollowUpResult) => void;
    const listOwned = vi
      .fn<ListOwnedHumanFollowUps['listOwned']>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      );
    const { store, hook } = setup(listOwned);
    const older = store.dispatch(
      humanFollowUpApi.endpoints.resolverOwnedHumanFollowUps.initiate(query),
    );
    const controller = new AbortController();
    try {
      const check = hook.result.current(command, controller.signal);
      controller.abort();
      await act(async () => finish({ ok: true, page: validOwnedPage() }));
      await expect(check).resolves.toBe(false);
      expect(listOwned).toHaveBeenCalledTimes(1);
    } finally {
      older.unsubscribe();
      hook.unmount();
      store.dispatch(humanFollowUpApi.util.resetApiState());
    }
  });
  it('rejects a failed current read even when the cache retains an older owned page', async () => {
    const listOwned = vi
      .fn<ListOwnedHumanFollowUps['listOwned']>()
      .mockResolvedValueOnce({ ok: true, page: validOwnedPage() })
      .mockResolvedValueOnce({ ok: false, error: { kind: 'forbidden' } });
    const { store, hook } = setup(listOwned);
    const old = store.dispatch(
      humanFollowUpApi.endpoints.resolverOwnedHumanFollowUps.initiate(query),
    );
    try {
      await old;
      await expect(
        hook.result.current(command, new AbortController().signal),
      ).resolves.toBe(false);
      expect(listOwned).toHaveBeenCalledTimes(2);
    } finally {
      old.unsubscribe();
      hook.unmount();
      store.dispatch(humanFollowUpApi.util.resetApiState());
    }
  });
});
