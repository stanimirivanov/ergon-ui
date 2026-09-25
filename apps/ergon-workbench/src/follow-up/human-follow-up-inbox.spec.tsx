import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { createWorkbenchStore } from '../app/store';
import type { CurrentActorClient } from '../session/current-actor-client';
import type {
  HumanFollowUpClient,
  HumanFollowUpResult,
} from './human-follow-up-client';
import { HumanFollowUpInbox } from './human-follow-up-inbox';

const TENANT_ID = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';
const FIRST_WORK_ITEM_ID = '11111111-1111-4111-8111-111111111111';
const SECOND_WORK_ITEM_ID = '55555555-5555-4555-8555-555555555555';

describe('human follow-up inbox', () => {
  it('renders visible work without provider identity data', async () => {
    renderInbox(
      `/tenants/${TENANT_ID}`,
      clientReturning(pageWith(FIRST_WORK_ITEM_ID, null)),
    );

    expect(
      await screen.findByRole('heading', {
        level: 3,
        name: 'Retry attempt limit reached',
      }),
    ).toBeTruthy();
    expect(screen.getByText('access-restoration')).toBeTruthy();
    expect(screen.queryByText('employee-42')).toBeNull();
    expect(screen.getByRole('button', { name: 'Next page' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('presents an empty authorized page without implying absent authority', async () => {
    renderInbox(
      `/tenants/${TENANT_ID}`,
      clientReturning({
        ok: true,
        page: { items: [], nextCursor: null },
      }),
    );

    expect(
      await screen.findByRole('heading', {
        level: 3,
        name: 'No open work in this view.',
      }),
    ).toBeTruthy();
    expect(screen.queryByText(/not authorized/i)).toBeNull();
  });

  it('keeps an invalid shareable queue filter out of the HTTP boundary', async () => {
    const listOpen = vi.fn<HumanFollowUpClient['listOpen']>();
    renderInbox(`/tenants/${TENANT_ID}?queue=UpperCase`, {
      listOpen,
      listOwned: unusedListOwned,
      claim: unusedClaim,
    });

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Queue filter is invalid.',
      }),
    ).toBeTruthy();
    expect(listOpen).not.toHaveBeenCalled();
  });

  it('stores the queue filter in the URL and resets to its first page', async () => {
    const listOpen = vi
      .fn<HumanFollowUpClient['listOpen']>()
      .mockResolvedValue({
        ok: true,
        page: { items: [], nextCursor: null },
      });
    const { router } = renderInbox(`/tenants/${TENANT_ID}`, {
      listOpen,
      listOwned: unusedListOwned,
      claim: unusedClaim,
    });

    await waitFor(() => expect(listOpen).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByRole('textbox', { name: 'Queue key' }), {
      target: { value: 'access-restoration' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filter' }));

    await waitFor(() =>
      expect(listOpen).toHaveBeenLastCalledWith(
        {
          tenantId: TENANT_ID,
          limit: 25,
          queueKey: 'access-restoration',
        },
        expect.any(AbortSignal),
      ),
    );
    expect(router.state.location.search).toBe('?queue=access-restoration');
  });

  it('keeps the exact keyset cursor together when moving between pages', async () => {
    const nextCursor = {
      afterOpenedAt: '2026-09-21T09:30:00Z',
      afterWorkItemId: FIRST_WORK_ITEM_ID,
    };
    const listOpen = vi
      .fn<HumanFollowUpClient['listOpen']>()
      .mockResolvedValueOnce(pageWith(FIRST_WORK_ITEM_ID, nextCursor))
      .mockResolvedValueOnce(pageWith(SECOND_WORK_ITEM_ID, null));
    renderInbox(`/tenants/${TENANT_ID}`, {
      listOpen,
      listOwned: unusedListOwned,
      claim: unusedClaim,
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Next page' }));

    await waitFor(() =>
      expect(listOpen).toHaveBeenLastCalledWith(
        { tenantId: TENANT_ID, limit: 25, cursor: nextCursor },
        expect.any(AbortSignal),
      ),
    );
    expect(await screen.findByText(SECOND_WORK_ITEM_ID)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(await screen.findByText(FIRST_WORK_ITEM_ID)).toBeTruthy();
  });

  it('claims visible work and refreshes the tenant inbox', async () => {
    const listOpen = vi
      .fn<HumanFollowUpClient['listOpen']>()
      .mockResolvedValue(pageWith(FIRST_WORK_ITEM_ID, null));
    const claim = vi.fn<HumanFollowUpClient['claim']>().mockResolvedValue({
      ok: true,
      claim: claimFor(FIRST_WORK_ITEM_ID),
    });
    renderInbox(`/tenants/${TENANT_ID}`, {
      listOpen,
      listOwned: unusedListOwned,
      claim,
    });

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Claim Retry attempt limit reached follow-up',
      }),
    );

    expect(
      await screen.findByRole('status', { name: /follow-up claimed/i }),
    ).toBeTruthy();
    expect(claim).toHaveBeenCalledWith(
      { tenantId: TENANT_ID, workItemId: FIRST_WORK_ITEM_ID },
      expect.any(AbortSignal),
    );
    await waitFor(() => expect(listOpen).toHaveBeenCalledTimes(2));
  });

  it('announces a competing claim and refreshes stale work', async () => {
    const listOpen = vi
      .fn<HumanFollowUpClient['listOpen']>()
      .mockResolvedValue(pageWith(FIRST_WORK_ITEM_ID, null));
    const claim = vi.fn<HumanFollowUpClient['claim']>().mockResolvedValue({
      ok: false,
      error: { kind: 'already-claimed' },
    });
    renderInbox(`/tenants/${TENANT_ID}`, {
      listOpen,
      listOwned: unusedListOwned,
      claim,
    });

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Claim Retry attempt limit reached follow-up',
      }),
    );

    expect(
      await screen.findByRole('alert', {
        name: /another resolver claimed this work/i,
      }),
    ).toBeTruthy();
    await waitFor(() => expect(listOpen).toHaveBeenCalledTimes(2));
  });

  it('offers an explicit safe retry after an ambiguous claim failure', async () => {
    const claim = vi
      .fn<HumanFollowUpClient['claim']>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
      .mockResolvedValueOnce({
        ok: true,
        claim: claimFor(FIRST_WORK_ITEM_ID),
      });
    renderInbox(
      `/tenants/${TENANT_ID}`,
      clientReturning(pageWith(FIRST_WORK_ITEM_ID, null), claim),
    );

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Claim Retry attempt limit reached follow-up',
      }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Try claim again' }),
    );

    expect(await screen.findByText('Follow-up claimed.')).toBeTruthy();
    expect(claim).toHaveBeenCalledTimes(2);
  });
});

