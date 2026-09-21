import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { createWorkbenchStore } from '../app/store';
import type {
  CurrentActorClient,
  CurrentActorResult,
} from './current-actor-client';
import { CurrentActorPage } from './current-actor-page';

const TENANT_ID = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';

describe('current actor page', () => {
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
        name: 'Session verified.',
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
        name: 'Session verified.',
      }),
    ).toBeTruthy();
  });
});

function renderSession(path: string, currentActorClient: CurrentActorClient) {
  const router = createMemoryRouter(
    [{ path: '/tenants/:tenantId', Component: CurrentActorPage }],
    {
      initialEntries: [path],
    },
  );
  const store = createWorkbenchStore({ currentActorClient });

  return render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  );
}

function clientReturning(result: CurrentActorResult): CurrentActorClient {
  return {
    async resolve() {
      return result;
    },
  };
}
