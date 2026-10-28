import type { Schema } from 'effect';
import type { pageSchema } from './notification-schema';

export type NotificationAudience = 'requester' | 'resolver';
/** Actor scopes the memory cache only; neither actor nor audience is sent as authority to the BFF. */
export interface NotificationQuery {
  readonly tenantId: string;
  readonly actorId: string;
  readonly audience: NotificationAudience;
}
/** Historical coordinates only. Identity includes kind/source/target; source UUID alone is not unique. */
export type NotificationPage = Schema.Schema.Type<typeof pageSchema>;
export type Notification = NotificationPage['items'][number];
export type NotificationFailure = {
  readonly kind:
    | 'authentication-required'
    | 'forbidden'
    | 'unavailable'
    | 'transport'
    | 'timeout'
    | 'request-cancelled'
    | 'invalid-response'
    | 'unexpected-defect';
};
export type NotificationResult =
  | { readonly ok: true; readonly page: NotificationPage }
  | { readonly ok: false; readonly error: NotificationFailure };
/** Read-only invocation; no retries, writes, persistence or target checks. Caller owns cancellation. Defects may reject. */
export interface NotificationClient {
  read(
    query: NotificationQuery,
    signal: AbortSignal,
  ): Promise<NotificationResult>;
}

export function notificationKey(item: Notification): string {
  return JSON.stringify([
    item.kind,
    item.sourceId.toLowerCase(),
    item.target.kind,
    item.target.id.toLowerCase(),
  ]);
}
