import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { RequesterRoute } from './requester-route';

const tenant = '9ad66e9b-e81a-4b61-8d8f-5708312772d8';
const caseId = '20000000-0000-4000-8000-000000000001';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function open(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/tenants/:tenantId/new"
          element={<RequesterRoute mode="intake" />}
        />
        <Route path="/tenants/:tenantId" element={<RequesterRoute />} />
        <Route
          path="/tenants/:tenantId/cases/:caseId"
          element={<RequesterRoute />}
        />
      </Routes>
    </MemoryRouter>,
  );
}
it('rejects invalid supplied coordinates without any network call', () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  open(`/tenants/${tenant}/cases/not-a-case`);
  expect(
    screen.getByRole('heading', { name: 'Use your supplied case link.' }),
  ).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
});
it('gates intake behind the tenant session without CSRF or command probes', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
    Response.json(
      {
        type: 'urn:ergon:problem:browser-authentication-required',
        title: 'Authentication required',
        detail: 'An authenticated requester session is required',
        status: 401,
        signInPath: '/bff/login',
      },
      { status: 401 },
    ),
  );
  vi.stubGlobal('fetch', fetch);
  open(`/tenants/${tenant}/new`);
  await screen.findByRole('link', { name: 'Sign in to Ergon' });
  expect(screen.queryByRole('form', { name: 'New request' })).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0]?.[0]).toBe(`/bff/v1/tenants/${tenant}/session`);
});
it('offers intake after session verification without sending a command on mount', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
    Response.json({
      actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
      identityProvider: 'requester-sso',
      registeredAt: '2026-10-27T09:00:00Z',
      recordedAt: '2026-10-27T09:00:01Z',
    }),
  );
  vi.stubGlobal('fetch', fetch);
  open(`/tenants/${tenant}/new`);
  await screen.findByRole('form', { name: 'New request' });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('heading', { name: 'Case progress' })).toBeNull();
});
it('provides a real tenant-home entry without case discovery', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
    Response.json({
      actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
      identityProvider: 'requester-sso',
      registeredAt: '2026-10-27T09:00:00Z',
      recordedAt: '2026-10-27T09:00:01Z',
    }),
  );
  vi.stubGlobal('fetch', fetch);
  open(`/tenants/${tenant}`);
  const link = await screen.findByRole('link', { name: 'Start a request' });
  expect(link.getAttribute('href')).toBe(`/tenants/${tenant}/new`);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('requires session verification before progress and offers only the reviewed tenant login return', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
    Response.json(
      {
        type: 'urn:ergon:problem:browser-authentication-required',
        title: 'Authentication required',
        detail: 'Sign in',
        status: 401,
        signInPath: '/bff/login',
      },
      { status: 401 },
    ),
  );
  vi.stubGlobal('fetch', fetch);
  open(`/tenants/${tenant}/cases/${caseId}`);
  const signIn = await screen.findByRole('link', { name: 'Sign in to Ergon' });
  expect(signIn.getAttribute('href')).toBe(
    `/bff/login?returnTo=%2Ftenants%2F${tenant}`,
  );
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  expect(fetch.mock.calls[0]?.[0]).toBe(`/bff/v1/tenants/${tenant}/session`);
  expect(screen.queryByRole('heading', { name: 'Case progress' })).toBeNull();
});
