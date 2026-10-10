import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type {
  ClaimHumanFollowUp,
  HumanFollowUpResult,
  ListOpenHumanFollowUps,
} from '@ergon/follow-up-data-access-web';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import {
  FIRST_WORK_ITEM_ID,
  followUpClaim,
  SECOND_WORK_ITEM_ID,
  successfulOpenFollowUpResult,
  TENANT_ID,
} from './follow-up-fixtures';
import {
  createFollowUpTestStore,
  type FollowUpTestCapabilities,
} from './follow-up-test-store';
import { HumanFollowUpInbox } from '../src';

const SIGN_IN_HREF = `/bff/login?returnTo=%2Ftenants%2F${TENANT_ID}`;

describe('human follow-up inbox', () => {
  it('renders visible work without provider identity data', async () => {
    renderInbox(
      `/tenants/${TENANT_ID}`,
      listOpenReturning(successfulOpenFollowUpResult(FIRST_WORK_ITEM_ID, null)),
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
      listOpenReturning({
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
    const listOpen = vi.fn<ListOpenHumanFollowUps['listOpen']>();
    renderInbox(`/tenants/${TENANT_ID}?queue=UpperCase`, { listOpen });

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Queue filter is invalid.',
      }),
    ).toBeTruthy();
    expect(listOpen).not.toHaveBeenCalled();
  });

  it('uses the composition-supplied sign-in target after session expiry', async () => {
    renderInbox(`/tenants/${TENANT_ID}`, {
      async listOpen() {
        return {
          ok: false,
          error: { kind: 'authentication-required' },
        };
      },
    });

    const signIn = await screen.findByRole('link', { name: 'Sign in again' });
    expect(signIn.getAttribute('href')).toBe(SIGN_IN_HREF);
  });

  it('stores the queue filter in the URL and resets to its first page', async () => {
    const listOpen = vi
      .fn<ListOpenHumanFollowUps['listOpen']>()
      .mockResolvedValue({
        ok: true,
        page: { items: [], nextCursor: null },
      });
    const { router } = renderInbox(`/tenants/${TENANT_ID}`, { listOpen });

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
      .fn<ListOpenHumanFollowUps['listOpen']>()
      .mockResolvedValueOnce(
        successfulOpenFollowUpResult(FIRST_WORK_ITEM_ID, nextCursor),
      )
      .mockResolvedValueOnce(
        successfulOpenFollowUpResult(SECOND_WORK_ITEM_ID, null),
      );
    renderInbox(`/tenants/${TENANT_ID}`, { listOpen });

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
      .fn<ListOpenHumanFollowUps['listOpen']>()
      .mockResolvedValue(
        successfulOpenFollowUpResult(FIRST_WORK_ITEM_ID, null),
      );
    const claim = vi.fn<ClaimHumanFollowUp['claim']>().mockResolvedValue({
      ok: true,
      claim: followUpClaim(FIRST_WORK_ITEM_ID),
    });
    renderInbox(`/tenants/${TENANT_ID}`, { listOpen, claim });

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Claim Retry attempt limit reached follow-up',
      }),
    );

    expect(
      await screen.findByRole('status', { name: /follow-up claimed/i }),
    ).toBeTruthy();
    expect(claim).toHaveBeenCalledWith(
      {
        tenantId: TENANT_ID,
        workItemId: FIRST_WORK_ITEM_ID,
        commandId: expect.any(String),
        expectedOwnershipRevision: 0,
      },
      expect.any(AbortSignal),
    );
    await waitFor(() => expect(listOpen).toHaveBeenCalledTimes(2));
  });

  it('uses the returned-to-queue ownership revision for a new claim', async () => {
    const claim = vi.fn<ClaimHumanFollowUp['claim']>().mockResolvedValue({
      ok: true,
      claim: followUpClaim(FIRST_WORK_ITEM_ID),
    });
    renderInbox(`/tenants/${TENANT_ID}`, {
      ...listOpenReturning(
        successfulOpenFollowUpResult(FIRST_WORK_ITEM_ID, null, 2),
      ),
      claim,
    });

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Claim Retry attempt limit reached follow-up',
      }),
    );

    await waitFor(() =>
      expect(claim).toHaveBeenCalledWith(
        expect.objectContaining({ expectedOwnershipRevision: 2 }),
        expect.any(AbortSignal),
      ),
    );
  });

  it('announces a competing claim and refreshes stale work', async () => {
    const listOpen = vi
      .fn<ListOpenHumanFollowUps['listOpen']>()
      .mockResolvedValue(
        successfulOpenFollowUpResult(FIRST_WORK_ITEM_ID, null),
      );
    const claim = vi.fn<ClaimHumanFollowUp['claim']>().mockResolvedValue({
      ok: false,
      error: { kind: 'already-claimed' },
    });
    renderInbox(`/tenants/${TENANT_ID}`, { listOpen, claim });

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
      .fn<ClaimHumanFollowUp['claim']>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
      .mockResolvedValueOnce({
        ok: true,
        claim: followUpClaim(FIRST_WORK_ITEM_ID),
      });
    renderInbox(`/tenants/${TENANT_ID}`, {
      ...listOpenReturning(
        successfulOpenFollowUpResult(FIRST_WORK_ITEM_ID, null),
      ),
      claim,
    });

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
    expect(claim.mock.calls[1]?.[0]).toEqual(claim.mock.calls[0]?.[0]);
  });

  it('preserves the original command identity after an unexpected claim defect', async () => {
    const claim = vi
      .fn<ClaimHumanFollowUp['claim']>()
      .mockRejectedValueOnce(new Error('private claim sentinel'))
      .mockResolvedValueOnce({
        ok: true,
        claim: followUpClaim(FIRST_WORK_ITEM_ID),
      });
    renderInbox(`/tenants/${TENANT_ID}`, {
      ...listOpenReturning(
        successfulOpenFollowUpResult(FIRST_WORK_ITEM_ID, null, 2),
      ),
      claim,
    });
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Claim Retry attempt limit reached follow-up',
      }),
    );
    expect(
      await screen.findByRole('alert', {
        name: 'The workbench could not confirm the claim result.',
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Ownership may already have been recorded/),
    ).toBeTruthy();
    expect(screen.queryByText(/private claim sentinel/)).toBeNull();
    expect(claim).toHaveBeenCalledTimes(1);
    const originalIntent = claim.mock.calls[0]?.[0];
    expect(originalIntent).toEqual({
      tenantId: TENANT_ID,
      workItemId: FIRST_WORK_ITEM_ID,
      commandId: expect.any(String),
      expectedOwnershipRevision: 2,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Try claim again' }));
    expect(await screen.findByText('Follow-up claimed.')).toBeTruthy();
    expect(claim).toHaveBeenCalledTimes(2);
    expect(claim.mock.calls[1]?.[0]).toEqual(originalIntent);
  });
});

function renderInbox(path: string, capabilities: FollowUpTestCapabilities) {
  const router = createMemoryRouter(
    [
      {
        path: '/tenants/:tenantId',
        element: (
          <HumanFollowUpInbox tenantId={TENANT_ID} signInHref={SIGN_IN_HREF} />
        ),
      },
    ],
    { initialEntries: [path] },
  );
  const store = createFollowUpTestStore(capabilities);
  const rendered = render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  );
  return { ...rendered, router };
}

function listOpenReturning(
  result: HumanFollowUpResult,
): FollowUpTestCapabilities {
  return {
    async listOpen() {
      return result;
    },
  };
}
