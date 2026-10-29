import { configureStore } from '@reduxjs/toolkit';
import { humanFollowUpApi } from '@ergon/follow-up-data-access-web';
import { currentActorApi } from '@ergon/session-data-access-web';
import { runSupervisionApi } from '@ergon/run-supervision-data-access-web';

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
      [runSupervisionApi.reducerPath]: runSupervisionApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: dependencies },
      }).concat(
        currentActorApi.middleware,
        humanFollowUpApi.middleware,
        runSupervisionApi.middleware,
      ),
  });
}

/** Abort all resource handles and remove private caches after their subscribers unmount. Never sends a domain command or lease release. */
export function retireWorkbenchStore(
  store: ReturnType<typeof createWorkbenchStore>,
): void {
  for (const request of store.dispatch(
    currentActorApi.util.getRunningQueriesThunk(),
  ))
    request.abort();
  for (const request of store.dispatch(
    humanFollowUpApi.util.getRunningQueriesThunk(),
  ))
    request.abort();
  for (const request of store.dispatch(
    humanFollowUpApi.util.getRunningMutationsThunk(),
  ))
    request.abort();
  for (const request of store.dispatch(
    runSupervisionApi.util.getRunningQueriesThunk(),
  ))
    request.abort();
  for (const request of store.dispatch(
    runSupervisionApi.util.getRunningMutationsThunk(),
  ))
    request.abort();
  store.dispatch(currentActorApi.util.resetApiState());
  store.dispatch(humanFollowUpApi.util.resetApiState());
  store.dispatch(runSupervisionApi.util.resetApiState());
}
