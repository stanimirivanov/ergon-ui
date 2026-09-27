import { configureStore } from '@reduxjs/toolkit';
import type {
  GetOwnedFollowUpCaseSummary,
  ListOpenHumanFollowUps,
  ListOwnedHumanFollowUps,
} from '@ergon/application-follow-up';
import { describe, expect, it, vi } from 'vitest';

import { type HumanFollowUpCacheDependencies, humanFollowUpApi } from '../src';
import {
  CASE_ID,
  RUN_ID,
  TENANT_ID,
  WORK_ITEM_ID,
  validCaseSummary,
  validClaim,
  validOwnedPage,
  validPage,
} from './follow-up-fixtures';

const OTHER_TENANT_ID = '1f262f80-c0c6-4c31-9fa0-5e701b8636ee';
const OTHER_WORK_ITEM_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('human follow-up cache adapter', () => {
  it('deduplicates identical inbox keys and isolates tenant and filter keys', async () => {
    const listOpen = vi
      .fn<ListOpenHumanFollowUps['listOpen']>()
      .mockResolvedValue({ ok: true, page: validPage() });
    const store = createFollowUpCacheStore({
      ...defaultDependencies(),
      listOpenHumanFollowUps: { listOpen },
    });
    const query = { tenantId: TENANT_ID, limit: 25 };

    const first = store.dispatch(
      humanFollowUpApi.endpoints.humanFollowUps.initiate(query),
    );
    const duplicate = store.dispatch(
      humanFollowUpApi.endpoints.humanFollowUps.initiate(query),
    );
    const filtered = store.dispatch(
      humanFollowUpApi.endpoints.humanFollowUps.initiate({
        ...query,
        queueKey: 'access-restoration',
      }),
    );
    const otherTenant = store.dispatch(
      humanFollowUpApi.endpoints.humanFollowUps.initiate({
        ...query,
        tenantId: OTHER_TENANT_ID,
      }),
    );

    await expect(first.unwrap()).resolves.toEqual(validPage());
    await expect(duplicate.unwrap()).resolves.toEqual(validPage());
    await expect(filtered.unwrap()).resolves.toEqual(validPage());
    await expect(otherTenant.unwrap()).resolves.toEqual(validPage());
    expect(listOpen).toHaveBeenCalledTimes(3);
    expect(listOpen.mock.calls.map(([request]) => request)).toEqual([
      query,
      { ...query, queueKey: 'access-restoration' },
      { ...query, tenantId: OTHER_TENANT_ID },
    ]);

    first.unsubscribe();
    duplicate.unsubscribe();
    filtered.unsubscribe();
    otherTenant.unsubscribe();
  });

  it('keys case summaries by tenant and work item', async () => {
    const getOwnedCaseSummary = vi
      .fn<GetOwnedFollowUpCaseSummary['getOwnedCaseSummary']>()
      .mockResolvedValue({ ok: true, summary: validCaseSummary() });
    const store = createFollowUpCacheStore({
      ...defaultDependencies(),
      getOwnedFollowUpCaseSummary: { getOwnedCaseSummary },
    });
    const query = {
      tenantId: TENANT_ID,
      workItemId: WORK_ITEM_ID,
      caseId: CASE_ID,
      runId: RUN_ID,
    };

    const first = store.dispatch(
      humanFollowUpApi.endpoints.resolverFollowUpCaseSummary.initiate(query),
    );
    const duplicate = store.dispatch(
      humanFollowUpApi.endpoints.resolverFollowUpCaseSummary.initiate(query),
    );
    const otherWorkItem = store.dispatch(
      humanFollowUpApi.endpoints.resolverFollowUpCaseSummary.initiate({
        ...query,
        workItemId: OTHER_WORK_ITEM_ID,
      }),
    );

    await Promise.all([
      first.unwrap(),
      duplicate.unwrap(),
      otherWorkItem.unwrap(),
    ]);
    expect(getOwnedCaseSummary).toHaveBeenCalledTimes(2);
    expect(getOwnedCaseSummary.mock.calls.map(([request]) => request)).toEqual([
      query,
      { ...query, workItemId: OTHER_WORK_ITEM_ID },
    ]);

    first.unsubscribe();
    duplicate.unsubscribe();
    otherWorkItem.unsubscribe();
  });

  it('refreshes subscribed inbox and owned-work caches after a successful claim', async () => {
    const listOpen = vi
      .fn<ListOpenHumanFollowUps['listOpen']>()
      .mockResolvedValue({ ok: true, page: validPage() });
    const listOwned = vi
      .fn<ListOwnedHumanFollowUps['listOwned']>()
      .mockResolvedValue({ ok: true, page: validOwnedPage() });
    const store = createFollowUpCacheStore({
      ...defaultDependencies(),
      listOpenHumanFollowUps: { listOpen },
      listOwnedHumanFollowUps: { listOwned },
    });
    const inbox = store.dispatch(
      humanFollowUpApi.endpoints.humanFollowUps.initiate({
        tenantId: TENANT_ID,
        limit: 25,
      }),
    );
    const owned = store.dispatch(
      humanFollowUpApi.endpoints.resolverOwnedHumanFollowUps.initiate({
        tenantId: TENANT_ID,
        limit: 25,
      }),
    );
    await Promise.all([inbox.unwrap(), owned.unwrap()]);

    const claim = store.dispatch(
      humanFollowUpApi.endpoints.claimHumanFollowUp.initiate({
        tenantId: TENANT_ID,
        workItemId: WORK_ITEM_ID,
      }),
    );

    await expect(claim.unwrap()).resolves.toEqual(validClaim());
    await vi.waitFor(() => {
      expect(listOpen).toHaveBeenCalledTimes(2);
      expect(listOwned).toHaveBeenCalledTimes(2);
    });

    inbox.unsubscribe();
    owned.unsubscribe();
  });

  it('refreshes only the inbox after a stale claim outcome', async () => {
    const listOpen = vi
      .fn<ListOpenHumanFollowUps['listOpen']>()
      .mockResolvedValue({ ok: true, page: validPage() });
    const listOwned = vi
      .fn<ListOwnedHumanFollowUps['listOwned']>()
      .mockResolvedValue({ ok: true, page: validOwnedPage() });
    const store = createFollowUpCacheStore({
      ...defaultDependencies(),
      listOpenHumanFollowUps: { listOpen },
      listOwnedHumanFollowUps: { listOwned },
      claimHumanFollowUp: {
        async claim() {
          return { ok: false, error: { kind: 'already-claimed' } };
        },
      },
    });
    const inbox = store.dispatch(
      humanFollowUpApi.endpoints.humanFollowUps.initiate({
        tenantId: TENANT_ID,
        limit: 25,
      }),
    );
    const owned = store.dispatch(
      humanFollowUpApi.endpoints.resolverOwnedHumanFollowUps.initiate({
        tenantId: TENANT_ID,
        limit: 25,
      }),
    );
    await Promise.all([inbox.unwrap(), owned.unwrap()]);

    const claim = store.dispatch(
      humanFollowUpApi.endpoints.claimHumanFollowUp.initiate({
        tenantId: TENANT_ID,
        workItemId: WORK_ITEM_ID,
      }),
    );

    await expect(claim.unwrap()).rejects.toEqual({ kind: 'already-claimed' });
    await vi.waitFor(() => expect(listOpen).toHaveBeenCalledTimes(2));
    expect(listOwned).toHaveBeenCalledTimes(1);

    inbox.unsubscribe();
    owned.unsubscribe();
  });
});

function defaultDependencies(): HumanFollowUpCacheDependencies {
  return {
    listOpenHumanFollowUps: {
      async listOpen() {
        return { ok: true, page: validPage() };
      },
    },
    listOwnedHumanFollowUps: {
      async listOwned() {
        return { ok: true, page: validOwnedPage() };
      },
    },
    getOwnedFollowUpCaseSummary: {
      async getOwnedCaseSummary() {
        return { ok: true, summary: validCaseSummary() };
      },
    },
    claimHumanFollowUp: {
      async claim() {
        return { ok: true, claim: validClaim() };
      },
    },
  };
}

function createFollowUpCacheStore(
  dependencies: HumanFollowUpCacheDependencies,
) {
  return configureStore({
    reducer: {
      [humanFollowUpApi.reducerPath]: humanFollowUpApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: dependencies },
      }).concat(humanFollowUpApi.middleware),
  });
}
