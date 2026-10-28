import { configureStore } from '@reduxjs/toolkit';
import {
  createCurrentActorBffAdapter,
  currentActorApi,
} from '@ergon/session-data-access-web';
import {
  createProgressBffClient,
  progressApi,
} from '@ergon/requester-progress-data-access-web';
import {
  createIntakeBffClient,
  intakeApi,
} from '@ergon/requester-intake-data-access-web';

/** One supplied-link lifetime. Dispose after subscriber withdrawal; no resolver API or global CSRF client exists here. */
export function createRequesterStore(fetch: typeof globalThis.fetch) {
  const store = configureStore({
    reducer: {
      [currentActorApi.reducerPath]: currentActorApi.reducer,
      [progressApi.reducerPath]: progressApi.reducer,
      [intakeApi.reducerPath]: intakeApi.reducer,
    },
    middleware: (defaults) =>
      defaults({
        thunk: {
          extraArgument: {
            resolveCurrentActor: createCurrentActorBffAdapter({ fetch }),
            progressClient: createProgressBffClient({ fetch }),
            intakeClient: createIntakeBffClient({ fetch }),
          },
        },
      }).concat(
        currentActorApi.middleware,
        progressApi.middleware,
        intakeApi.middleware,
      ),
  });
  let disposed = false;
  return {
    store,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const request of store.dispatch(
        currentActorApi.util.getRunningQueriesThunk(),
      ))
        request.abort();
      for (const request of store.dispatch(
        progressApi.util.getRunningQueriesThunk(),
      ))
        request.abort();
      for (const request of store.dispatch(
        progressApi.util.getRunningMutationsThunk(),
      ))
        request.abort();
      for (const request of store.dispatch(
        intakeApi.util.getRunningQueriesThunk(),
      ))
        request.abort();
      for (const request of store.dispatch(
        intakeApi.util.getRunningMutationsThunk(),
      ))
        request.abort();
      store.dispatch(currentActorApi.util.resetApiState());
      store.dispatch(progressApi.util.resetApiState());
      store.dispatch(intakeApi.util.resetApiState());
    },
  };
}
