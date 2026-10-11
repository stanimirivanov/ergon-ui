import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type {
  ClaimHumanFollowUp,
  ListOpenHumanFollowUps,
} from '@ergon/follow-up-data-access-web';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { HumanFollowUpWorkspace } from '../src';
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
  it('preserves inbox traversal across a Console detour without rendering suspended rows', async () => {
    const listOpen = vi.fn<ListOpenHumanFollowUps['listOpen']>(async (query) =>
      query.cursor === undefined
        ? successfulOpenFollowUpResult(FIRST_WORK_ITEM_ID, cursor)
        : successfulOpenFollowUpResult(SECOND_WORK_ITEM_ID, null),
    );
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
    expect(
      within(restoredInbox).getByRole('button', { name: 'Previous page' }),
    ).toHaveProperty('disabled', false);
    expect(screen.queryByText('Private Console evidence')).toBeNull();
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

function renderWorkspace(capabilities: FollowUpTestCapabilities) {
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
        />
      </MemoryRouter>
    </Provider>,
  );
}
