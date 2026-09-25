import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { createWorkbenchStore } from '../app/store';
import type { CurrentActorClient } from '../session/current-actor-client';
import type {
  HumanFollowUpClient,
  ResolverOwnedHumanFollowUpResult,
} from './human-follow-up-client';
import { HumanFollowUpInbox } from './human-follow-up-inbox';
import { ResolverOwnedHumanFollowUps } from './resolver-owned-human-follow-ups';

const TENANT_ID = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';
const FIRST_WORK_ITEM_ID = '11111111-1111-4111-8111-111111111111';
const SECOND_WORK_ITEM_ID = '55555555-5555-4555-8555-555555555555';

describe('resolver-owned human follow-ups', () => {
  it('renders active work without internal ownership attribution', async () => {
    renderOwned(clientReturning(ownedPageWith(FIRST_WORK_ITEM_ID, null)));

    expect(
      await screen.findByRole('heading', {
        level: 3,
        name: 'Retry attempt limit reached',
      }),
    ).toBeTruthy();
    expect(screen.getByText('access-restoration')).toBeTruthy();
    expect(screen.getByText('22 Sept 2026, 10:15 UTC')).toBeTruthy();
    expect(screen.queryByText('employee-42')).toBeNull();
    expect(screen.queryByText('groups/resolvers')).toBeNull();
  });

  it('keeps an empty active-work page neutral', async () => {
    renderOwned(
      clientReturning({
        ok: true,
        page: { items: [], nextCursor: null },
      }),
    );

    expect(
      await screen.findByRole('heading', {
        level: 3,
        name: 'No active claimed work in this view.',
      }),
    ).toBeTruthy();
    expect(screen.queryByText(/not authorized/i)).toBeNull();
  });

  it('keeps the exact claim cursor together between pages', async () => {
    const nextCursor = {
      afterClaimedAt: '2026-09-22T10:15:00Z',
      afterClaimId: '77777777-7777-4777-8777-777777777777',
    };
    const listOwned = vi
      .fn<HumanFollowUpClient['listOwned']>()
      .mockResolvedValueOnce(ownedPageWith(FIRST_WORK_ITEM_ID, nextCursor))
      .mockResolvedValueOnce(ownedPageWith(SECOND_WORK_ITEM_ID, null));
    renderOwned({ listOwned, listOpen: unusedListOpen, claim: unusedClaim });

    fireEvent.click(
      await screen.findByRole('button', { name: 'Next claimed-work page' }),
    );

    await waitFor(() =>
      expect(listOwned).toHaveBeenLastCalledWith(
        { tenantId: TENANT_ID, limit: 25, cursor: nextCursor },
        expect.any(AbortSignal),
      ),
    );
    expect(await screen.findByText(SECOND_WORK_ITEM_ID)).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: 'Previous claimed-work page' }),
    );
    expect(await screen.findByText(FIRST_WORK_ITEM_ID)).toBeTruthy();
  });

  it('refreshes active work after a successful claim', async () => {
    const listOwned = vi
      .fn<HumanFollowUpClient['listOwned']>()
      .mockResolvedValueOnce({
        ok: true,
        page: { items: [], nextCursor: null },
      })
      .mockResolvedValue(ownedPageWith(FIRST_WORK_ITEM_ID, null));
    const listOpen = vi
      .fn<HumanFollowUpClient['listOpen']>()
      .mockResolvedValue(openPageWith(FIRST_WORK_ITEM_ID));
    const claim = vi.fn<HumanFollowUpClient['claim']>().mockResolvedValue({
      ok: true,
      claim: claimFor(FIRST_WORK_ITEM_ID),
    });
    const client = { listOwned, listOpen, claim };
    const store = createWorkbenchStore({
      currentActorClient: unusedCurrentActorClient,
      humanFollowUpClient: client,
    });
    render(
      <Provider store={store}>
        <MemoryRouter>
          <ResolverOwnedHumanFollowUps tenantId={TENANT_ID} />
          <HumanFollowUpInbox tenantId={TENANT_ID} />
        </MemoryRouter>
      </Provider>,
    );

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Claim Retry attempt limit reached follow-up',
      }),
    );

    await waitFor(() => expect(listOwned).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('22 Sept 2026, 10:15 UTC')).toBeTruthy();
  });
});

function renderOwned(humanFollowUpClient: HumanFollowUpClient) {
  const store = createWorkbenchStore({
    currentActorClient: unusedCurrentActorClient,
    humanFollowUpClient,
  });
  return render(
    <Provider store={store}>
      <ResolverOwnedHumanFollowUps tenantId={TENANT_ID} />
    </Provider>,
  );
}

function clientReturning(
  result: ResolverOwnedHumanFollowUpResult,
): HumanFollowUpClient {
  return {
    async listOwned() {
      return result;
    },
    listOpen: unusedListOpen,
    claim: unusedClaim,
  };
}

function ownedPageWith(
  workItemId: string,
  nextCursor: {
    readonly afterClaimedAt: string;
    readonly afterClaimId: string;
  } | null,
): ResolverOwnedHumanFollowUpResult {
  return {
    ok: true,
    page: {
      items: [
        { workItem: workItemFor(workItemId), claim: claimFor(workItemId) },
      ],
      nextCursor,
    },
  };
}

function openPageWith(workItemId: string) {
  return {
    ok: true as const,
    page: { items: [workItemFor(workItemId)], nextCursor: null },
  };
}

function workItemFor(workItemId: string) {
  return {
    workItemId,
    caseId: workItemId,
    runId: '33333333-3333-4333-8333-333333333333',
    escalationEventId: '44444444-4444-4444-8444-444444444444',
    reason: 'RETRY_ATTEMPT_LIMIT_REACHED',
    queueKey: 'access-restoration',
    status: 'OPEN' as const,
    openedAt: '2026-09-21T09:30:00Z',
    recordedAt: '2026-09-21T09:30:01Z',
  };
}

function claimFor(workItemId: string) {
  return {
    claimId: '77777777-7777-4777-8777-777777777777',
    workItemId,
    claimedAt: '2026-09-22T10:15:00Z',
    recordedAt: '2026-09-22T10:15:01Z',
  };
}

const unusedListOpen: HumanFollowUpClient['listOpen'] = async () => {
  throw new Error('Shared inbox is not used by this test');
};

const unusedClaim: HumanFollowUpClient['claim'] = async () => {
  throw new Error('Claiming is not used by this test');
};

const unusedCurrentActorClient: CurrentActorClient = {
  async resolve() {
    throw new Error('Current actor resolution is not used by this test');
  },
};
