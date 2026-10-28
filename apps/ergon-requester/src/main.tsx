import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RequesterApplication } from './app/requester-application';
import { RequesterRoute } from './app/requester-route';
import { RequesterNotificationRoute } from './notifications/notification-route';

const router = createBrowserRouter([
  { path: '/', element: <RequesterRoute /> },
  { path: '/tenants/:tenantId', element: <RequesterRoute /> },
  {
    path: '/tenants/:tenantId/notifications',
    element: <RequesterNotificationRoute />,
  },
  { path: '/tenants/:tenantId/new', element: <RequesterRoute mode="intake" /> },
  { path: '/tenants/:tenantId/cases/:caseId', element: <RequesterRoute /> },
  { path: '*', element: <RequesterRoute /> },
]);
const root = document.getElementById('root');
if (root === null) throw new Error('Missing application root');
createRoot(root).render(
  <StrictMode>
    <RequesterApplication
      router={router}
      fetch={globalThis.fetch.bind(globalThis)}
    />
  </StrictMode>,
);
