import { configureStore } from '@reduxjs/toolkit';
import { act, render, screen } from '@testing-library/react';
import {
  type CurrentActorClient,
  type CurrentActorResult,
  currentActorApi,
} from '@ergon/session-data-access-web';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';

import { CurrentActorBoundary } from '../src';

const TENANT_ID = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';
const ACTOR: Extract<CurrentActorResult, { ok: true }>['actor'] = {
  actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
  identityProvider: 'workforce-sso',
  registeredAt: '2026-09-20T12:34:56Z',
  recordedAt: '2026-09-20T12:34:57Z',
};

describe('current actor boundary', () => {
  it('rejects an invalid tenant without a session request or sign-in URL', () => {
    const resolve = vi.fn<CurrentActorClient['resolve']>();
    const { renderVerified, signInHrefForTenant } = renderBoundary(
      'not-a-uuid',
      { resolve },
    );

    expect(
      screen.getByRole('heading', { name: 'This tenant address is invalid.' }),
    ).toBeTruthy();
    expect(resolve).not.toHaveBeenCalled();
    expect(signInHrefForTenant).not.toHaveBeenCalled();
    expect(renderVerified).not.toHaveBeenCalled();
  });

  it('does not mount authenticated content before verification completes', async () => {
    let complete: (result: CurrentActorResult) => void = () => undefined;
    const pending = new Promise<CurrentActorResult>((resolve) => {
      complete = resolve;
    });
    const resolve = vi.fn<CurrentActorClient['resolve']>(() => pending);
    const { renderVerified } = renderBoundary(TENANT_ID, { resolve });

    expect(
      screen.getByRole('heading', { name: 'Verifying your Ergon session…' }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: 'Protected content' }),
    ).toBeNull();
    expect(renderVerified).not.toHaveBeenCalled();

    await act(async () => complete({ ok: true, actor: ACTOR }));

    expect(
      await screen.findByRole('heading', { name: 'Protected content' }),
    ).toBeTruthy();
    expect(renderVerified).toHaveBeenCalledWith({
      actor: ACTOR,
      tenantId: TENANT_ID,
      signInHref: `/bff/login?returnTo=%2Ftenants%2F${TENANT_ID}`,
    });
  });

  it('keeps authenticated content unmounted when sign-in is required', async () => {
    const { renderVerified } = renderBoundary(TENANT_ID, {
      async resolve() {
        return { ok: false, error: { kind: 'authentication-required' } };
      },
    });

    expect(
      await screen.findByRole('heading', {
        name: 'Authentication is required.',
      }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'Sign in to Ergon' })
        .getAttribute('href'),
    ).toBe(`/bff/login?returnTo=%2Ftenants%2F${TENANT_ID}`);
    expect(renderVerified).not.toHaveBeenCalled();
  });
});

function renderBoundary(tenantId: string, client: CurrentActorClient) {
  const store = configureStore({
    reducer: { [currentActorApi.reducerPath]: currentActorApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: { resolveCurrentActor: client } },
      }).concat(currentActorApi.middleware),
  });
  const signInHrefForTenant = vi.fn(
    (id: string) => `/bff/login?returnTo=%2Ftenants%2F${id}`,
  );
  const renderVerified = vi.fn(() => <h1>Protected content</h1>);

  render(
    <Provider store={store}>
      <CurrentActorBoundary
        tenantId={tenantId}
        signInHrefForTenant={signInHrefForTenant}
        renderFrame={(statusLabel, content) => (
          <main aria-label={statusLabel}>{content}</main>
        )}
        renderVerified={renderVerified}
      />
    </Provider>,
  );

  return { renderVerified, signInHrefForTenant };
}
