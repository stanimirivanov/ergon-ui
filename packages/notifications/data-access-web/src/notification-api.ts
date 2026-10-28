import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { Either, Schema } from 'effect';
import type {
  NotificationClient,
  NotificationFailure,
  NotificationPage,
  NotificationQuery,
} from './notification-contract';
import { parseNotificationPage } from './notification-schema';

const failure = Schema.Struct({
  kind: Schema.Literal(
    'authentication-required',
    'forbidden',
    'unavailable',
    'transport',
    'timeout',
    'request-cancelled',
    'invalid-response',
    'unexpected-defect',
  ),
});
/** Closed safe values only: reject framework/port diagnostics before state or UI logging can retain them. */
export function normalizeNotificationFailure(
  value: unknown,
): NotificationFailure {
  const decoded = Schema.decodeUnknownEither(failure)(value);
  return Either.isRight(decoded)
    ? decoded.right
    : { kind: 'unexpected-defect' };
}
/** Injected per disclosure lifetime, outside Redux state. */
export interface NotificationDependencies {
  readonly notificationsClient: NotificationClient;
}
function isClient(value: unknown): value is NotificationClient {
  return (
    typeof value === 'object' &&
    value !== null &&
    'read' in value &&
    typeof value.read === 'function'
  );
}
/** Remote state only, with zero cache grace. Host retires owned handles/store on refresh, target change or session replacement. */
export const notificationApi = createApi({
  reducerPath: 'notificationApi',
  baseQuery: fakeBaseQuery<NotificationFailure>(),
  keepUnusedDataFor: 0,
  endpoints: (build) => ({
    recent: build.query<NotificationPage, NotificationQuery>({
      async queryFn(
        query,
        api,
      ): Promise<{ data: NotificationPage } | { error: NotificationFailure }> {
        try {
          const extra = api.extra;
          if (
            typeof extra !== 'object' ||
            extra === null ||
            !('notificationsClient' in extra) ||
            !isClient(extra.notificationsClient)
          )
            return { error: { kind: 'unexpected-defect' } };
          const result = await extra.notificationsClient.read(
            query,
            api.signal,
          );
          if (
            typeof result !== 'object' ||
            result === null ||
            (result.ok !== true && result.ok !== false)
          )
            return { error: { kind: 'unexpected-defect' } };
          if (!result.ok)
            return { error: normalizeNotificationFailure(result.error) };
          const page = parseNotificationPage(result.page, query.audience);
          return page === undefined
            ? { error: { kind: 'unexpected-defect' } }
            : { data: page };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
  }),
});
