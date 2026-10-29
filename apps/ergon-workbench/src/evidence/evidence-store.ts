import { configureStore } from '@reduxjs/toolkit';
import {
  createCurrentActorBffAdapter,
  currentActorApi,
} from '@ergon/session-data-access-web';
import {
  createEvidenceClient,
  evidenceApi,
} from '@ergon/evidence-data-access-web';
/** One session and evidence disclosure lifetime. Dispose after private subscribers unmount. */
export function createEvidenceStore(fetch: typeof globalThis.fetch) {
  const store = configureStore({
    reducer: {
      [currentActorApi.reducerPath]: currentActorApi.reducer,
      [evidenceApi.reducerPath]: evidenceApi.reducer,
    },
    middleware: (defaults) =>
      defaults({
        thunk: {
          extraArgument: {
            resolveCurrentActor: createCurrentActorBffAdapter({ fetch }),
            evidenceClient: createEvidenceClient({ fetch }),
          },
        },
      }).concat(currentActorApi.middleware, evidenceApi.middleware),
  });
  return {
    store,
    dispose(): void {
      for (const request of store.dispatch(
        currentActorApi.util.getRunningQueriesThunk(),
      ))
        request.abort();
      for (const request of store.dispatch(
        evidenceApi.util.getRunningQueriesThunk(),
      ))
        request.abort();
      for (const request of store.dispatch(
        evidenceApi.util.getRunningMutationsThunk(),
      ))
        request.abort();
      store.dispatch(currentActorApi.util.resetApiState());
      store.dispatch(evidenceApi.util.resetApiState());
    },
  };
}
