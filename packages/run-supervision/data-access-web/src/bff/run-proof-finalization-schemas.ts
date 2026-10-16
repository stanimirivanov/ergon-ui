import { Either, Schema } from 'effect';
import type {
  RunProofFinalizationCommand,
  RunProofFinalizationReceipt,
} from '../proof-finalization-contracts';
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
      value < Number.MAX_SAFE_INTEGER,
  ),
);
const caseVersion = revision.pipe(Schema.filter((value) => value > 0));
const commandSchema = Schema.Struct({
  tenantId: uuid,
  runId: uuid,
  commandId: uuid,
  expectedSupervisionRevision: revision,
  expectedRunVersion: Schema.Literal(1),
  expectedCaseVersion: caseVersion,
  factId: uuid,
  observationId: uuid,
});
const receiptSchema = Schema.Struct({
  commandId: uuid,
  runId: uuid,
  supervisionRevision: revision,
  expectedRunVersion: Schema.Literal(1),
  assessedCaseVersion: caseVersion,
  factId: uuid,
  observationId: uuid,
  runSequence: Schema.Literal(2),
  caseClosureStreamVersion: Schema.Number.pipe(
    Schema.filter((value) => Number.isSafeInteger(value) && value > 0),
  ),
  acceptedAt: Schema.String.pipe(Schema.filter(isUtcInstant)),
  recordedAt: Schema.String.pipe(Schema.filter(isUtcInstant)),
});

export function isValidProofCommand(
  command: RunProofFinalizationCommand,
): boolean {
  return Either.isRight(Schema.decodeUnknownEither(commandSchema)(command));
}

/** HTTP success is insufficient: bind every reviewed coordinate and its immediate closure before caching feedback. Private extras are stripped. */
export function decodeProofReceipt(
  body: unknown,
  command: RunProofFinalizationCommand,
): RunProofFinalizationReceipt | undefined {
  const decoded = Schema.decodeUnknownEither(receiptSchema)(body);
  if (Either.isLeft(decoded)) return undefined;
  const receipt = decoded.right;
  const sameId = (left: string, right: string): boolean =>
    left.toLowerCase() === right.toLowerCase();
  return sameId(receipt.commandId, command.commandId) &&
    sameId(receipt.runId, command.runId) &&
    sameId(receipt.factId, command.factId) &&
    sameId(receipt.observationId, command.observationId) &&
    receipt.supervisionRevision === command.expectedSupervisionRevision &&
    receipt.expectedRunVersion === command.expectedRunVersion &&
    receipt.assessedCaseVersion === command.expectedCaseVersion &&
    receipt.caseClosureStreamVersion === command.expectedCaseVersion + 1
    ? receipt
    : undefined;
}
