import { configureStore } from '@reduxjs/toolkit';
import {
  createCurrentActorBffAdapter,
  currentActorApi,
} from '@ergon/session-data-access-web';
import {
  createEvaluationClient,
  evaluationApi,
} from '@ergon/evaluation-data-access-web';
/** One disclosure lifetime: session and one historical report page or exact report. */
export function createEvaluationStore(fetch: typeof globalThis.fetch) {
  const store = configureStore({
    reducer: {
      [currentActorApi.reducerPath]: currentActorApi.reducer,
      [evaluationApi.reducerPath]: evaluationApi.reducer,
    },
    middleware: (defaults) =>
      defaults({
        thunk: {
          extraArgument: {
            resolveCurrentActor: createCurrentActorBffAdapter({ fetch }),
            evaluationClient: createEvaluationClient({ fetch }),
          },
        },
      }).concat(currentActorApi.middleware, evaluationApi.middleware),
  });
  return {
    store,
    dispose(): void {
      for (const request of store.dispatch(
        currentActorApi.util.getRunningQueriesThunk(),
      ))
        request.abort();
      for (const request of store.dispatch(
        evaluationApi.util.getRunningQueriesThunk(),
      ))
        request.abort();
      store.dispatch(currentActorApi.util.resetApiState());
      store.dispatch(evaluationApi.util.resetApiState());
    },
  };
}
