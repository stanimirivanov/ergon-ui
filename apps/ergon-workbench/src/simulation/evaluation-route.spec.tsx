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
import { EvaluationRoute } from './evaluation-route';
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
const reportId = '11111111-1111-4111-8111-111111111111';

it('rechecks session on inspection and withdraws history before an access denial', async () => {
  let sessions = 0;
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation(async (input) => {
      const path = String(input);
      if (path.endsWith('/session')) {
        sessions++;
        return Response.json({
          actorId: actor,
          identityProvider: 'sso',
          registeredAt: '2026-10-30T09:00:00Z',
          recordedAt: '2026-10-30T09:00:00Z',
        });
      }
      if (path.endsWith('/reports?limit=20'))
        return Response.json({
          items: [
            {
              reportId,
              fixture: {
                key: 'fixture',
                revision: 'v1',
                sha256: 'a'.repeat(64),
              },
              reportDigest: 'b'.repeat(64),
              passed: false,
              recordedAt: '2026-10-30T12:00:00Z',
            },
          ],
          nextAfter: null,
        });
      return Response.json({}, { status: 404 });
    });
  vi.stubGlobal('fetch', fetch);
  render(
    <StrictMode>
      <MemoryRouter initialEntries={[`/tenants/${tenant}/simulation`]}>
        <Routes>
          <Route
            path="/tenants/:tenantId/simulation"
            element={<EvaluationRoute />}
          />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );
  fireEvent.click(
    await screen.findByRole('button', { name: `Inspect report ${reportId}` }),
  );
  await screen.findByRole('alert');
  expect(
    screen.queryByRole('button', { name: `Inspect report ${reportId}` }),
  ).toBeNull();
  expect(sessions).toBe(2);
  expect(document.activeElement).toBe(
    screen.getByRole('heading', { name: 'Simulation Lab' }),
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Back to latest evaluations' }),
  );
  await screen.findByRole('button', { name: `Inspect report ${reportId}` });
  await waitFor(() => expect(sessions).toBe(3));
});
it('invalid tenant cannot start a session or report read', () => {
  const fetch = vi.fn<typeof globalThis.fetch>();
  vi.stubGlobal('fetch', fetch);
  render(
    <MemoryRouter initialEntries={['/tenants/invalid/simulation']}>
      <Routes>
        <Route
          path="/tenants/:tenantId/simulation"
          element={<EvaluationRoute />}
        />
      </Routes>
    </MemoryRouter>,
  );
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.getByText(/No request was sent/)).toBeTruthy();
});
