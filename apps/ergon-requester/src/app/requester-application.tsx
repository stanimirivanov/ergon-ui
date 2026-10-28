import type { ReactElement, ComponentProps } from 'react';
import { RouterProvider } from 'react-router';
import {
  LocalSessionBoundary,
  LocalSignOutStatus,
} from '@ergon/session-feature-web';

/** App owns router placement, public exit layout and the existing canonical tenant-only login allowlist. */
export function RequesterApplication({
  router,
  fetch,
}: {
  readonly router: ComponentProps<typeof RouterProvider>['router'];
  readonly fetch: typeof globalThis.fetch;
}): ReactElement {
  return (
    <LocalSessionBoundary
      fetch={fetch}
      signInHrefForCurrentLocation={() =>
        requesterSignInHref(router.state.location.pathname)
      }
      renderRetired={(state, retry, signInHref) => (
        <main
          id="main-content"
          className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10"
        >
          <LocalSignOutStatus
            state={state}
            retry={retry}
            signInHref={signInHref}
          />
        </main>
      )}
    >
      <RouterProvider router={router} />
    </LocalSessionBoundary>
  );
}

/** Discard case IDs/query/fragment and reject incomplete tenants; never restore private navigation after sign-out. */
export function requesterSignInHref(pathname: string): string | undefined {
  const tenant =
    /^\/tenants\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})(?:\/|$)/iu.exec(
      pathname,
    )?.[1];
  return tenant === undefined
    ? undefined
    : `/bff/login?${new URLSearchParams({ returnTo: `/tenants/${tenant.toLowerCase()}` })}`;
}
