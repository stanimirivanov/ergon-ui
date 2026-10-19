import { Either, Schema } from 'effect';
import type {
  RunControlCommand,
  RunControlQuery,
  RunControlReceipt,
  RunControlView,
} from '../control-contracts';
import { isUtcInstant } from './run-wire-instant';

const uuid = Schema.String.pipe(
  Schema.pattern(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ),
);
const revision = Schema.Number.pipe(
  Schema.filter(
    (n) => Number.isSafeInteger(n) && n >= 0 && n < Number.MAX_SAFE_INTEGER,
  ),
);
const instant = Schema.String.pipe(Schema.filter(isUtcInstant));

/** Shared command boundary: positive browser-exact acquisition fence, with unknown holder fields stripped. */
export const runControlFenceSchema = Schema.Struct({
  leaseId: uuid,
  revision: revision.pipe(Schema.filter((n) => n > 0)),
});
export const optionalRunControl = Schema.optionalWith(runControlFenceSchema, {
  exact: true,
});
const query = Schema.Struct({
  tenantId: uuid,
  runId: uuid,
  expectedSupervisionRevision: revision,
});
const command = Schema.Union(
  Schema.Struct({
    ...query.fields,
    commandId: uuid,
    action: Schema.Literal('ACQUIRE'),
  }),
  Schema.Struct({
    ...query.fields,
    commandId: uuid,
    action: Schema.Literal('RENEW', 'RELEASE'),
    control: runControlFenceSchema,
  }),
);
const coordinates = { supervisionRevision: revision, observedAt: instant };
const view = Schema.Union(
  Schema.Struct({
    ...coordinates,
    status: Schema.Literal('DISABLED', 'AVAILABLE', 'EXPIRED', 'TERMINAL'),
  }),
  Schema.Struct({
    ...coordinates,
    status: Schema.Literal('ANOTHER_SESSION'),
    expiresAt: instant,
  }),
  Schema.Struct({
    ...coordinates,
    status: Schema.Literal('THIS_SESSION'),
    expiresAt: instant,
    fence: runControlFenceSchema,
  }),
);
const receipt = Schema.Struct({
  commandId: uuid,
  runId: uuid,
  action: Schema.Literal('ACQUIRE', 'RENEW', 'RELEASE'),
  supervisionRevision: revision,
  control: runControlFenceSchema,
  changedAt: instant,
  expiresAt: instant,
  recordedAt: instant,
});

export function validRunControlQuery(value: RunControlQuery): boolean {
  return Either.isRight(Schema.decodeUnknownEither(query)(value));
}

export function decodeRunControlCommand(
  value: RunControlCommand,
): RunControlCommand | undefined {
  const result = Schema.decodeUnknownEither(command)(value);
  if (Either.isLeft(result)) return undefined;
  // Acquire must never silently discard a caller-supplied previous fence.
  if (result.right.action === 'ACQUIRE' && 'control' in value) return undefined;
  return result.right;
}

/** Reject epoch drift and forbidden cross-session fence disclosure; strip all unconsumed private extras. */
export function decodeRunControlView(
  body: unknown,
  requested: RunControlQuery,
): RunControlView | undefined {
  const result = Schema.decodeUnknownEither(view)(body);
  if (Either.isLeft(result)) return undefined;
  const value = result.right;
  if (value.supervisionRevision !== requested.expectedSupervisionRevision)
    return undefined;
  if (typeof body !== 'object' || body === null) return undefined;
  if (value.status !== 'THIS_SESSION' && 'fence' in body && body.fence !== null)
    return undefined;
  if ('expiresAt' in value) {
    const duration = Date.parse(value.expiresAt) - Date.parse(value.observedAt);
    if (duration <= 0 || duration > 120_000) return undefined;
  }
  return value;
}

/** Match original intent exactly, including renewal fence and fixed duration; persistence time need not match decision time. */
export function decodeRunControlReceipt(
  body: unknown,
  intent: RunControlCommand,
): RunControlReceipt | undefined {
  const result = Schema.decodeUnknownEither(receipt)(body);
  if (Either.isLeft(result)) return undefined;
  const value = result.right;
  if (
    value.commandId.toLowerCase() !== intent.commandId.toLowerCase() ||
    value.runId.toLowerCase() !== intent.runId.toLowerCase() ||
    value.action !== intent.action ||
    value.supervisionRevision !== intent.expectedSupervisionRevision
  )
    return undefined;
  const duration = Date.parse(value.expiresAt) - Date.parse(value.changedAt);
  if (duration <= 0 || (value.action !== 'RELEASE' && duration !== 120_000))
    return undefined;
  if (
    intent.action !== 'ACQUIRE' &&
    (value.control.leaseId.toLowerCase() !==
      intent.control.leaseId.toLowerCase() ||
      value.control.revision !== intent.control.revision)
  )
    return undefined;
  return value;
}

/** Whitelist non-secret coordinates after command validation; never forward caller-selected session fields. */
export function runControlWireFields(command: {
  readonly control?: { readonly leaseId: string; readonly revision: number };
}): {
  readonly control?: { readonly leaseId: string; readonly revision: number };
} {
  return command.control === undefined
    ? {}
    : {
        control: {
          leaseId: command.control.leaseId,
          revision: command.control.revision,
        },
      };
}
