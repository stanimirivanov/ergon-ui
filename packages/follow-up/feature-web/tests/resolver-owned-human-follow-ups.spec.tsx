import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type {
  ClaimHumanFollowUp,
  GetOwnedFollowUpCaseSummary,
  ListOpenHumanFollowUps,
  ListOwnedHumanFollowUps,
  ResolverFollowUpCaseSummaryResult,
} from '@ergon/follow-up-data-access-web';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import {
  FIRST_WORK_ITEM_ID,
  followUpClaim,
  resolverFollowUpCaseSummary,
  RUN_ID,
  SECOND_WORK_ITEM_ID,
  successfulOpenFollowUpResult,
  successfulOwnedFollowUpResult,
  TENANT_ID,
} from './follow-up-fixtures';
import {
  createFollowUpTestStore,
  type FollowUpTestCapabilities,
} from './follow-up-test-store';
import { HumanFollowUpInbox, ResolverOwnedHumanFollowUps } from '../src';

const SIGN_IN_HREF = `/bff/login?returnTo=%2Ftenants%2F${TENANT_ID}`;

describe('resolver-owned human follow-ups', () => {
  it('renders active work without internal ownership attribution', async () => {
    renderOwned({
      async listOwned() {
        return successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null);
      },
    });

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
    renderOwned({
      async listOwned() {
        return { ok: true, page: { items: [], nextCursor: null } };
      },
    });

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
      .fn<ListOwnedHumanFollowUps['listOwned']>()
      .mockResolvedValueOnce(
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, nextCursor),
      )
      .mockResolvedValueOnce(
        successfulOwnedFollowUpResult(SECOND_WORK_ITEM_ID, null),
      );
    renderOwned({ listOwned });

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
      .fn<ListOwnedHumanFollowUps['listOwned']>()
      .mockResolvedValueOnce({
        ok: true,
        page: { items: [], nextCursor: null },
      })
      .mockResolvedValue(
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      );
    const listOpen = vi
      .fn<ListOpenHumanFollowUps['listOpen']>()
      .mockResolvedValue(
        successfulOpenFollowUpResult(FIRST_WORK_ITEM_ID, null),
      );
    const claim = vi.fn<ClaimHumanFollowUp['claim']>().mockResolvedValue({
      ok: true,
      claim: followUpClaim(FIRST_WORK_ITEM_ID),
    });
    const store = createFollowUpTestStore({ listOwned, listOpen, claim });
    render(
      <Provider store={store}>
        <MemoryRouter>
          <ResolverOwnedHumanFollowUps
            tenantId={TENANT_ID}
            signInHref={SIGN_IN_HREF}
          />
          <HumanFollowUpInbox tenantId={TENANT_ID} signInHref={SIGN_IN_HREF} />
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

  it('lazily reveals validated case context and renders evidence as text', async () => {
    const getOwnedCaseSummary = vi
      .fn<GetOwnedFollowUpCaseSummary['getOwnedCaseSummary']>()
      .mockResolvedValue({
        ok: true,
        summary: resolverFollowUpCaseSummary(
          FIRST_WORK_ITEM_ID,
          '<img src="/tracking-pixel" alt="unsafe markup">',
        ),
      });
    renderOwned({
      listOwned: async () =>
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      getOwnedCaseSummary,
    });

    const disclosure = await screen.findByRole('button', {
      name: 'Review case context',
    });
    expect(getOwnedCaseSummary).not.toHaveBeenCalled();
    fireEvent.click(disclosure);

    expect(
      await screen.findByRole('heading', {
        level: 4,
        name: 'Restore access to the customer workspace',
      }),
    ).toBeTruthy();
    expect(
      screen.getByText('<img src="/tracking-pixel" alt="unsafe markup">'),
    ).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
    expect(
      screen.getByRole('heading', { level: 5, name: 'Automation handoff' }),
    ).toBeTruthy();
    expect(screen.getByText('identity-stub')).toBeTruthy();
    expect(
      screen.getByText(/Automated attempt 2 reached the configured limit of 2/),
    ).toBeTruthy();
    expect(screen.getByText('2 of 2')).toBeTruthy();
    expect(disclosure.getAttribute('aria-expanded')).toBe('true');
    expect(getOwnedCaseSummary).toHaveBeenCalledWith(
      {
        tenantId: TENANT_ID,
        workItemId: FIRST_WORK_ITEM_ID,
        caseId: FIRST_WORK_ITEM_ID,
        runId: RUN_ID,
      },
      expect.any(AbortSignal),
    );
  });

  it('rechecks ownership and hides cached evidence when case context reopens', async () => {
    let finishSecondRead: (
      result: ResolverFollowUpCaseSummaryResult,
    ) => void = () => undefined;
    const secondRead = new Promise<ResolverFollowUpCaseSummaryResult>(
      (resolve) => {
        finishSecondRead = resolve;
      },
    );
    const getOwnedCaseSummary = vi
      .fn<GetOwnedFollowUpCaseSummary['getOwnedCaseSummary']>()
      .mockResolvedValueOnce({
        ok: true,
        summary: resolverFollowUpCaseSummary(
          FIRST_WORK_ITEM_ID,
          'Private evidence',
        ),
      })
      .mockImplementationOnce(() => secondRead);
    renderOwned({
      listOwned: async () =>
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      getOwnedCaseSummary,
    });

    fireEvent.click(
      await screen.findByRole('button', { name: 'Review case context' }),
    );
    expect(await screen.findByText('Private evidence')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Hide case context' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Review case context' }),
    );

    expect(screen.queryByText('Private evidence')).toBeNull();
    await waitFor(() => expect(getOwnedCaseSummary).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Private evidence')).toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Loading case context…' }),
    ).toBeTruthy();

    finishSecondRead({ ok: false, error: { kind: 'not-found' } });
    expect(
      await screen.findByRole('heading', {
        name: 'Case context is no longer available.',
      }),
    ).toBeTruthy();
    expect(screen.queryByText('Private evidence')).toBeNull();
  });

  it('keeps unavailable case context non-disclosing', async () => {
    renderOwned({
      listOwned: async () =>
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      getOwnedCaseSummary: async () => ({
        ok: false,
        error: { kind: 'not-found' },
      }),
    });

    fireEvent.click(
      await screen.findByRole('button', { name: 'Review case context' }),
    );

    expect(
      await screen.findByRole('heading', {
        level: 4,
        name: 'Case context is no longer available.',
      }),
    ).toBeTruthy();
    expect(screen.queryByText(/another resolver/i)).toBeNull();
    expect(screen.queryByText(/not authorized/i)).toBeNull();
  });
});

function renderOwned(capabilities: FollowUpTestCapabilities) {
  const store = createFollowUpTestStore(capabilities);
  return render(
    <Provider store={store}>
      <ResolverOwnedHumanFollowUps
        tenantId={TENANT_ID}
        signInHref={SIGN_IN_HREF}
      />
    </Provider>,
  );
}
