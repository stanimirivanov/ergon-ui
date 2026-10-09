import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type {
  CurrentActorClient,
  CurrentActorResult,
} from '@ergon/session-data-access-web';
import type { RunSupervisionClient } from '@ergon/run-supervision-data-access-web';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { createWorkbenchStore } from '../app/store';
import type { WorkbenchDependencies } from '../app/workbench-dependencies';
import { CurrentActorPage } from './current-actor-page';

const TENANT_ID = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';

describe('current actor page', () => {
  it('hides assigned supervision until a changed tenant is independently verified', async () => {
    const otherTenantId = '96bb3c6e-9e41-42bd-80b9-1ca5f8b09602';
    const actorResult = {
      ok: true,
      actor: {
        actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
        identityProvider: 'workforce-sso',
        registeredAt: '2026-09-20T12:34:56Z',
        recordedAt: '2026-09-20T12:34:57Z',
      },
    } as const;
    let finishVerification: (value: CurrentActorResult) => void = () => {
      throw new Error('Verification promise is not initialized');
    };
    const heldVerification = new Promise<CurrentActorResult>((resolve) => {
      finishVerification = resolve;
    });
    const resolve = vi
      .fn<CurrentActorClient['resolve']>()
      .mockResolvedValueOnce(actorResult)
      .mockReturnValueOnce(heldVerification);
    const listAssigned = vi
      .fn<RunSupervisionClient['listAssigned']>()
      .mockResolvedValue({ ok: true, page: { entries: [], nextCursor: null } });
    const { router } = renderSession(
      `/tenants/${TENANT_ID}?view=runs`,
      { resolve },
      {
        listAssigned,
        getConsole: vi.fn<RunSupervisionClient['getConsole']>(),
      },
    );
    await screen.findByRole('heading', { name: 'Resolver Console' });
    await waitFor(() => expect(listAssigned).toHaveBeenCalledOnce());

    await act(async () => {
      await router.navigate(`/tenants/${otherTenantId}?view=runs`);
    });
    await screen.findByRole('heading', {
      name: 'Verifying your Ergon session…',
    });
    expect(
      screen.queryByRole('heading', { name: 'Resolver Console' }),
    ).toBeNull();
    expect(listAssigned).toHaveBeenCalledOnce();

    await act(async () => finishVerification(actorResult));
    await screen.findByRole('heading', { name: 'Resolver Console' });
    await waitFor(() => expect(listAssigned).toHaveBeenCalledTimes(2));
    expect(listAssigned.mock.calls[1]?.[0].tenantId).toBe(otherTenantId);
  });

  it('does not discover assigned runs until the session gate succeeds', async () => {
    const listAssigned = vi.fn<RunSupervisionClient['listAssigned']>();
    renderSession(
      `/tenants/${TENANT_ID}?view=runs`,
      clientReturning({
        ok: false,
        error: { kind: 'authentication-required' },
      }),
      { listAssigned, getConsole: vi.fn<RunSupervisionClient['getConsole']>() },
    );

    await screen.findByRole('heading', { name: 'Authentication is required.' });
    expect(listAssigned).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('heading', { name: 'Resolver Console' }),
    ).toBeNull();
  });

  it('composes assigned supervision separately from follow-up claims', async () => {
    const listAssigned = vi
      .fn<RunSupervisionClient['listAssigned']>()
      .mockResolvedValue({ ok: true, page: { entries: [], nextCursor: null } });
    renderSession(
      `/tenants/${TENANT_ID}`,
      clientReturning({
        ok: true,
        actor: {
          actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
          identityProvider: 'workforce-sso',
          registeredAt: '2026-09-20T12:34:56Z',
          recordedAt: '2026-09-20T12:34:57Z',
        },
      }),
      { listAssigned, getConsole: vi.fn<RunSupervisionClient['getConsole']>() },
    );

    fireEvent.click(await screen.findByRole('link', { name: 'Assigned runs' }));
    await screen.findByRole('heading', { level: 1, name: 'Resolver Console' });
    await waitFor(() => expect(listAssigned).toHaveBeenCalledOnce());
    expect(listAssigned.mock.calls[0]?.[0].tenantId).toBe(TENANT_ID);
    expect(
      screen.queryByRole('heading', { name: 'Human follow-up inbox' }),
    ).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Back to follow-ups' }));
    expect(
      await screen.findByRole('heading', { name: 'Human follow-up inbox' }),
    ).toBeTruthy();
  });

  it('does not resolve a session for an invalid tenant address', async () => {
    const resolve = vi.fn<CurrentActorClient['resolve']>();

    renderSession('/tenants/not-a-uuid', { resolve });

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'This tenant address is invalid.',
      }),
    ).toBeTruthy();
    expect(resolve).not.toHaveBeenCalled();
  });

  it('reveals the actor only after session verification succeeds', async () => {
    renderSession(
      `/tenants/${TENANT_ID}`,
      clientReturning({
        ok: true,
        actor: {
          actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
          identityProvider: 'workforce-sso',
          registeredAt: '2026-09-20T12:34:56Z',
          recordedAt: '2026-09-20T12:34:57Z',
        },
      }),
    );

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Human follow-up inbox',
      }),
    ).toBeTruthy();
    expect(screen.getByText('workforce-sso')).toBeTruthy();
    expect(screen.queryByText('employee-42')).toBeNull();
  });

  it('keeps the workspace closed when authentication is absent', async () => {
    renderSession(
      `/tenants/${TENANT_ID}`,
      clientReturning({
        ok: false,
        error: { kind: 'authentication-required' },
      }),
    );

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Authentication is required.',
      }),
    ).toBeTruthy();
    expect(screen.getByText(/no resolver data has been loaded/i)).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Sign in to Ergon' }),
    ).toHaveProperty(
      'href',
      expect.stringContaining(`/bff/login?returnTo=%2Ftenants%2F${TENANT_ID}`),
    );
  });

  it('distinguishes disabled browser authentication from a transient outage', async () => {
    renderSession(
      `/tenants/${TENANT_ID}`,
      clientReturning({
        ok: false,
        error: { kind: 'authentication-unavailable' },
      }),
    );

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Browser sign-in is not configured.',
      }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('distinguishes an unregistered actor from missing authentication', async () => {
    renderSession(
      `/tenants/${TENANT_ID}`,
      clientReturning({
        ok: false,
        error: { kind: 'actor-not-registered' },
      }),
    );

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Your Ergon actor is not registered.',
      }),
    ).toBeTruthy();
  });

  it('allows a transient verification failure to be retried', async () => {
    const resolve = vi
      .fn<CurrentActorClient['resolve']>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'transport' } })
      .mockResolvedValueOnce({
        ok: true,
        actor: {
          actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
          identityProvider: 'workforce-sso',
          registeredAt: '2026-09-20T12:34:56Z',
          recordedAt: '2026-09-20T12:34:57Z',
        },
      });

    renderSession(`/tenants/${TENANT_ID}`, { resolve });

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(resolve).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Human follow-up inbox',
      }),
    ).toBeTruthy();
  });
});

