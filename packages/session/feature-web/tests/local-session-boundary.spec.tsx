import { StrictMode, useEffect } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { LocalLogoutResult } from '@ergon/session-data-access-web';
import { LocalSessionBoundary, LocalSignOutStatus } from '../src';
import { useLocalSignOut } from '../src/local-session-boundary';

afterEach(cleanup);
function PrivateView({ retired }: { readonly retired: () => void }) {
  const exit = useLocalSignOut();
  useEffect(
    () => () => {
      queueMicrotask(retired);
    },
    [retired],
  );
  return (
    <section>
      <p>PRIVATE-DRAFT</p>
      <button onClick={exit}>Confirm exit</button>
    </section>
  );
}
it('starts only after private DOM and queued resource cleanup retire, keeps uncertainty closed and retries explicitly', async () => {
  let retired = false;
  const retire = (): void => {
    retired = true;
  };
  const logout = vi
    .fn()
    .mockImplementation(async (): Promise<LocalLogoutResult> => {
      expect(screen.queryByText('PRIVATE-DRAFT')).toBeNull();
      expect(retired).toBe(true);
      expect(
        screen.getByRole('heading', { name: 'Signing out locally…' }),
      ).toBe(document.activeElement);
      return logout.mock.calls.length === 1
        ? { kind: 'failed', failure: 'transport' }
        : { kind: 'signed-out' };
    });
  render(
    <StrictMode>
      <LocalSessionBoundary
        fetch={vi.fn()}
        client={{ logout }}
        signInHrefForCurrentLocation={() =>
          '/bff/login?returnTo=%2Ftenants%2Fpublic'
        }
        renderRetired={(state, retry, signInHref) => (
          <main>
            <LocalSignOutStatus
              state={state}
              retry={retry}
              signInHref={signInHref}
            />
          </main>
        )}
      >
        <PrivateView retired={retire} />
      </LocalSessionBoundary>
    </StrictMode>,
  );
  await act(async () => {
    await Promise.resolve();
  });
  retired = false;
  fireEvent.click(screen.getByRole('button', { name: 'Confirm exit' }));
  await screen.findByRole('alert');
  expect(logout).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('link', { name: 'Sign in again' })).toBeNull();
  expect(screen.queryByText('PRIVATE-DRAFT')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retry local sign-out' }));
  await screen.findByRole('heading', { name: 'You are signed out locally.' });
  expect(logout).toHaveBeenCalledTimes(2);
  expect(
    screen.getByRole('link', { name: 'Sign in again' }).getAttribute('href'),
  ).toContain('/bff/login');
});
it('contains synchronous injected defects without restoring private content', async () => {
  const logout = vi.fn().mockImplementation(() => {
    throw new Error('PRIVATE-DEFECT');
  });
  render(
    <LocalSessionBoundary
      fetch={vi.fn()}
      client={{ logout }}
      signInHrefForCurrentLocation={() => undefined}
      renderRetired={(state, retry, signInHref) => (
        <main>
          <LocalSignOutStatus
            state={state}
            retry={retry}
            signInHref={signInHref}
          />
        </main>
      )}
    >
      <PrivateView retired={() => undefined} />
    </LocalSessionBoundary>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Confirm exit' }));
  await screen.findByRole('alert');
  expect(document.body.textContent).not.toContain('PRIVATE-DEFECT');
  expect(screen.queryByText('PRIVATE-DRAFT')).toBeNull();
});
it('aborts pending logout observation and ignores late acknowledgement after host departure', async () => {
  let finish: (result: LocalLogoutResult) => void = () => undefined;
  let observed: AbortSignal | undefined;
  const logout = vi.fn().mockImplementation((signal: AbortSignal) => {
    observed = signal;
    return new Promise<LocalLogoutResult>((resolve) => {
      finish = resolve;
    });
  });
  const view = render(
    <LocalSessionBoundary
      fetch={vi.fn()}
      client={{ logout }}
      signInHrefForCurrentLocation={() => undefined}
      renderRetired={(state, retry, signInHref) => (
        <main>
          <LocalSignOutStatus
            state={state}
            retry={retry}
            signInHref={signInHref}
          />
        </main>
      )}
    >
      <PrivateView retired={() => undefined} />
    </LocalSessionBoundary>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Confirm exit' }));
  await act(async () => {
    await Promise.resolve();
  });
  expect(logout).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(observed?.aborted).toBe(true);
  await act(async () => {
    finish({ kind: 'signed-out' });
  });
  expect(screen.queryByRole('heading')).toBeNull();
});
