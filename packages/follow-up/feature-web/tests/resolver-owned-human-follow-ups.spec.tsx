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
  ReleaseHumanFollowUp,
  ResolverFollowUpCaseSummaryResult,
} from '@ergon/follow-up-data-access-web';
import { humanFollowUpApi } from '@ergon/follow-up-data-access-web';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import {
  FIRST_WORK_ITEM_ID,
  followUpClaim,
  followUpRelease,
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
            consoleActorDetails={<span>Verified resolver test identity</span>}
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

  it('retires success feedback when a later ownership revision supersedes it', async () => {
    let ownershipRevision = 0;
    const listOpen = vi.fn<ListOpenHumanFollowUps['listOpen']>(async () =>
      ownershipRevision % 2 === 0
        ? successfulOpenFollowUpResult(
            FIRST_WORK_ITEM_ID,
            null,
            ownershipRevision,
          )
        : { ok: true, page: { items: [], nextCursor: null } },
    );
    const listOwned = vi.fn<ListOwnedHumanFollowUps['listOwned']>(async () =>
      ownershipRevision % 2 === 1
        ? successfulOwnedFollowUpResult(
            FIRST_WORK_ITEM_ID,
            null,
            ownershipRevision,
            '99999999-9999-4999-8999-999999999999',
          )
        : { ok: true, page: { items: [], nextCursor: null } },
    );
    const claim = vi.fn<ClaimHumanFollowUp['claim']>(async (command) => {
      ownershipRevision = command.expectedOwnershipRevision + 1;
      return { ok: true, claim: followUpClaim(command.workItemId) };
    });
    const release = vi.fn<ReleaseHumanFollowUp['release']>(async () => {
      ownershipRevision = 2;
      return { ok: true, release: followUpRelease(FIRST_WORK_ITEM_ID) };
    });
    const store = createFollowUpTestStore({
      listOpen,
      listOwned,
      claim,
      release,
    });
    render(
      <Provider store={store}>
        <MemoryRouter>
          <ResolverOwnedHumanFollowUps
            tenantId={TENANT_ID}
            signInHref={SIGN_IN_HREF}
            consoleActorDetails={<span>Verified resolver test identity</span>}
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
    expect(
      await screen.findByRole('status', { name: 'Follow-up claimed' }),
    ).toBeTruthy();
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Release Retry attempt limit reached follow-up',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm release' }));

    expect(
      await screen.findByRole('status', { name: 'Follow-up released' }),
    ).toBeTruthy();
    await waitFor(() =>
      expect(
        screen.queryByRole('status', { name: 'Follow-up claimed' }),
      ).toBeNull(),
    );
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Claim Retry attempt limit reached follow-up',
      }),
    );

    await waitFor(() => expect(claim).toHaveBeenCalledTimes(2));
    expect(claim.mock.calls[1]?.[0].expectedOwnershipRevision).toBe(2);
    await waitFor(() =>
      expect(
        screen.queryByRole('status', { name: 'Follow-up released' }),
      ).toBeNull(),
    );
    expect(
      await screen.findByRole('button', {
        name: 'Release Retry attempt limit reached follow-up',
      }),
    ).toHaveProperty('disabled', false);
  });

  it('requires confirmation and releases the exact visible claim', async () => {
    const listOwned = vi
      .fn<ListOwnedHumanFollowUps['listOwned']>()
      .mockResolvedValueOnce(
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      )
      .mockResolvedValue({ ok: true, page: { items: [], nextCursor: null } });
    const release = vi.fn<ReleaseHumanFollowUp['release']>().mockResolvedValue({
      ok: true,
      release: followUpRelease(FIRST_WORK_ITEM_ID),
    });
    renderOwned({ listOwned, release });

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Release Retry attempt limit reached follow-up',
      }),
    );
    expect(release).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm release' }));

    expect(
      await screen.findByRole('status', { name: 'Follow-up released' }),
    ).toBeTruthy();
    expect(release).toHaveBeenCalledWith(
      {
        tenantId: TENANT_ID,
        workItemId: FIRST_WORK_ITEM_ID,
        claimId: followUpClaim(FIRST_WORK_ITEM_ID).claimId,
        expectedOwnershipRevision: 1,
      },
      expect.any(AbortSignal),
    );
    await waitFor(() => expect(listOwned).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('heading', {
        name: 'No active claimed work in this view.',
      }),
    ).toBeTruthy();
  });

  it('retries an uncertain release with the exact same claim and revision', async () => {
    const release = vi
      .fn<ReleaseHumanFollowUp['release']>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
      .mockResolvedValueOnce({
        ok: true,
        release: followUpRelease(FIRST_WORK_ITEM_ID),
      });
    renderOwned({
      listOwned: async () =>
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      release,
    });

    fireEvent.click(
      await screen.findByRole('button', {
        name: /Release Retry attempt limit reached follow-up/,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm release' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Try release again' }),
    );

    expect(await screen.findByText('Follow-up released.')).toBeTruthy();
    expect(release).toHaveBeenCalledTimes(2);
    expect(release.mock.calls[1]?.[0]).toEqual(release.mock.calls[0]?.[0]);
  });

  it('reports disabled release without offering an unsafe retry', async () => {
    const release = vi.fn<ReleaseHumanFollowUp['release']>(async () => ({
      ok: false,
      error: { kind: 'release-unavailable' },
    }));
    renderOwned({
      listOwned: async () =>
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      release,
    });

    fireEvent.click(
      await screen.findByRole('button', {
        name: /Release Retry attempt limit reached follow-up/,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm release' }));

    expect(
      await screen.findByRole('alert', {
        name: 'Releasing work is not enabled.',
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Try release again' }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Confirm release' }),
    ).toBeNull();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('confirms Console release and hides private context before the exact POST', async () => {
    let finishRelease: (
      value: Awaited<ReturnType<ReleaseHumanFollowUp['release']>>,
    ) => void = () => undefined;
    const pendingRelease = new Promise<
      Awaited<ReturnType<ReleaseHumanFollowUp['release']>>
    >((resolve) => {
      finishRelease = resolve;
    });
    const release = vi.fn<ReleaseHumanFollowUp['release']>(async () => {
      expect(screen.queryByText('Private evidence')).toBeNull();
      expect(
        screen.queryByRole('heading', { name: 'Resolver Console' }),
      ).toBeNull();
      return pendingRelease;
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
    expect(screen.getByRole('region', { name: 'Current claim' })).toBeTruthy();
    expect(screen.getByText('In your active resolver work')).toBeTruthy();
    expect(screen.getByText(/this display is not a lease/i)).toBeTruthy();
    const releaseButton = screen.getByRole('button', {
      name: 'Release to shared queue',
    });
    fireEvent.click(releaseButton);
    expect(release).not.toHaveBeenCalled();
    const confirmation = screen.getByRole('group', {
      name: 'Confirm release to shared queue',
    });
    expect(within(confirmation).getByText(FIRST_WORK_ITEM_ID)).toBeTruthy();
    expect(within(confirmation).getByText('access-restoration')).toBeTruthy();
    const consequence = within(confirmation).getByText(
      /Releasing returns this work to its original shared queue/u,
    );
    expect(
      screen
        .getByRole('button', { name: 'Confirm release' })
        .getAttribute('aria-describedby'),
    ).toBe(consequence.id);
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Confirm release' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(release).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Release to shared queue' }),
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Release to shared queue' }),
    );
    fireEvent.keyDown(
      screen.getByRole('group', { name: 'Confirm release to shared queue' }),
      { key: 'Escape' },
    );
    expect(release).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Release to shared queue' }),
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Release to shared queue' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm release' }));

    expect(screen.queryByText('Private evidence')).toBeNull();
    expect(release).toHaveBeenCalledWith(
      {
        tenantId: TENANT_ID,
        workItemId: FIRST_WORK_ITEM_ID,
        claimId: followUpClaim(FIRST_WORK_ITEM_ID).claimId,
        expectedOwnershipRevision: 1,
      },
      expect.any(AbortSignal),
    );
    const pendingStatus = await screen.findByRole('status', {
      name: 'Releasing follow-up',
    });
    await waitFor(() => expect(document.activeElement).toBe(pendingStatus));
    finishRelease({ ok: false, error: { kind: 'release-unavailable' } });
    const failureNotice = await screen.findByRole('alert', {
      name: 'Releasing work is not enabled.',
    });
    expect(document.activeElement).toBe(failureNotice);
    expect(
      screen.queryByRole('button', { name: 'Try release again' }),
    ).toBeNull();
  });

  it('retries uncertain Console release with the same captured claim and revision', async () => {
    const release = vi
      .fn<ReleaseHumanFollowUp['release']>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
      .mockResolvedValueOnce({
        ok: true,
        release: followUpRelease(FIRST_WORK_ITEM_ID),
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
    expect(screen.queryByText('Private evidence')).toBeNull();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Try release again' }),
    );

    const successNotice = await screen.findByRole('status', {
      name: 'Follow-up released',
    });
    await waitFor(() => expect(document.activeElement).toBe(successNotice));
    expect(release).toHaveBeenCalledTimes(2);
    expect(release.mock.calls[1]?.[0]).toEqual(release.mock.calls[0]?.[0]);
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

    const openConsole = await screen.findByRole('button', {
      name: 'Open resolver console',
    });
    expect(getOwnedCaseSummary).not.toHaveBeenCalled();
    expect(screen.queryByText('Verified resolver test identity')).toBeNull();
    fireEvent.click(openConsole);

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Restore access to the customer workspace',
      }),
    ).toBeTruthy();
    expect(
      screen.getByText('<img src="/tracking-pixel" alt="unsafe markup">'),
    ).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
    expect(
      screen.getByRole('heading', { level: 4, name: 'Automation handoff' }),
    ).toBeTruthy();
    const evidence = screen.getByRole('region', {
      name: 'Recorded observations',
    });
    expect(
      within(evidence).getByText('EMAIL via support-mailbox'),
    ).toBeTruthy();
    expect(within(evidence).getByText('message-42')).toBeTruthy();
    expect(within(evidence).getByText('Occurred')).toBeTruthy();
    expect(within(evidence).getByText('Recorded')).toBeTruthy();
    expect(
      within(evidence).getByText('21 Sept 2026, 09:20:00 UTC'),
    ).toBeTruthy();
    expect(
      within(evidence).getByText('21 Sept 2026, 09:20:01 UTC'),
    ).toBeTruthy();
    expect(
      screen.getByRole('region', { name: 'Case and contract' }),
    ).toBeTruthy();
    const attempts = screen.getByRole('list', {
      name: 'Resolution attempts',
    });
    expect(attempts.querySelectorAll(':scope > li')).toHaveLength(2);
    expect(within(attempts).getByText('Attempt 1 · SUPERSEDED')).toBeTruthy();
    expect(within(attempts).getByText('Attempt 2 · ESCALATED')).toBeTruthy();
    const proof = screen.getByRole('region', { name: 'Not assessed' });
    expect(
      within(proof).getByText(/account\.access\.state\s*=\s*ACTIVE/u),
    ).toBeTruthy();
    expect(
      within(proof).getByText(/no accepted proof of resolution/u),
    ).toBeTruthy();
    expect(
      screen.getByText(/no verified resolution in this view/i),
    ).toBeTruthy();
    expect(screen.getAllByText(/identity-stub reported/)).toHaveLength(2);
    expect(
      screen.getByText(/Automated attempt 2 reached the configured limit of 2/),
    ).toBeTruthy();
    expect(screen.getByText('2 of 2')).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Resolver Console' }),
    ).toBeTruthy();
    expect(screen.getByText('Verified resolver test identity')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Open resolver console' }),
    ).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { level: 1, name: 'Resolver Console' }),
    );
    expect(
      screen.queryByRole('button', { name: /Authorize|Steer|Handover/ }),
    ).toBeNull();
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

  it('makes an empty evidence boundary explicit without inventing observations', async () => {
    const summary = resolverFollowUpCaseSummary(FIRST_WORK_ITEM_ID, 'unused');
    renderOwned({
      listOwned: async () =>
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      getOwnedCaseSummary: async () => ({
        ok: true,
        summary: { ...summary, observations: [] },
      }),
    });

    fireEvent.click(
      await screen.findByRole('button', { name: 'Open resolver console' }),
    );

    expect(
      await screen.findByText('No observations are recorded for this case.'),
    ).toBeTruthy();
    expect(
      screen.queryByRole('list', { name: 'Case observations' }),
    ).toBeNull();
    expect(
      screen.getByRole('heading', { level: 4, name: 'Automation handoff' }),
    ).toBeTruthy();
  });

  it('distinguishes observations recorded after the run evidence boundary', async () => {
    const summary = resolverFollowUpCaseSummary(FIRST_WORK_ITEM_ID, 'Earlier');
    const first = summary.observations[0];
    if (first === undefined) {
      throw new Error('The fixture must contain an observation');
    }
    renderOwned({
      listOwned: async () =>
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      getOwnedCaseSummary: async () => ({
        ok: true,
        summary: {
          ...summary,
          case: { ...summary.case, streamVersion: 5 },
          observations: [
            first,
            {
              ...first,
              observationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              streamVersion: 5,
              summary: 'Later source report',
              provider: 'audit-log',
              reference: null,
              content: 'Later evidence',
            },
          ],
        },
      }),
    });

    fireEvent.click(
      await screen.findByRole('button', { name: 'Open resolver console' }),
    );
    const evidence = await screen.findByRole('region', {
      name: 'Recorded observations',
    });
    expect(
      within(evidence).getByText(/1 available at the run snapshot/),
    ).toBeTruthy();
    const firstButton = within(evidence).getByRole('button', {
      name: 'Inspect observation: Customer cannot sign in',
    });
    const laterButton = within(evidence).getByRole('button', {
      name: 'Inspect observation: Later source report',
    });
    const detail = within(evidence).getByRole('region', {
      name: 'Source observation details',
    });
    expect(firstButton.getAttribute('aria-pressed')).toBe('true');
    expect(laterButton.getAttribute('aria-pressed')).toBe('false');
    expect(firstButton.getAttribute('aria-controls')).toBe(detail.id);
    expect(within(detail).getByText('Earlier')).toBeTruthy();
    expect(within(evidence).queryByText('Later evidence')).toBeNull();

    fireEvent.click(laterButton);
    expect(laterButton.getAttribute('aria-pressed')).toBe('true');
    expect(firstButton.getAttribute('aria-pressed')).toBe('false');
    expect(within(detail).getByText('Later evidence')).toBeTruthy();
    expect(within(detail).getByText('EMAIL via audit-log')).toBeTruthy();
    expect(within(detail).queryByText('Source reference')).toBeNull();
    expect(
      within(detail).getByText('Recorded after this run’s evidence snapshot'),
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      within(detail).getByRole('heading', {
        name: 'Source observation details',
      }),
    );
    fireEvent.click(
      within(detail).getByRole('button', { name: 'Back to observations' }),
    );
    expect(document.activeElement).toBe(laterButton);
    fireEvent.click(firstButton);
    expect(within(evidence).queryByText('Later evidence')).toBeNull();
    expect(
      within(detail).getByText('In this run’s evidence snapshot'),
    ).toBeTruthy();
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
      await screen.findByRole('button', { name: 'Open resolver console' }),
    );
    expect(await screen.findByText('Private evidence')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Back to active work' }),
    );
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Open resolver console' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Open resolver console' }),
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

  it('rechecks the current claim from the Console before revealing context again', async () => {
    let finishOwnedRead: (
      result: Awaited<ReturnType<ListOwnedHumanFollowUps['listOwned']>>,
    ) => void = () => undefined;
    const pendingOwnedRead = new Promise<
      Awaited<ReturnType<ListOwnedHumanFollowUps['listOwned']>>
    >((resolve) => {
      finishOwnedRead = resolve;
    });
    const listOwned = vi
      .fn<ListOwnedHumanFollowUps['listOwned']>()
      .mockResolvedValueOnce(
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      )
      .mockImplementationOnce(() => pendingOwnedRead);
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
    await waitFor(() =>
      expect(screen.queryByText('Private evidence')).toBeNull(),
    );
    expect(
      screen.getByRole('heading', { name: 'Loading your active work…' }),
    ).toBeTruthy();

    finishOwnedRead(successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null));
    expect(await screen.findByText('Private evidence')).toBeTruthy();
    await waitFor(() => expect(getOwnedCaseSummary).toHaveBeenCalledTimes(2));
  });

  it('rereads case context even when the claim recheck completes immediately', async () => {
    const listOwned = vi.fn<ListOwnedHumanFollowUps['listOwned']>(async () =>
      successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
    );
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

    expect(screen.queryByText('Private evidence')).toBeNull();
    await waitFor(() => expect(listOwned).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(getOwnedCaseSummary).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Private evidence')).toBeTruthy();
  });

  it('closes the Console when an explicit claim recheck finds no owned work', async () => {
    const listOwned = vi
      .fn<ListOwnedHumanFollowUps['listOwned']>()
      .mockResolvedValueOnce(
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      )
      .mockResolvedValueOnce({
        ok: true,
        page: { items: [], nextCursor: null },
      });
    renderOwned({
      listOwned,
      getOwnedCaseSummary: async () => ({
        ok: true,
        summary: resolverFollowUpCaseSummary(
          FIRST_WORK_ITEM_ID,
          'Private evidence',
        ),
      }),
    });

    fireEvent.click(
      await screen.findByRole('button', { name: 'Open resolver console' }),
    );
    expect(await screen.findByText('Private evidence')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Recheck current claim' }),
    );

    expect(
      await screen.findByRole('heading', {
        name: 'No active claimed work in this view.',
      }),
    ).toBeTruthy();
    expect(screen.queryByText('Private evidence')).toBeNull();
    expect(
      screen.queryByRole('heading', { name: 'Resolver Console' }),
    ).toBeNull();
  });

  it('unmounts private context while owned work is rechecked and after claim loss', async () => {
    let finishOwnedRead: (
      result: Awaited<ReturnType<ListOwnedHumanFollowUps['listOwned']>>,
    ) => void = () => undefined;
    const pendingOwnedRead = new Promise<
      Awaited<ReturnType<ListOwnedHumanFollowUps['listOwned']>>
    >((resolve) => {
      finishOwnedRead = resolve;
    });
    const listOwned = vi
      .fn<ListOwnedHumanFollowUps['listOwned']>()
      .mockResolvedValueOnce(
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      )
      .mockImplementationOnce(() => pendingOwnedRead);
    const store = createFollowUpTestStore({
      listOwned,
      getOwnedCaseSummary: async () => ({
        ok: true,
        summary: resolverFollowUpCaseSummary(
          FIRST_WORK_ITEM_ID,
          'Private evidence',
        ),
      }),
    });
    render(
      <Provider store={store}>
        <ResolverOwnedHumanFollowUps
          tenantId={TENANT_ID}
          signInHref={SIGN_IN_HREF}
          consoleActorDetails={<span>Verified resolver test identity</span>}
        />
      </Provider>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open resolver console' }),
    );
    expect(await screen.findByText('Private evidence')).toBeTruthy();

    store.dispatch(
      humanFollowUpApi.util.invalidateTags([
        { type: 'ResolverOwnedHumanFollowUps', id: TENANT_ID },
      ]),
    );
    await waitFor(() => expect(listOwned).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByText('Private evidence')).toBeNull(),
    );

    finishOwnedRead({ ok: true, page: { items: [], nextCursor: null } });
    expect(
      await screen.findByRole('heading', {
        name: 'No active claimed work in this view.',
      }),
    ).toBeTruthy();
    expect(screen.queryByText('Private evidence')).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Claimed follow-ups' }),
    );
  });

  it('keeps private context hidden when an owned-work recheck fails with cached data', async () => {
    let finishOwnedRead: (
      result: Awaited<ReturnType<ListOwnedHumanFollowUps['listOwned']>>,
    ) => void = () => undefined;
    const pendingOwnedRead = new Promise<
      Awaited<ReturnType<ListOwnedHumanFollowUps['listOwned']>>
    >((resolve) => {
      finishOwnedRead = resolve;
    });
    const listOwned = vi
      .fn<ListOwnedHumanFollowUps['listOwned']>()
      .mockResolvedValueOnce(
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      )
      .mockImplementationOnce(() => pendingOwnedRead)
      .mockResolvedValueOnce(
        successfulOwnedFollowUpResult(FIRST_WORK_ITEM_ID, null),
      );
    const store = createFollowUpTestStore({
      listOwned,
      getOwnedCaseSummary: async () => ({
        ok: true,
        summary: resolverFollowUpCaseSummary(
          FIRST_WORK_ITEM_ID,
          'Private evidence',
        ),
      }),
    });
    render(
      <Provider store={store}>
        <ResolverOwnedHumanFollowUps
          tenantId={TENANT_ID}
          signInHref={SIGN_IN_HREF}
          consoleActorDetails={<span>Verified resolver test identity</span>}
        />
      </Provider>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open resolver console' }),
    );
    expect(await screen.findByText('Private evidence')).toBeTruthy();

    store.dispatch(
      humanFollowUpApi.util.invalidateTags([
        { type: 'ResolverOwnedHumanFollowUps', id: TENANT_ID },
      ]),
    );
    await waitFor(() => expect(listOwned).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByText('Private evidence')).toBeNull(),
    );

    finishOwnedRead({ ok: false, error: { kind: 'transport' } });
    expect(
      await screen.findByRole('heading', {
        name: 'Your active work is temporarily unavailable.',
      }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole('heading', {
        name: 'Your active work is temporarily unavailable.',
      }),
    );
    expect(screen.queryByText('Private evidence')).toBeNull();
    expect(
      screen.queryByRole('heading', { name: 'Resolver Console' }),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'Back to active work' }),
    );
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Claimed follow-ups' }),
    );
    expect(screen.queryByText('Private evidence')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(listOwned).toHaveBeenCalledTimes(3));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open resolver console' }),
    );
    expect(await screen.findByText('Private evidence')).toBeTruthy();
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
      await screen.findByRole('button', { name: 'Open resolver console' }),
    );

    expect(
      await screen.findByRole('heading', {
        level: 2,
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
        consoleActorDetails={<span>Verified resolver test identity</span>}
      />
    </Provider>,
  );
}
