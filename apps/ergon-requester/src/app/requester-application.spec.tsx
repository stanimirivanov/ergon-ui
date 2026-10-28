import { StrictMode } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import {
  RequesterApplication,
  requesterSignInHref,
} from './requester-application';
import { RequesterRoute } from './requester-route';
import * as stores from './requester-store';

const tenant = '9ad66e9b-e81a-4b61-8d8f-5708312772d8',
  caseId = '22222222-2222-4222-8222-222222222222';
const at = '2026-10-28T09:00:00Z';
const session = {
  actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
  identityProvider: 'requester-sso',
  registeredAt: at,
  recordedAt: at,
};
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement): void {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement): void {
      this.open = false;
    },
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('cancels without losing draft, then retires caches before logout and recovers explicitly without business replay', async () => {
  const scopes: ReturnType<typeof stores.createRequesterStore>[] = [];
  const create = stores.createRequesterStore;
  vi.spyOn(stores, 'createRequesterStore').mockImplementation((fetch) => {
    const scope = create(fetch);
    scopes.push(scope);
    return scope;
  });
  let csrf = 0,
    posts = 0;
  const calls: string[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const path = String(input);
    calls.push(path);
    if (path.endsWith('/session')) return Response.json(session);
    if (path === '/bff/v1/csrf') {
      csrf++;
      expect(screen.queryByRole('textbox')).toBeNull();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(
        screen.getByRole('heading', { name: 'Signing out locally…' }),
      ).toBe(document.activeElement);
      for (const scope of scopes) {
        const state = scope.store.getState();
        expect(Object.keys(state.currentActorApi.queries)).toHaveLength(0);
        expect(Object.keys(state.requesterIntakeApi.mutations)).toHaveLength(0);
        expect(Object.keys(state.requesterProgressApi.queries)).toHaveLength(0);
      }
      return Response.json({
        headerName: 'X-CSRF-TOKEN',
        token: 'fresh-' + csrf,
      });
    }
    if (path === '/bff/logout') {
      posts++;
      expect(init?.method).toBe('POST');
      expect(init?.headers).toEqual(
        expect.objectContaining({ 'X-CSRF-TOKEN': 'fresh-' + csrf }),
      );
      return posts === 1
        ? Response.json({}, { status: 503 })
        : new Response(null, { status: 204 });
    }
    throw new Error('Unexpected requester request');
  };
  vi.stubGlobal('fetch', fetch);
  const router = createMemoryRouter(
    [
      {
        path: '/tenants/:tenantId/new',
        element: <RequesterRoute mode="intake" />,
      },
      { path: '/tenants/:tenantId', element: <RequesterRoute /> },
    ],
    {
      initialEntries: [`/tenants/${tenant}`, `/tenants/${tenant}/new`],
      initialIndex: 1,
    },
  );
  render(
    <StrictMode>
      <RequesterApplication router={router} fetch={fetch} />
    </StrictMode>,
  );
  const goal = await screen.findByRole('textbox', { name: 'Desired outcome' });
  fireEvent.change(goal, { target: { value: 'PRIVATE-DRAFT' } });
  const signOut = screen.getByRole('button', { name: 'Sign out' });
  fireEvent.click(signOut);
  fireEvent.click(await screen.findByRole('button', { name: 'Keep working' }));
  expect((goal as HTMLInputElement).value).toBe('PRIVATE-DRAFT');
  expect(document.activeElement).toBe(signOut);
  expect(csrf).toBe(0);
  fireEvent.click(signOut);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Sign out locally' }),
  );
  await screen.findByRole('alert');
  expect(posts).toBe(1);
  expect(document.body.textContent).not.toContain('PRIVATE-DRAFT');
  expect(screen.queryByRole('link', { name: 'Sign in again' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retry local sign-out' }));
  await screen.findByRole('heading', { name: 'You are signed out locally.' });
  expect(posts).toBe(2);
  expect(csrf).toBe(2);
  const reads = calls.length;
  await act(async () => {
    await router.navigate(-1);
  });
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(calls).toHaveLength(reads);
  expect(
    screen.getByRole('link', { name: 'Sign in again' }).getAttribute('href'),
  ).toBe(`/bff/login?returnTo=%2Ftenants%2F${tenant}`);
  router.dispose();
});

it('aborts held private progress and rejects late private data after exit', async () => {
  let pending = false,
    finish: (response: Response) => void = () => undefined;
  let observed: AbortSignal | undefined;
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const path = String(input);
    if (path.endsWith('/session')) return Response.json(session);
    if (path.endsWith('/progress')) {
      if (pending) {
        observed = init?.signal ?? undefined;
        return new Promise<Response>((resolve) => {
          finish = resolve;
        });
      }
      return Response.json({
        caseId,
        goal: 'PRIVATE-GOAL',
        status: 'OPEN',
        openedAt: at,
        updatedAt: at,
      });
    }
    if (path.endsWith('/information-requests'))
      return Response.json({ items: [], truncated: false });
    if (path === '/bff/v1/csrf')
      return Response.json({ headerName: 'X-CSRF-TOKEN', token: 'fresh' });
    if (path === '/bff/logout') return new Response(null, { status: 204 });
    throw new Error('Unexpected requester request');
  };
  vi.stubGlobal('fetch', fetch);
  const router = createMemoryRouter(
    [{ path: '/tenants/:tenantId/cases/:caseId', element: <RequesterRoute /> }],
    { initialEntries: [`/tenants/${tenant}/cases/${caseId}`] },
  );
  render(<RequesterApplication router={router} fetch={fetch} />);
  await screen.findByRole('heading', { name: 'PRIVATE-GOAL' });
  pending = true;
  fireEvent.click(screen.getByRole('button', { name: 'Recheck progress' }));
  await waitFor(() => expect(observed).toBeDefined());
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Sign out locally' }),
  );
  await screen.findByRole('heading', { name: 'You are signed out locally.' });
  expect(observed?.aborted).toBe(true);
  await act(async () => {
    finish(
      Response.json({
        caseId,
        goal: 'PRIVATE-LATE',
        status: 'OPEN',
        openedAt: at,
        updatedAt: at,
      }),
    );
  });
  expect(document.body.textContent).not.toContain('PRIVATE-');
  expect(
    requesterSignInHref(`/tenants/${tenant}/cases/${caseId}`),
  ).not.toContain(caseId);
  expect(requesterSignInHref('/tenants/not-a-tenant')).toBeUndefined();
  router.dispose();
});
