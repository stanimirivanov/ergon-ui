import { EvaluationRoute } from '../simulation/evaluation-route';
import * as evaluations from '../simulation/evaluation-store';
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
  WorkbenchApplication,
  workbenchSignInHref,
} from './workbench-application';
import { CurrentActorRoute } from '../session/current-actor-route';
import { NotificationRoute } from '../notifications/notification-route';
import * as graphs from './browser-dependencies';
import * as notifications from '../notifications/notification-store';

const tenant = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';
const at = '2026-10-28T09:00:00Z';
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
});

it.each(['', '?view=runs', '/notifications', '/simulation'])(
  'retires the real private %s route and caches before logout, keeps uncertainty closed, and prevents Back restoration',
  async (suffix) => {
    const workScopes: ReturnType<typeof graphs.createBrowserWorkbenchScope>[] =
      [];
    const notificationScopes: ReturnType<
      typeof notifications.createNotificationStore
    >[] = [];
    const evaluationScopes: ReturnType<
      typeof evaluations.createEvaluationStore
    >[] = [];
    const makeEvaluation = evaluations.createEvaluationStore;
    vi.spyOn(evaluations, 'createEvaluationStore').mockImplementation(
      (fetch) => {
        const scope = makeEvaluation(fetch);
        evaluationScopes.push(scope);
        return scope;
      },
    );
    const makeGraph = graphs.createBrowserWorkbenchScope;
    const makeNotifications = notifications.createNotificationStore;
    vi.spyOn(graphs, 'createBrowserWorkbenchScope').mockImplementation(
      (fetch) => {
        const scope = makeGraph(fetch);
        workScopes.push(scope);
        return scope;
      },
    );
    vi.spyOn(notifications, 'createNotificationStore').mockImplementation(
      (fetch) => {
        const scope = makeNotifications(fetch);
        notificationScopes.push(scope);
        return scope;
      },
    );
    let posts = 0,
      csrf = 0;
    const reads: string[] = [];
    const fetch: typeof globalThis.fetch = async (input, init) => {
      const path = String(input).split('?')[0] ?? '';
      if (path === '/bff/v1/csrf') {
        csrf++;
        expect(document.querySelector('[data-workbench-mode]')).toBeNull();
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(
          screen.getByRole('heading', { name: 'Signing out locally…' }),
        ).toBe(document.activeElement);
        for (const scope of [
          ...workScopes,
          ...notificationScopes,
          ...evaluationScopes,
        ]) {
          const state = scope.store.getState();
          for (const cache of Object.values(state)) {
            expect(Object.keys(cache.queries)).toHaveLength(0);
            expect(Object.keys(cache.mutations)).toHaveLength(0);
          }
        }
        return Response.json({
          headerName: 'X-CSRF-TOKEN',
          token: 'fresh-' + csrf,
        });
      }
      if (path === '/bff/logout') {
        posts++;
        expect(init?.headers).toEqual(
          expect.objectContaining({ 'X-CSRF-TOKEN': 'fresh-' + csrf }),
        );
        return posts === 1
          ? Response.json({}, { status: 503 })
          : new Response(null, { status: 204 });
      }
      expect(init?.method ?? 'GET').toBe('GET');
      reads.push(path);
      if (path.endsWith('/session'))
        return Response.json({
          actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
          identityProvider: 'workforce-sso',
          registeredAt: at,
          recordedAt: at,
        });
      if (path.endsWith('/assigned'))
        return Response.json({ entries: [], nextCursor: null });
      if (path.endsWith('/simulation-lab/reports'))
        return Response.json({ items: [], nextAfter: null });
      if (path.endsWith('/notifications'))
        return Response.json({ items: [], truncated: false });
      if (path.endsWith('/human-follow-ups') || path.endsWith('/owned'))
        return Response.json({ items: [], nextCursor: null });
      throw new Error('Unexpected workbench request');
    };
    const router = createMemoryRouter(
      [
        { path: '/tenants/:tenantId/simulation', element: <EvaluationRoute /> },
        { path: '/', element: <p>PUBLIC-HOME</p> },
        { path: '/tenants/:tenantId', element: <CurrentActorRoute /> },
        {
          path: '/tenants/:tenantId/notifications',
          element: <NotificationRoute />,
        },
      ],
      { initialEntries: ['/', '/tenants/' + tenant + suffix], initialIndex: 1 },
    );
    render(
      <StrictMode>
        <WorkbenchApplication router={router} fetch={fetch} />
      </StrictMode>,
    );
    await waitFor(() => expect(reads.length).toBeGreaterThan(1));
    const trigger = screen.getByRole('button', { name: 'Sign out' });
    fireEvent.click(trigger);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Keep working' }),
    );
    expect(trigger).toBe(document.activeElement);
    expect(csrf).toBe(0);
    fireEvent.click(trigger);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Sign out locally' }),
    );
    await screen.findByRole('alert');
    expect(posts).toBe(1);
    expect(screen.queryByRole('link', { name: 'Sign in again' })).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry local sign-out' }),
    );
    await screen.findByRole('heading', { name: 'You are signed out locally.' });
    expect(posts).toBe(2);
    expect(csrf).toBe(2);
    const readCount = reads.length;
    await act(async () => {
      await router.navigate(-1);
    });
    expect(screen.queryByText('PUBLIC-HOME')).toBeNull();
    expect(reads).toHaveLength(readCount);
    expect(
      screen.getByRole('link', { name: 'Sign in again' }).getAttribute('href'),
    ).toBe('/bff/login?returnTo=%2Ftenants%2F' + tenant);
    expect(workbenchSignInHref('/untrusted')).toBeUndefined();
    router.dispose();
  },
);
