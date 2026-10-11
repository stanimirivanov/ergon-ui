import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type {
  GetOwnedFollowUpCaseSummary,
  ListOwnedHumanFollowUps,
  ReleaseHumanFollowUp,
  ResolverFollowUpCaseSummaryResult,
} from '@ergon/follow-up-data-access-web';
import { humanFollowUpApi } from '@ergon/follow-up-data-access-web';
import { StrictMode } from 'react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';

import { ResolverOwnedHumanFollowUps } from '../src';
import {
  FIRST_WORK_ITEM_ID,
  SECOND_WORK_ITEM_ID,
  successfulOwnedFollowUpResult,
  resolverFollowUpCaseSummary,
  followUpClaim,
  followUpRelease,
  TENANT_ID,
} from './follow-up-fixtures';
import {
  createFollowUpTestStore,
  type FollowUpTestCapabilities,
} from './follow-up-test-store';

describe('owned disclosure workflow', () => {
  it('commits private withdrawal before an immediately fulfilled ownership read starts', async () => {
    const listOwned = vi
      .fn<ListOwnedHumanFollowUps['listOwned']>()
      .mockResolvedValueOnce(
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      )
      .mockImplementationOnce(async () => {
        expect(screen.queryByText('Private evidence')).toBeNull();
        expect(
          screen.queryByRole('heading', { name: 'Resolver Console' }),
        ).toBeNull();
        return successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null);
      });
    const getOwnedCaseSummary = vi
      .fn<GetOwnedFollowUpCaseSummary['getOwnedCaseSummary']>()
      .mockResolvedValue({
        ok: true,
        summary: resolverFollowUpCaseSummary(
          FIRST_WORK_ITEM_ID,
          'Private evidence',
        ),
      });
    renderOwned({ listOwned, getOwnedCaseSummary });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open resolver console' }),
    );
    expect(await screen.findByText('Private evidence')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck current claim' }),
    );
    await waitFor(() => expect(listOwned).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(getOwnedCaseSummary).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Private evidence')).toBeTruthy();
  });

  it('commits withdrawal before an immediately fulfilled release starts', async () => {
    const release = vi.fn<ReleaseHumanFollowUp['release']>(async () => {
      expect(screen.queryByText('Private evidence')).toBeNull();
      expect(
        screen.queryByRole('heading', { name: 'Resolver Console' }),
      ).toBeNull();
      return { ok: true, release: followUpRelease(FIRST_WORK_ITEM_ID) };
    });
    renderOwned({
      listOwned: async () =>
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      getOwnedCaseSummary: async () => ({
        ok: true,
        summary: resolverFollowUpCaseSummary(
          FIRST_WORK_ITEM_ID,
          'Private evidence',
        ),
      }),
      release,
    });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open resolver console' }),
    );
    expect(await screen.findByText('Private evidence')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Release to shared queue' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm release' }));
    expect(
      await screen.findByRole('status', { name: 'Follow-up released' }),
    ).toBeTruthy();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('does not consume a pending closed disclosure when it is immediately reopened', async () => {
    const old = deferred<ResolverFollowUpCaseSummaryResult>();
    const fresh = deferred<ResolverFollowUpCaseSummaryResult>();
    const getOwnedCaseSummary = vi
      .fn<GetOwnedFollowUpCaseSummary['getOwnedCaseSummary']>()
      .mockImplementationOnce(() => old.promise)
      .mockImplementationOnce(() => fresh.promise);
    renderOwned({
      listOwned: async () =>
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      getOwnedCaseSummary,
    });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open resolver console' }),
    );
    await waitFor(() => expect(getOwnedCaseSummary).toHaveBeenCalledTimes(1));
    fireEvent.click(
      screen.getByRole('button', { name: 'Back to active work' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Open resolver console' }),
    );
    await waitFor(() => expect(getOwnedCaseSummary).toHaveBeenCalledTimes(2));
    await act(async () =>
      old.resolve({
        ok: true,
        summary: resolverFollowUpCaseSummary(
          FIRST_WORK_ITEM_ID,
          'Closed request evidence',
        ),
      }),
    );
    expect(screen.queryByText('Closed request evidence')).toBeNull();
    await act(async () =>
      fresh.resolve({ ok: false, error: { kind: 'not-found' } }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Case context is no longer available.',
      }),
    ).toBeTruthy();
    expect(screen.queryByText('Closed request evidence')).toBeNull();
  });

  it('does not reopen a Console from a recheck that completes after explicit close', async () => {
    const held =
      deferred<Awaited<ReturnType<ListOwnedHumanFollowUps['listOwned']>>>();
    const listOwned = vi
      .fn<ListOwnedHumanFollowUps['listOwned']>()
      .mockResolvedValueOnce(
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      )
      .mockImplementationOnce(() => held.promise);
    const getOwnedCaseSummary = vi
      .fn<GetOwnedFollowUpCaseSummary['getOwnedCaseSummary']>()
      .mockResolvedValue({
        ok: true,
        summary: resolverFollowUpCaseSummary(
          FIRST_WORK_ITEM_ID,
          'Private evidence',
        ),
      });
    renderOwned({ listOwned, getOwnedCaseSummary });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open resolver console' }),
    );
    expect(await screen.findByText('Private evidence')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck current claim' }),
    );
    await waitFor(() => expect(listOwned).toHaveBeenCalledTimes(2));
    fireEvent.click(
      screen.getByRole('button', { name: 'Back to active work' }),
    );
    await act(async () =>
      held.resolve(successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null)),
    );
    expect(
      await screen.findByRole('button', { name: 'Open resolver console' }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: 'Resolver Console' }),
    ).toBeNull();
    expect(screen.queryByText('Private evidence')).toBeNull();
    expect(getOwnedCaseSummary).toHaveBeenCalledTimes(1);
  });

  it.each([
    'claimId',
    'workItemId',
    'caseId',
    'runId',
    'ownershipRevision',
  ] as const)(
    'withdraws disclosure when the selected %s changes in current owned work',
    async (coordinate) => {
      const original = successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null);
      if (!original.ok) throw new Error('Owned fixture must be successful');
      const item = original.page.items[0];
      if (item === undefined) throw new Error('Owned fixture requires one row');
      const changed = {
        ...item,
        claim:
          coordinate === 'claimId'
            ? { ...item.claim, claimId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }
            : item.claim,
        workItem:
          coordinate === 'claimId'
            ? item.workItem
            : {
                ...item.workItem,
                [coordinate]:
                  coordinate === 'ownershipRevision'
                    ? 3
                    : 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              },
      };
      const listOwned = vi
        .fn<ListOwnedHumanFollowUps['listOwned']>()
        .mockResolvedValueOnce(original)
        .mockResolvedValueOnce({
          ok: true,
          page: { items: [changed], nextCursor: null },
        });
      const getOwnedCaseSummary = vi
        .fn<GetOwnedFollowUpCaseSummary['getOwnedCaseSummary']>()
        .mockResolvedValue({
          ok: true,
          summary: resolverFollowUpCaseSummary(
            FIRST_WORK_ITEM_ID,
            'Private evidence',
          ),
        });
      const { store } = renderOwned({ listOwned, getOwnedCaseSummary });
      fireEvent.click(
        await screen.findByRole('button', { name: 'Open resolver console' }),
      );
      expect(await screen.findByText('Private evidence')).toBeTruthy();
      act(() =>
        store.dispatch(
          humanFollowUpApi.util.invalidateTags([
            { type: 'ResolverOwnedHumanFollowUps', id: TENANT_ID },
          ]),
        ),
      );
      await waitFor(() => expect(listOwned).toHaveBeenCalledTimes(2));
      expect(
        await screen.findByRole('button', { name: 'Open resolver console' }),
      ).toBeTruthy();
      expect(screen.queryByText('Private evidence')).toBeNull();
      expect(getOwnedCaseSummary).toHaveBeenCalledTimes(1);
    },
  );

  it('does not acquire abandoned StrictMode reads or replay a committed Console release', async () => {
    const getOwnedCaseSummary = vi
      .fn<GetOwnedFollowUpCaseSummary['getOwnedCaseSummary']>()
      .mockResolvedValue({
        ok: true,
        summary: resolverFollowUpCaseSummary(
          FIRST_WORK_ITEM_ID,
          'Private evidence',
        ),
      });
    const heldRelease =
      deferred<Awaited<ReturnType<ReleaseHumanFollowUp['release']>>>();
    const release = vi.fn<ReleaseHumanFollowUp['release']>(async () => {
      expect(screen.queryByText('Private evidence')).toBeNull();
      expect(
        screen.queryByRole('heading', { name: 'Resolver Console' }),
      ).toBeNull();
      return heldRelease.promise;
    });
    const store = createFollowUpTestStore({
      listOwned: async () =>
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      getOwnedCaseSummary,
      release,
    });
    render(
      <StrictMode>
        <Provider store={store}>
          <ResolverOwnedHumanFollowUps
            tenantId={TENANT_ID}
            signInHref="/bff/login"
            consoleActorDetails={null}
          />
        </Provider>
      </StrictMode>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open resolver console' }),
    );
    expect(await screen.findByText('Private evidence')).toBeTruthy();
    expect(getOwnedCaseSummary).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole('button', { name: 'Release to shared queue' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm release' }));
    expect(
      await screen.findByRole('status', { name: 'Releasing follow-up' }),
    ).toBeTruthy();
    expect(release).toHaveBeenCalledTimes(1);
    expect(release.mock.calls[0]?.[0]).toEqual({
      tenantId: TENANT_ID,
      workItemId: FIRST_WORK_ITEM_ID,
      claimId: followUpClaim(FIRST_WORK_ITEM_ID).claimId,
      expectedOwnershipRevision: 1,
    });
    await act(async () =>
      heldRelease.resolve({ ok: false, error: { kind: 'unexpected-defect' } }),
    );
    expect(
      await screen.findByRole('alert', {
        name: 'The workbench could not confirm the release result.',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Try release again' }),
    ).toBeTruthy();
    expect(
      screen.getByText(/release may already have been recorded/),
    ).toBeTruthy();
    expect(screen.queryByText('Private evidence')).toBeNull();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('permanently retires superseded release feedback across traversal away and back', async () => {
    const nextCursor = {
      afterClaimedAt: '2026-09-22T10:15:00Z',
      afterClaimId: '77777777-7777-4777-8777-777777777777',
    };
    const listOwned = vi
      .fn<ListOwnedHumanFollowUps['listOwned']>()
      .mockResolvedValueOnce(
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, nextCursor),
      )
      .mockResolvedValueOnce(
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, nextCursor),
      )
      .mockResolvedValueOnce(
        successfulOwnedFollowUpResult(
          FIRST_WORK_ITEM_ID,
          nextCursor,
          3,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        ),
      )
      .mockResolvedValueOnce(
        successfulOwnedFollowUpResult(SECOND_WORK_ITEM_ID, null),
      );
    const { store } = renderOwned({
      listOwned,
      release: async () => ({
        ok: true,
        release: followUpRelease(FIRST_WORK_ITEM_ID),
      }),
    });
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Release Retry attempt limit reached follow-up',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm release' }));
    expect(
      await screen.findByRole('status', { name: 'Follow-up released' }),
    ).toBeTruthy();
    await waitFor(() => expect(listOwned).toHaveBeenCalledTimes(2));
    act(() =>
      store.dispatch(
        humanFollowUpApi.util.invalidateTags([
          { type: 'ResolverOwnedHumanFollowUps', id: TENANT_ID },
        ]),
      ),
    );
    await waitFor(() => expect(listOwned).toHaveBeenCalledTimes(3));
    await waitFor(() =>
      expect(
        screen.queryByRole('status', { name: 'Follow-up released' }),
      ).toBeNull(),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Next claimed-work page' }),
    );
    expect(await screen.findByText(SECOND_WORK_ITEM_ID)).toBeTruthy();
    expect(
      screen.queryByRole('status', { name: 'Follow-up released' }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Previous claimed-work page' }),
    );
    expect(await screen.findByText(FIRST_WORK_ITEM_ID)).toBeTruthy();
    expect(
      screen.queryByRole('status', { name: 'Follow-up released' }),
    ).toBeNull();
  });

  it('retires a pending release callback when the mounted tenant changes', async () => {
    const held =
      deferred<Awaited<ReturnType<ReleaseHumanFollowUp['release']>>>();
    const replacementTenant = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const listOwned = vi.fn<ListOwnedHumanFollowUps['listOwned']>(
      async (query) =>
        query.tenantId === TENANT_ID
          ? successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null)
          : { ok: true, page: { items: [], nextCursor: null } },
    );
    const release = vi.fn<ReleaseHumanFollowUp['release']>(() => held.promise);
    const store = createFollowUpTestStore({ listOwned, release });
    const surface = (tenantId: string) => (
      <Provider store={store}>
        <ResolverOwnedHumanFollowUps
          tenantId={tenantId}
          signInHref="/bff/login"
          consoleActorDetails={null}
        />
      </Provider>
    );
    const rendered = render(surface(TENANT_ID));
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Release Retry attempt limit reached follow-up',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm release' }));
    await waitFor(() => expect(release).toHaveBeenCalledTimes(1));
    rendered.rerender(surface(replacementTenant));
    expect(
      await screen.findByRole('heading', {
        name: 'No active claimed work in this view.',
      }),
    ).toBeTruthy();
    await act(async () =>
      held.resolve({ ok: true, release: followUpRelease(FIRST_WORK_ITEM_ID) }),
    );
    expect(
      screen.queryByRole('status', { name: 'Follow-up released' }),
    ).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(
      screen.queryByRole('heading', { name: 'Resolver Console' }),
    ).toBeNull();
  });
});

function renderOwned(capabilities: FollowUpTestCapabilities) {
  const store = createFollowUpTestStore(capabilities);
  return {
    store,
    ...render(
      <Provider store={store}>
        <ResolverOwnedHumanFollowUps
          tenantId={TENANT_ID}
          signInHref="/bff/login"
          consoleActorDetails={null}
        />
      </Provider>,
    ),
  };
}

function deferred<Value>() {
  let resolve: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}
