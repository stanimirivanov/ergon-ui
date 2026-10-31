import { lazy, Suspense } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';

import App from './app';
import { NotFound } from './not-found';

const CurrentActorRoute = lazy(async () => {
  const route = await import('../session/current-actor-route');
  return { default: route.CurrentActorRoute };
});
const NotificationRoute = lazy(async () => {
  const route = await import('../notifications/notification-route');
  return { default: route.NotificationRoute };
});

const EvidenceRoute = lazy(async () => {
  const route = await import('../evidence/evidence-route');
  return { default: route.EvidenceRoute };
});

const EvaluationRoute = lazy(async () => {
  const route = await import('../simulation/evaluation-route');
  return { default: route.EvaluationRoute };
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
    path: '/tenants/:tenantId/simulation',
    element: (
      <Suspense fallback={<p role="status">Opening Simulation Lab…</p>}>
        <EvaluationRoute />
      </Suspense>
    ),
  },
  {
    path: '/tenants/:tenantId/evidence',
    element: (
      <Suspense fallback={<p role="status">Opening evidence…</p>}>
        <EvidenceRoute />
      </Suspense>
    ),
  },

  {
    path: '/tenants/:tenantId/notifications',
    element: (
      <Suspense fallback={<p role="status">Opening notifications…</p>}>
        <NotificationRoute />
      </Suspense>
    ),
  },
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
