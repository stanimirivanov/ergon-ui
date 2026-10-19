import { optionalRunControl } from './run-control-schemas';
import { Either, Schema } from 'effect';
import type {
  RunSupervisorCandidatePage,
  RunSupervisorCandidateQuery,
  RunSupervisorHandoverCommand,
  RunSupervisorHandoverReceipt,
} from '../handover-contracts';
import { isUtcInstant } from './run-wire-instant';

const uuid = Schema.String.pipe(
  Schema.pattern(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ),
);
const revision = Schema.Number.pipe(
  Schema.filter(
    (value) =>
      Number.isSafeInteger(value) &&
      value >= 0 &&
      value <= Number.MAX_SAFE_INTEGER - 1,
  ),
);
const instant = Schema.String.pipe(Schema.filter(isUtcInstant));
const querySchema = Schema.Struct({
  tenantId: uuid,
  runId: uuid,
  expectedSupervisionRevision: revision,
  limit: Schema.optional(
    Schema.Number.pipe(
      Schema.filter(
        (value) => Number.isInteger(value) && value >= 1 && value <= 100,
      ),
    ),
  ),
  afterActorId: Schema.optional(uuid),
});
const commandSchema = Schema.Struct({
  control: optionalRunControl,
  tenantId: uuid,
  runId: uuid,
  commandId: uuid,
  expectedSupervisionRevision: revision,
  supervisorActorId: uuid,
});
const pageSchema = Schema.Struct({
  entries: Schema.Array(Schema.Struct({ actorId: uuid })),
  nextActorId: Schema.NullOr(uuid),
  supervisionRevision: revision,
});
const receiptSchema = Schema.Struct({
  commandId: uuid,
  runId: uuid,
  supervisionRevision: revision,
  handedOverAt: instant,
  recordedAt: instant,
});

export function isValidCandidateQuery(
  query: RunSupervisorCandidateQuery,
): boolean {
  return Either.isRight(Schema.decodeUnknownEither(querySchema)(query));
}

export function isValidHandoverCommand(
  command: RunSupervisorHandoverCommand,
): boolean {
  return (
    Either.isRight(Schema.decodeUnknownEither(commandSchema)(command)) &&
    command.expectedSupervisionRevision < Number.MAX_SAFE_INTEGER - 1
  );
}

/** Reject stale/mixed epochs, repeated cursors and unordered/duplicate identities; strip every private extra field. */
export function decodeCandidatePage(
  body: unknown,
  query: RunSupervisorCandidateQuery,
): RunSupervisorCandidatePage | undefined {
  const result = Schema.decodeUnknownEither(pageSchema)(body);
  if (Either.isLeft(result)) return undefined;
  const page = result.right;
  if (
    page.supervisionRevision !== query.expectedSupervisionRevision ||
    page.entries.length > (query.limit ?? 25)
  )
    return undefined;
  let previous = query.afterActorId?.toLowerCase();
  for (const entry of page.entries) {
    const current = entry.actorId.toLowerCase();
    if (previous !== undefined && current <= previous) return undefined;
    previous = current;
  }
  if (
    page.nextActorId !== null &&
    (page.entries.length === 0 || page.nextActorId.toLowerCase() !== previous)
  )
    return undefined;
  return page;
}

/** A successful HTTP response is not a receipt until its run, command and next supervision epoch agree. */
export function decodeHandoverReceipt(
  body: unknown,
  command: RunSupervisorHandoverCommand,
): RunSupervisorHandoverReceipt | undefined {
  const result = Schema.decodeUnknownEither(receiptSchema)(body);
  if (Either.isLeft(result)) return undefined;
  const value = result.right;
  return value.commandId.toLowerCase() === command.commandId.toLowerCase() &&
    value.runId.toLowerCase() === command.runId.toLowerCase() &&
    value.supervisionRevision === command.expectedSupervisionRevision + 1
    ? value
    : undefined;
}
