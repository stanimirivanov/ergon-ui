import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type {
  ClaimHumanFollowUp,
  GetOwnedFollowUpCaseSummary,
  ListOpenHumanFollowUps,
  ListOwnedHumanFollowUps,
} from '@ergon/follow-up-data-access-web';
import { humanFollowUpApi } from '@ergon/follow-up-data-access-web';
import type { WorkspaceRenderer } from '@ergon/ui-web';
import { useLayoutEffect } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { HumanFollowUpWorkspace, ResolverOwnedHumanFollowUps } from '../src';
import {
  FIRST_WORK_ITEM_ID,
  SECOND_WORK_ITEM_ID,
  TENANT_ID,
  followUpClaim,
  resolverFollowUpCaseSummary,
  successfulOpenFollowUpResult,
  successfulOwnedFollowUpResult,
} from './follow-up-fixtures';
import {
  createFollowUpTestStore,
  type FollowUpTestCapabilities,
} from './follow-up-test-store';

const cursor = {
  afterOpenedAt: '2026-09-21T09:30:00Z',
  afterWorkItemId: FIRST_WORK_ITEM_ID,
};

describe('follow-up workspace disclosure composition', () => {
  it('distinguishes owned from available work in reading order without combining page counts', async () => {
    renderWorkspace({
      listOpen: async () =>
        successfulOpenFollowUpResult(SECOND_WORK_ITEM_ID, null, 2),
    });
    const owned = await screen.findByRole('region', {
      name: 'Claimed follow-ups',
    });
    const shared = await screen.findByRole('region', {
      name: 'Open follow-up work',
    });
    await within(owned).findByRole('button', { name: 'Open resolver console' });
    await within(shared).findByRole('button', {
      name: 'Claim Retry attempt limit reached follow-up',
    });
    expect(
      owned.compareDocumentPosition(shared) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(
      within(owned).getByText('Claimed', { selector: 'span' }),
    ).toBeTruthy();
    expect(within(shared).getByText('Available to claim')).toBeTruthy();
    expect(
      within(owned).getByText('Case', { exact: true }).nextElementSibling
        ?.textContent,
    ).toBe(FIRST_WORK_ITEM_ID);
    expect(
      within(owned).getByText('Ownership revision').nextElementSibling
        ?.textContent,
    ).toBe('1');
    expect(
      within(shared).getByText('Ownership revision').nextElementSibling
        ?.textContent,
    ).toBe('2');
    expect(within(owned).getByText('1 row on this page')).toBeTruthy();
    expect(within(shared).getByText('1 row on this page')).toBeTruthy();
    expect(
      within(shared).queryByRole('button', { name: 'Open resolver console' }),
    ).toBeNull();
    expect(
      within(owned).queryByRole('button', { name: /Claim Retry/ }),
    ).toBeNull();
  });
  it('derives shell mode and withdraws claim presence while preserving every pane during a held ownership gate', async () => {
    let finishOwned: (
      result: Awaited<ReturnType<ListOwnedHumanFollowUps['listOwned']>>,
    ) => void = () => undefined;
    const heldOwned = new Promise<
      Awaited<ReturnType<ListOwnedHumanFollowUps['listOwned']>>
    >((resolve) => {
      finishOwned = resolve;
    });
    const listOwned = vi
      .fn<ListOwnedHumanFollowUps['listOwned']>()
      .mockResolvedValueOnce(
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      )
      .mockImplementationOnce(() => heldOwned);
    const shell = vi.fn<WorkspaceRenderer>(renderWorkspaceShell);
    renderWorkspace({ listOwned }, shell);
    expect(shell.mock.lastCall?.[0].mode).toBe('standard');

    await openConsole();
    expect(shell.mock.lastCall?.[0].mode).toBe('focused');
    expect(screen.getByRole('region', { name: 'Current claim' })).toBeTruthy();
    const recheck = screen.getByRole('button', {
      name: 'Recheck current claim',
    });
    recheck.focus();
    fireEvent.click(recheck);
    await waitFor(() => expect(listOwned).toHaveBeenCalledTimes(2));
    expect(shell.mock.lastCall?.[0].mode).toBe('focused');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Back to active work' }),
    );
    expect(screen.queryByRole('region', { name: 'Current claim' })).toBeNull();
    expect(screen.queryByText('Private Console evidence')).toBeNull();
    expect(screen.queryByText('Verified actor display')).toBeNull();
    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(['Evidence withheld', 'Execution withheld', 'Outcome withheld']);
    expect(
      screen.getAllByRole('button', { name: 'Back to active work' }),
    ).toHaveLength(1);

    finishOwned({ ok: false, error: { kind: 'transport' } });
    const failure = await screen.findByRole('heading', {
      name: 'Your active work is temporarily unavailable.',
    });
    expect(document.activeElement).toBe(failure);
    expect(shell.mock.lastCall?.[0].mode).toBe('focused');
    expect(screen.queryByRole('region', { name: 'Current claim' })).toBeNull();
    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(['Evidence withheld', 'Execution withheld', 'Outcome withheld']);
    fireEvent.click(
      screen.getByRole('button', { name: 'Back to active work' }),
    );
    expect(shell.mock.lastCall?.[0].mode).toBe('standard');
    expect(
      screen.queryByRole('region', { name: 'Evidence withheld' }),
    ).toBeNull();
  });
  it('retains stable toolbar focus after an immediately successful ownership recheck', async () => {
    const listOwned = vi.fn<ListOwnedHumanFollowUps['listOwned']>(async () =>
      successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
    );
    renderWorkspace({ listOwned });
    await openConsole();
    const recheck = screen.getByRole('button', {
      name: 'Recheck current claim',
    });
    recheck.focus();
    fireEvent.click(recheck);
    const back = screen.getByRole('button', { name: 'Back to active work' });
    expect(document.activeElement).toBe(back);
    await waitFor(() => expect(listOwned).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Private Console evidence')).toBeTruthy();
    expect(document.activeElement).toBe(back);
  });
  it.each(['after paint', 'before passive effects'] as const)(
    'retains stable toolbar focus through a held owned-work recovery and fresh case context (%s)',
    async (retryTiming) => {
      let finishRecovery: (
        result: Awaited<ReturnType<ListOwnedHumanFollowUps['listOwned']>>,
      ) => void = () => undefined;
      const recovery = new Promise<
        Awaited<ReturnType<ListOwnedHumanFollowUps['listOwned']>>
      >((resolve) => {
        finishRecovery = resolve;
      });
      const listOwned = vi
        .fn<ListOwnedHumanFollowUps['listOwned']>()
        .mockResolvedValueOnce(
          successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
        )
        .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
        .mockImplementationOnce(() => recovery);
      let recoveryStarted = false;
      let toolbarFocusedAtCommit = false;
      function recover(): void {
        const retry = screen.queryByRole('button', { name: 'Try again' });
        if (retry === null || recoveryStarted) return;
        recoveryStarted = true;
        retry.focus();
        fireEvent.click(retry);
      }
      renderWorkspace({ listOwned }, (view) => (
        <>
          {renderWorkspaceShell(view)}
          <WorkspaceCommitObserver
            onCommit={() => {
              if (
                retryTiming === 'before passive effects' &&
                !toolbarFocusedAtCommit &&
                screen.queryByRole('heading', {
                  name: 'Your active work is temporarily unavailable.',
                }) !== null
              ) {
                toolbarFocusedAtCommit = true;
                screen
                  .getByRole('button', { name: 'Back to active work' })
                  .focus();
              }
            }}
          />
        </>
      ));
      await openConsole();
      fireEvent.click(
        screen.getByRole('button', { name: 'Recheck current claim' }),
      );
      await screen.findByRole('button', { name: 'Try again' });
      if (retryTiming === 'before passive effects') {
        expect(toolbarFocusedAtCommit).toBe(true);
        expect(document.activeElement).toBe(
          screen.getByRole('button', { name: 'Back to active work' }),
        );
      }
      recover();
      const back = screen.getByRole('button', { name: 'Back to active work' });
      expect(document.activeElement).toBe(back);
      await waitFor(() => expect(listOwned).toHaveBeenCalledTimes(3));
      expect(screen.queryByText('Private Console evidence')).toBeNull();
      expect(screen.queryByText('Verified actor display')).toBeNull();
      expect(
        screen
          .getAllByRole('heading', { level: 3 })
          .map((heading) => heading.textContent),
      ).toEqual([
        'Evidence withheld',
        'Execution withheld',
        'Outcome withheld',
      ]);
      finishRecovery(successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null));
      expect(await screen.findByText('Private Console evidence')).toBeTruthy();
      expect(document.activeElement).toBe(back);
    },
  );
  it('retains stable toolbar focus through a held case-context recovery and fresh evidence', async () => {
    let finishRecovery: (
      result: Awaited<
        ReturnType<GetOwnedFollowUpCaseSummary['getOwnedCaseSummary']>
      >,
    ) => void = () => undefined;
    const recovery = new Promise<
      Awaited<ReturnType<GetOwnedFollowUpCaseSummary['getOwnedCaseSummary']>>
    >((resolve) => {
      finishRecovery = resolve;
    });
    const getOwnedCaseSummary = vi
      .fn<GetOwnedFollowUpCaseSummary['getOwnedCaseSummary']>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
      .mockImplementationOnce(() => recovery);
    renderWorkspace({ getOwnedCaseSummary });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open resolver console' }),
    );
    const retry = await screen.findByRole('button', {
      name: 'Try case context again',
    });
    retry.focus();
    fireEvent.click(retry);
    const back = screen.getByRole('button', { name: 'Back to active work' });
    expect(document.activeElement).toBe(back);
    await waitFor(() => expect(getOwnedCaseSummary).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Private Console evidence')).toBeNull();
    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(['Evidence withheld', 'Execution withheld', 'Outcome withheld']);
    finishRecovery({
      ok: true,
      summary: resolverFollowUpCaseSummary(
        FIRST_WORK_ITEM_ID,
        'Private Console evidence',
      ),
    });
    expect(await screen.findByText('Private Console evidence')).toBeTruthy();
    expect(document.activeElement).toBe(back);
  });
  it('retains stable toolbar focus while an invalid claimed-work page recovers through the first page', async () => {
    const nextCursor = {
      afterClaimedAt: '2026-09-22T10:15:00Z',
      afterClaimId: '77777777-7777-4777-8777-777777777777',
    };
    let finishRecovery: (
      result: Awaited<ReturnType<ListOwnedHumanFollowUps['listOwned']>>,
    ) => void = () => undefined;
    const recovery = new Promise<
      Awaited<ReturnType<ListOwnedHumanFollowUps['listOwned']>>
    >((resolve) => {
      finishRecovery = resolve;
    });
    const listOwned = vi
      .fn<ListOwnedHumanFollowUps['listOwned']>()
      .mockResolvedValueOnce(
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, nextCursor),
      )
      .mockResolvedValueOnce(
        successfulOwnedFollowUpResult(SECOND_WORK_ITEM_ID, null),
      )
      .mockResolvedValueOnce({ ok: false, error: { kind: 'invalid-page' } })
      .mockImplementationOnce(() => recovery);
    const store = createFollowUpTestStore({
      listOwned,
      getOwnedCaseSummary: async () => ({
        ok: true,
        summary: resolverFollowUpCaseSummary(
          SECOND_WORK_ITEM_ID,
          'Private Console evidence',
        ),
      }),
    });
    render(
      <Provider store={store}>
        <ResolverOwnedHumanFollowUps
          tenantId={TENANT_ID}
          signInHref="/bff/login"
          consoleActorDetails={<span>Verified actor display</span>}
        />
      </Provider>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Next claimed-work page' }),
    );
    expect(await screen.findByText(SECOND_WORK_ITEM_ID)).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Open resolver console' }),
    );
    expect(await screen.findByText('Private Console evidence')).toBeTruthy();
    // The unsubscribed first-page cache retires too, so reset exercises a real read.
    store.dispatch(
      humanFollowUpApi.util.invalidateTags([
        { type: 'ResolverOwnedHumanFollowUps', id: TENANT_ID },
      ]),
    );
    const recover = await screen.findByRole('button', {
      name: 'Return to first claimed-work page',
    });
    recover.focus();
    fireEvent.click(recover);
    const back = screen.getByRole('button', { name: 'Back to active work' });
    expect(document.activeElement).toBe(back);
    await waitFor(() => expect(listOwned).toHaveBeenCalledTimes(4));
    expect(listOwned).toHaveBeenLastCalledWith(
      { tenantId: TENANT_ID, limit: 25 },
      expect.any(AbortSignal),
    );
    expect(screen.queryByText('Private Console evidence')).toBeNull();
    expect(screen.queryByText('Verified actor display')).toBeNull();
    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(['Evidence withheld', 'Execution withheld', 'Outcome withheld']);
    finishRecovery(successfulOwnedFollowUpResult(SECOND_WORK_ITEM_ID, null));
    expect(await screen.findByText('Private Console evidence')).toBeTruthy();
    expect(document.activeElement).toBe(back);
  });
  it('preserves inbox traversal across a Console detour without rendering suspended rows', async () => {
    let finishResumedRead: (
      result: Awaited<ReturnType<ListOpenHumanFollowUps['listOpen']>>,
    ) => void = () => undefined;
    const resumedRead = new Promise<
      Awaited<ReturnType<ListOpenHumanFollowUps['listOpen']>>
    >((resolve) => {
      finishResumedRead = resolve;
    });
    const listOpen = vi
      .fn<ListOpenHumanFollowUps['listOpen']>(async (query) =>
        query.cursor === undefined
          ? successfulOpenFollowUpResult(FIRST_WORK_ITEM_ID, cursor)
          : successfulOpenFollowUpResult(SECOND_WORK_ITEM_ID, null),
      )
      .mockResolvedValueOnce(
        successfulOpenFollowUpResult(FIRST_WORK_ITEM_ID, cursor),
      )
      .mockResolvedValueOnce(
        successfulOpenFollowUpResult(SECOND_WORK_ITEM_ID, null),
      )
      .mockImplementationOnce(() => resumedRead);
    renderWorkspace({ listOpen });
    const inbox = await screen.findByRole('region', {
      name: 'Open follow-up work',
    });
    fireEvent.click(
      await within(inbox).findByRole('button', { name: 'Next page' }),
    );
    expect(await within(inbox).findByText(SECOND_WORK_ITEM_ID)).toBeTruthy();

    await openConsole();
    expect(
      screen.queryByRole('region', { name: 'Open follow-up work' }),
    ).toBeNull();
    expect(screen.queryByText(SECOND_WORK_ITEM_ID)).toBeNull();
    const readsWhileSuspended = listOpen.mock.calls.length;

    fireEvent.click(
      screen.getByRole('button', { name: 'Back to active work' }),
    );
    const restoredInbox = await screen.findByRole('region', {
      name: 'Open follow-up work',
    });
    expect(
      await within(restoredInbox).findByText(SECOND_WORK_ITEM_ID),
    ).toBeTruthy();
    await waitFor(() =>
      expect(listOpen).toHaveBeenCalledTimes(readsWhileSuspended + 1),
    );
    expect(listOpen).toHaveBeenLastCalledWith(
      { tenantId: TENANT_ID, limit: 25, cursor },
      expect.any(AbortSignal),
    );
    const previousPage = within(restoredInbox).getByRole('button', {
      name: 'Previous page',
    });
    expect(previousPage).toHaveProperty('disabled', true);
    expect(screen.queryByText('Private Console evidence')).toBeNull();
    finishResumedRead(successfulOpenFollowUpResult(SECOND_WORK_ITEM_ID, null));
    // Request acquisition and cached rows do not establish that the resumed read has committed.
    await waitFor(() =>
      expect(
        within(restoredInbox).getByRole('button', { name: 'Previous page' }),
      ).toHaveProperty('disabled', false),
    );
    expect(screen.queryByText('Private Console evidence')).toBeNull();
    fireEvent.click(
      within(restoredInbox).getByRole('button', { name: 'Previous page' }),
    );
    await waitFor(() =>
      expect(listOpen).toHaveBeenCalledTimes(readsWhileSuspended + 2),
    );
    expect(listOpen).toHaveBeenLastCalledWith(
      { tenantId: TENANT_ID, limit: 25 },
      expect.any(AbortSignal),
    );
    expect(
      await within(restoredInbox).findByText(FIRST_WORK_ITEM_ID),
    ).toBeTruthy();
  });

  it('retains the exact uncertain claim command across the detour without automatic replay', async () => {
    const claim = vi
      .fn<ClaimHumanFollowUp['claim']>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
      .mockResolvedValueOnce({
        ok: true,
        claim: followUpClaim(SECOND_WORK_ITEM_ID),
      });
    renderWorkspace({
      listOpen: async () =>
        successfulOpenFollowUpResult(SECOND_WORK_ITEM_ID, null, 2),
      claim,
    });
    const inbox = await screen.findByRole('region', {
      name: 'Open follow-up work',
    });
    fireEvent.click(
      await within(inbox).findByRole('button', {
        name: 'Claim Retry attempt limit reached follow-up',
      }),
    );
    expect(
      await within(inbox).findByRole('button', { name: 'Try claim again' }),
    ).toBeTruthy();
    const originalIntent = claim.mock.calls[0]?.[0];

    await openConsole();
    expect(
      screen.queryByRole('button', { name: 'Try claim again' }),
    ).toBeNull();
    expect(claim).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole('button', { name: 'Back to active work' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Try claim again' }),
    );
    expect(await screen.findByText('Follow-up claimed.')).toBeTruthy();
    expect(claim).toHaveBeenCalledTimes(2);
    expect(claim.mock.calls[1]?.[0]).toEqual(originalIntent);
    expect(originalIntent).toEqual({
      tenantId: TENANT_ID,
      workItemId: SECOND_WORK_ITEM_ID,
      commandId: expect.any(String),
      expectedOwnershipRevision: 2,
    });
  });
});

