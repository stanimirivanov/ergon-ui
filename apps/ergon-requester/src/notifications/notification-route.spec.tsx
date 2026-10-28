import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { RequesterNotificationRoute } from './notification-route';
import { RequesterRoute } from '../app/requester-route';
import { LocalSessionBoundary } from '@ergon/session-feature-web';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('reacquires requester identity before opening independently protected progress', async () => {
  const tenant = '9ad66e9b-e81a-4b61-8d8f-5708312772d8',
    actor = '741bcdba-9521-4e96-bfcc-7a5a2830eec8';
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof globalThis.fetch>().mockImplementation(async (input) => {
      const path = String(input);
      calls.push(path);
      if (path.endsWith('/session'))
        return Response.json({
          actorId: actor,
          identityProvider: 'requester-sso',
          registeredAt: '2026-10-28T09:00:00Z',
          recordedAt: '2026-10-28T09:00:00Z',
        });
      if (path.endsWith('/notifications'))
        return Response.json({
          items: [
            {
              kind: 'INFORMATION_REQUESTED',
              sourceId: actor,
              target: { kind: 'REQUESTER_CASE', id: actor },
              deliveredAt: '2026-10-28T09:00:00Z',
            },
          ],
          truncated: false,
        });
      return Response.json(
        { type: 'urn:ergon:problem:requester-case-not-found' },
        { status: 404 },
      );
    }),
  );
  render(
    <LocalSessionBoundary
      fetch={(input, init) => globalThis.fetch(input, init)}
      signInHrefForCurrentLocation={() => undefined}
      renderRetired={() => null}
    >
      <MemoryRouter initialEntries={[`/tenants/${tenant}/notifications`]}>
        <Routes>
          <Route
            path="/tenants/:tenantId/notifications"
            element={<RequesterNotificationRoute />}
          />
          <Route
            path="/tenants/:tenantId/cases/:caseId"
            element={<RequesterRoute />}
          />
        </Routes>
      </MemoryRouter>
    </LocalSessionBoundary>,
  );
  fireEvent.click(
    await screen.findByRole('button', { name: /Check current access to case/ }),
  );
  await screen.findByRole('heading', { name: 'Case progress is unavailable.' });
  expect(calls.filter((path) => path.endsWith('/session'))).toHaveLength(2);
  expect(calls[calls.length - 2]).toContain('/session');
  expect(
    screen.queryByRole('heading', { name: 'Recent deliveries' }),
  ).toBeNull();
});
