import { configureStore } from '@reduxjs/toolkit';
import {
  createCurrentActorBffAdapter,
  currentActorApi,
} from '@ergon/session-data-access-web';
import {
  createNotificationClient,
  notificationApi,
} from '@ergon/notifications-data-access-web';

/** Requester-only session/feed lifetime; no resolver capability is registered. */
export function createNotificationStore(fetch: typeof globalThis.fetch) {
  const store = configureStore({
    reducer: {
      [currentActorApi.reducerPath]: currentActorApi.reducer,
      [notificationApi.reducerPath]: notificationApi.reducer,
    },
    middleware: (defaults) =>
      defaults({
        thunk: {
          extraArgument: {
            resolveCurrentActor: createCurrentActorBffAdapter({ fetch }),
            notificationsClient: createNotificationClient({ fetch }),
          },
        },
      }).concat(currentActorApi.middleware, notificationApi.middleware),
  });
  return {
    store,
    dispose(): void {
      for (const request of store.dispatch(
        currentActorApi.util.getRunningQueriesThunk(),
      ))
        request.abort();
      for (const request of store.dispatch(
        notificationApi.util.getRunningQueriesThunk(),
      ))
        request.abort();
      store.dispatch(currentActorApi.util.resetApiState());
      store.dispatch(notificationApi.util.resetApiState());
    },
  };
}
