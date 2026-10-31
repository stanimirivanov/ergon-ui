import { configureStore } from '@reduxjs/toolkit';
import {
  createCurrentActorBffAdapter,
  currentActorApi,
} from '@ergon/session-data-access-web';
import {
  createEvaluationClient,
  createPromotionClient,
  promotionApi,
  evaluationApi,
} from '@ergon/evaluation-data-access-web';
/** One disclosure lifetime: session and one historical report page or exact report. */
export function createEvaluationStore(fetch: typeof globalThis.fetch) {
  const store = configureStore({
    reducer: {
      [currentActorApi.reducerPath]: currentActorApi.reducer,
      [evaluationApi.reducerPath]: evaluationApi.reducer,
      [promotionApi.reducerPath]: promotionApi.reducer,
    },
    middleware: (defaults) =>
      defaults({
        thunk: {
          extraArgument: {
            resolveCurrentActor: createCurrentActorBffAdapter({ fetch }),
            evaluationClient: createEvaluationClient({ fetch }),
            promotionClient: createPromotionClient({ fetch }),
          },
        },
      }).concat(
        currentActorApi.middleware,
        evaluationApi.middleware,
        promotionApi.middleware,
      ),
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
      for (const request of store.dispatch(
        promotionApi.util.getRunningMutationsThunk(),
      ))
        request.abort();
      store.dispatch(promotionApi.util.resetApiState());
      store.dispatch(currentActorApi.util.resetApiState());
      store.dispatch(evaluationApi.util.resetApiState());
    },
  };
}
