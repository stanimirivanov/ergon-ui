import { configureStore } from '@reduxjs/toolkit';

import { humanFollowUpApi } from '../follow-up/human-follow-up-api';
import { currentActorApi } from '../session/current-actor-api';
import type { WorkbenchDependencies } from './workbench-dependencies';

export function createWorkbenchStore(dependencies: WorkbenchDependencies) {
  return configureStore({
    reducer: {
      [currentActorApi.reducerPath]: currentActorApi.reducer,
      [humanFollowUpApi.reducerPath]: humanFollowUpApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: dependencies },
      }).concat(currentActorApi.middleware, humanFollowUpApi.middleware),
  });
}
