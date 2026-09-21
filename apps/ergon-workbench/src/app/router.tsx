import { lazy, Suspense } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';

import App from './app';
import { NotFound } from './not-found';

const CurrentActorRoute = lazy(async () => {
  const route = await import('../session/current-actor-route');
  return { default: route.CurrentActorRoute };
});

function CurrentActorRouteBoundary() {
  return (
    <Suspense
      fallback={
        <div
          className="grid min-h-screen place-items-center px-6 text-center text-sm font-semibold text-ink-muted"
          role="status"
        >
          Opening the Ergon workbench…
        </div>
      }
    >
      <CurrentActorRoute />
    </Suspense>
  );
}

export const workbenchRoutes: RouteObject[] = [
  {
    path: '/',
    Component: App,
  },
  {
    path: '/tenants/:tenantId',
    Component: CurrentActorRouteBoundary,
  },
  {
    path: '*',
    Component: NotFound,
  },
];

export const router = createBrowserRouter(workbenchRoutes);
