import { configureStore } from '@reduxjs/toolkit';

import {
  currentActorApi,
  type WorkbenchDependencies,
} from '../session/current-actor-api';

export function createWorkbenchStore(dependencies: WorkbenchDependencies) {
  return configureStore({
    reducer: {
      [currentActorApi.reducerPath]: currentActorApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: dependencies },
      }).concat(currentActorApi.middleware),
  });
}
