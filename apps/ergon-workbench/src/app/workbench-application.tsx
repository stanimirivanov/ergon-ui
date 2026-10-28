import type { ComponentProps, ReactElement } from 'react';
import { RouterProvider } from 'react-router';
import {
  LocalSessionBoundary,
  LocalSignOutStatus,
} from '@ergon/session-feature-web';
import { browserSignInHref } from '../session/browser-session-navigation';

/** Keep exit state outside every private route/provider; app composition owns public layout and the trusted return target. */
export function WorkbenchApplication({
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
        workbenchSignInHref(router.state.location.pathname)
      }
      renderRetired={(state, retry, signInHref) => (
        <main
          id="main-content"
          className="mx-auto min-h-dvh w-full max-w-3xl px-5 py-10"
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

/** Only retain a canonical tenant landing path, never Console selection, query, fragment or a supplied target. */
export function workbenchSignInHref(pathname: string): string | undefined {
  const tenant =
    /^\/tenants\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})(?:\/|$)/iu.exec(
      pathname,
    )?.[1];
  return tenant === undefined
    ? undefined
    : browserSignInHref(tenant.toLowerCase());
}
