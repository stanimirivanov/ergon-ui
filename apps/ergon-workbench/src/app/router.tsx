import { createBrowserRouter, type RouteObject } from 'react-router';

import App from './app';
import { NotFound } from './not-found';

export const workbenchRoutes: RouteObject[] = [
  {
    path: '/',
    Component: App,
  },
  {
    path: '*',
    Component: NotFound,
  },
];

export const router = createBrowserRouter(workbenchRoutes);
