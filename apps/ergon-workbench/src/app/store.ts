import { configureStore } from '@reduxjs/toolkit';
import { humanFollowUpApi } from '@ergon/infrastructure-follow-up-web';
import { currentActorApi } from '@ergon/infrastructure-session-web';

import type { WorkbenchDependencies } from './workbench-dependencies';

/**
 * Creates an isolated workbench store with injected application capabilities.
 *
 * Remote resources remain owned by the RTK Query APIs. Dependencies are passed
 * through the thunk extra argument and are not stored in serializable state.
 */
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
