import { configureStore } from '@reduxjs/toolkit';
import {
  createCurrentActorBffAdapter,
  currentActorApi,
} from '@ergon/session-data-access-web';
import {
  createNotificationClient,
  notificationApi,
} from '@ergon/notifications-data-access-web';
import {
  createFollowUpNotificationTargetClient,
  followUpNotificationTargetApi,
} from '@ergon/follow-up-data-access-web';

/** One disclosure lifetime: session, feed or current-owner context. No queue cache is imported. */
export function createNotificationStore(fetch: typeof globalThis.fetch) {
  const store = configureStore({
    reducer: {
      [currentActorApi.reducerPath]: currentActorApi.reducer,
      [notificationApi.reducerPath]: notificationApi.reducer,
      [followUpNotificationTargetApi.reducerPath]:
        followUpNotificationTargetApi.reducer,
    },
    middleware: (defaults) =>
      defaults({
        thunk: {
          extraArgument: {
            resolveCurrentActor: createCurrentActorBffAdapter({ fetch }),
            notificationsClient: createNotificationClient({ fetch }),
            followUpNotificationTarget: createFollowUpNotificationTargetClient({
              fetch,
            }),
          },
        },
      }).concat(
        currentActorApi.middleware,
        notificationApi.middleware,
        followUpNotificationTargetApi.middleware,
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
        notificationApi.util.getRunningQueriesThunk(),
      ))
        request.abort();
      for (const request of store.dispatch(
        followUpNotificationTargetApi.util.getRunningQueriesThunk(),
      ))
        request.abort();
      store.dispatch(currentActorApi.util.resetApiState());
      store.dispatch(notificationApi.util.resetApiState());
      store.dispatch(followUpNotificationTargetApi.util.resetApiState());
    },
  };
}
