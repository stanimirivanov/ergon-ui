import { StrictMode } from 'react';
import {
  cleanup,
  fireEvent,
  render as renderView,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { NotificationRoute } from './notification-route';
import type { ReactNode } from 'react';
import { LocalSessionBoundary } from '@ergon/session-feature-web';

function render(children: ReactNode): ReturnType<typeof renderView> {
  return renderView(
    <LocalSessionBoundary
      fetch={(input, init) => globalThis.fetch(input, init)}
      signInHrefForCurrentLocation={() => undefined}
      renderRetired={() => null}
    >
      {children}
    </LocalSessionBoundary>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const tenant = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';
const actor = '741bcdba-9521-4e96-bfcc-7a5a2830eec8';
const work = '11111111-1111-4111-8111-111111111111';

it('freshly verifies target access, withdraws rows and keeps private pointers out of URL history', async () => {
  let sessions = 0;
  const calls: string[] = [];
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation(async (input) => {
      const path = String(input);
      calls.push(path);
      if (path.endsWith('/session')) {
        sessions++;
        return Response.json({
          actorId: actor,
          identityProvider: 'resolver-sso',
          registeredAt: '2026-10-28T09:00:00Z',
          recordedAt: '2026-10-28T09:00:00Z',
        });
      }
      if (path.endsWith('/notifications'))
        return Response.json({
          items: [
            {
              kind: 'FOLLOW_UP_HANDED_OVER',
              sourceId: actor,
              target: { kind: 'OWNED_HUMAN_FOLLOW_UP', id: work },
              deliveredAt: '2026-10-28T09:00:00Z',
            },
          ],
          truncated: false,
        });
      return Response.json(
        { type: 'urn:ergon:problem:resolver-follow-up-case-summary-not-found' },
        { status: 404 },
      );
    });
  vi.stubGlobal('fetch', fetch);
  render(
    <StrictMode>
      <MemoryRouter initialEntries={[`/tenants/${tenant}/notifications`]}>
        <Routes>
          <Route
            path="/tenants/:tenantId/notifications"
            element={<NotificationRoute />}
          />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );
  fireEvent.click(
    await screen.findByRole('button', { name: /Check current access to work/ }),
  );
  await screen.findByRole('alert');
  expect(
    screen.queryByRole('button', { name: /Check current access to work/ }),
  ).toBeNull();
  expect(sessions).toBeGreaterThanOrEqual(2);
  const targetIndex = calls.findIndex((path) => path.endsWith('/case-summary'));
  expect(calls[targetIndex - 1]).toContain('/session');
  expect(screen.getByRole('heading', { name: 'Notifications' })).toBe(
    document.activeElement,
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Back to notifications' }),
  );
  await screen.findByRole('button', { name: /Check current access to work/ });
  await waitFor(() => expect(sessions).toBeGreaterThanOrEqual(3));
  expect(calls.every((path) => !path.includes('/csrf'))).toBe(true);
});

it('aborts a pending feed when the route departs', async () => {
  let owned: AbortSignal | undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof globalThis.fetch>().mockImplementation(async (input, init) => {
      if (String(input).endsWith('/session'))
        return Response.json({
          actorId: actor,
          identityProvider: 'resolver-sso',
          registeredAt: '2026-10-28T09:00:00Z',
          recordedAt: '2026-10-28T09:00:00Z',
        });
      owned = init?.signal ?? undefined;
      return new Promise<Response>(() => undefined);
    }),
  );
  const view = render(
    <MemoryRouter initialEntries={[`/tenants/${tenant}/notifications`]}>
      <Routes>
        <Route
          path="/tenants/:tenantId/notifications"
          element={<NotificationRoute />}
        />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(owned).toBeDefined());
  view.unmount();
  await waitFor(() => expect(owned?.aborted).toBe(true));
});