function renderInbox(path: string, humanFollowUpClient: HumanFollowUpClient) {
  const router = createMemoryRouter(
    [
      {
        path: '/tenants/:tenantId',
        element: <HumanFollowUpInbox tenantId={TENANT_ID} />,
      },
    ],
    { initialEntries: [path] },
  );
  const store = createWorkbenchStore({
    currentActorClient: unusedCurrentActorClient,
    humanFollowUpClient,
  });
  const rendered = render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  );
  return { ...rendered, router };
}

function clientReturning(
  result: HumanFollowUpResult,
  claim: HumanFollowUpClient['claim'] = unusedClaim,
): HumanFollowUpClient {
  return {
    async listOpen() {
      return result;
    },
    listOwned: unusedListOwned,
    claim,
  };
}

function pageWith(
  workItemId: string,
  nextCursor: {
    readonly afterOpenedAt: string;
    readonly afterWorkItemId: string;
  } | null,
): HumanFollowUpResult {
  return {
    ok: true,
    page: {
      items: [
        {
          workItemId,
          caseId: workItemId,
          runId: '33333333-3333-4333-8333-333333333333',
          escalationEventId: '44444444-4444-4444-8444-444444444444',
          reason: 'RETRY_ATTEMPT_LIMIT_REACHED',
          queueKey: 'access-restoration',
          status: 'OPEN',
          openedAt: '2026-09-21T09:30:00Z',
          recordedAt: '2026-09-21T09:30:01Z',
        },
      ],
      nextCursor,
    },
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

const unusedClaim: HumanFollowUpClient['claim'] = async () => {
  throw new Error('Claiming is not used by this test');
};

const unusedListOwned: HumanFollowUpClient['listOwned'] = async () => {
  throw new Error('Owned work is not used by this test');
};

const unusedCurrentActorClient: CurrentActorClient = {
  async resolve() {
    throw new Error('Current actor resolution is not used by this test');
  },
};
