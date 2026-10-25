import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { RequesterRoute } from './app/requester-route';

const router = createBrowserRouter([
  { path: '/', element: <RequesterRoute /> },
  { path: '/tenants/:tenantId', element: <RequesterRoute /> },
  { path: '/tenants/:tenantId/cases/:caseId', element: <RequesterRoute /> },
  { path: '*', element: <RequesterRoute /> },
]);
const root = document.getElementById('root');
if (root === null) throw new Error('Missing application root');
createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
