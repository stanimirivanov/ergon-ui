import { Either, Schema } from 'effect';
import {
  notificationKey,
  type NotificationAudience,
  type NotificationPage,
} from './notification-contract';

const instant = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/u),
  Schema.filter(
    (s) =>
      Number.isFinite(Date.parse(s)) &&
      new Date(Date.parse(s)).toISOString().slice(0, 19) === s.slice(0, 19),
  ),
);
const fields = { sourceId: Schema.UUID, deliveredAt: instant };
export const pageSchema = Schema.Struct({
  items: Schema.Array(
    Schema.Union(
      Schema.Struct({
        ...fields,
        kind: Schema.Literal('INFORMATION_REQUESTED'),
        target: Schema.Struct({
          kind: Schema.Literal('REQUESTER_CASE'),
          id: Schema.UUID,
        }),
      }),
      Schema.Struct({
        ...fields,
        kind: Schema.Literal('INFORMATION_ANSWERED', 'FOLLOW_UP_HANDED_OVER'),
        target: Schema.Struct({
          kind: Schema.Literal('OWNED_HUMAN_FOLLOW_UP'),
          id: Schema.UUID,
        }),
      }),
    ),
  ),
  truncated: Schema.Boolean,
});

// Pad fractions before comparing, retaining nanosecond ordering beyond Date's millisecond precision.
function orderKey(item: NotificationPage['items'][number]): string {
  const at = item.deliveredAt;
  const fraction = at.includes('.') ? at.slice(20, -1) : '';
  return [
    at.slice(0, 19) + '.' + fraction.padEnd(9, '0'),
    item.kind,
    item.sourceId.toLowerCase(),
    item.target.id.toLowerCase(),
  ].join('\0');
}

/** Strip unknown fields and reject mixed audiences, incoherent bounds, duplicate identities and reordered pages. */
export function parseNotificationPage(
  value: unknown,
  audience: NotificationAudience,
): NotificationPage | undefined {
  const decoded = Schema.decodeUnknownEither(pageSchema)(value);
  if (Either.isLeft(decoded)) return undefined;
  const page = decoded.right;
  if (page.items.length > 50 || (page.truncated && page.items.length !== 50))
    return undefined;
  const keys = new Set<string>();
  let previous: string | undefined;
  for (const item of page.items) {
    if ((item.kind === 'INFORMATION_REQUESTED') !== (audience === 'requester'))
      return undefined;
    const key = notificationKey(item),
      order = orderKey(item);
    if (keys.has(key) || (previous !== undefined && previous < order))
      return undefined;
    keys.add(key);
    previous = order;
  }
  return page;
}