async function openConsole(): Promise<void> {
  const owned = await screen.findByRole('region', {
    name: 'Claimed follow-ups',
  });
  fireEvent.click(
    await within(owned).findByRole('button', { name: 'Open resolver console' }),
  );
  expect(
    await screen.findByRole('region', { name: 'Resolver Console' }),
  ).toBeTruthy();
  expect(await screen.findByText('Private Console evidence')).toBeTruthy();
}

function renderWorkspace(
  capabilities: FollowUpTestCapabilities,
  shell: WorkspaceRenderer = renderWorkspaceShell,
) {
  const store = createFollowUpTestStore({
    listOwned: async () =>
      successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
    getOwnedCaseSummary: async () => ({
      ok: true,
      summary: resolverFollowUpCaseSummary(
        FIRST_WORK_ITEM_ID,
        'Private Console evidence',
      ),
    }),
    ...capabilities,
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <HumanFollowUpWorkspace
          tenantId={TENANT_ID}
          signInHref="/bff/login"
          actorDetails={<span>Verified actor display</span>}
          consoleActorDetails={<span>Verified actor display</span>}
          renderWorkspace={shell}
        />
      </MemoryRouter>
    </Provider>,
  );
}

const renderWorkspaceShell: WorkspaceRenderer = ({
  mode,
  toolbar,
  content,
}) => (
  <div data-workbench-mode={mode}>
    <div>{toolbar}</div>
    <main>{content}</main>
  </div>
);

// Models toolbar focus intent as soon as the failure DOM commits, before passive
// effects flush. This exposes focus ordering without timers or repeated tests.
function WorkspaceCommitObserver({
  onCommit,
}: {
  readonly onCommit: () => void;
}): null {
  useLayoutEffect(onCommit);
  return null;
}