function renderSession(
  path: string,
  resolveCurrentActor: CurrentActorClient,
  runSupervision: RunSupervisionClient = {
    async listAssigned() {
      return { ok: true, page: { entries: [], nextCursor: null } };
    },
    async getConsole() {
      throw new Error('Assigned run context is not used by this test');
    },
  },
) {
  const router = createMemoryRouter(
    [{ path: '/tenants/:tenantId', Component: CurrentActorPage }],
    {
      initialEntries: [path],
    },
  );
  const store = createWorkbenchStore({
    resolveCurrentActor,
    runSupervision,
    ...emptyFollowUpDependencies,
  });

  const view = render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  );
  return { ...view, router };
}

const emptyFollowUpDependencies: Pick<
  WorkbenchDependencies,
  | 'listOpenHumanFollowUps'
  | 'listOwnedHumanFollowUps'
  | 'getOwnedFollowUpCaseSummary'
  | 'claimHumanFollowUp'
  | 'releaseHumanFollowUp'
> = {
  listOpenHumanFollowUps: {
    async listOpen() {
      return { ok: true, page: { items: [], nextCursor: null } };
    },
  },
  listOwnedHumanFollowUps: {
    async listOwned() {
      return { ok: true, page: { items: [], nextCursor: null } };
    },
  },
  getOwnedFollowUpCaseSummary: {
    async getOwnedCaseSummary() {
      throw new Error('Case context is not used by this test');
    },
  },
  claimHumanFollowUp: {
    async claim() {
      throw new Error('Claiming is not used by this test');
    },
  },
  releaseHumanFollowUp: {
    async release() {
      throw new Error('Release is not used by this test');
    },
  },
};

function clientReturning(result: CurrentActorResult): CurrentActorClient {
  return {
    async resolve() {
      return result;
    },
  };
}
