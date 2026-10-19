import { optionalRunControl } from './run-control-schemas';
import { Either, Schema } from 'effect';
import type { AssignedRunConsole } from '../contracts';
import { isUtcInstant } from './run-wire-instant';
import type {
  RunApprovalCommand,
  RunApprovalReceipt,
} from '../approval-contracts';

const uuid = Schema.String.pipe(
  Schema.pattern(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ),
);
const instant = Schema.String.pipe(Schema.filter(isUtcInstant));
const revision = Schema.Number.pipe(
  Schema.filter(
    (value) =>
      Number.isSafeInteger(value) &&
      value >= 0 &&
      value <= Number.MAX_SAFE_INTEGER - 1,
  ),
);
const outcome = Schema.Literal('APPROVED', 'REJECTED');
export const approvalReviewSchema = Schema.Struct({
  status: Schema.Literal(
    'NOT_REQUIRED',
    'NOT_REQUESTED',
    'PENDING',
    'EXPIRED',
    'DECIDED',
  ),
  observedAt: instant,
  canDecide: Schema.Boolean,
  request: Schema.NullOr(
    Schema.Struct({
      requestId: uuid,
      authority: Schema.Literal('REQUESTER', 'RESOLVER'),
      requestedAt: instant,
      expiresAt: instant,
      recordedAt: instant,
    }),
  ),
  decision: Schema.NullOr(
    Schema.Struct({
      decisionId: uuid,
      outcome,
      decidedAt: instant,
      recordedAt: instant,
    }),
  ),
});
const commandSchema = Schema.Struct({
  control: optionalRunControl,
  tenantId: uuid,
  runId: uuid,
  requestId: uuid,
  commandId: uuid,
  expectedSupervisionRevision: revision,
  outcome,
});
const receiptSchema = Schema.Struct({
  commandId: uuid,
  runId: uuid,
  requestId: uuid,
  supervisionRevision: revision,
  decisionId: uuid,
  outcome,
  decidedAt: instant,
  recordedAt: instant,
});

export function isValidApprovalCommand(command: RunApprovalCommand): boolean {
  return Either.isRight(Schema.decodeUnknownEither(commandSchema)(command));
}
/** Require exact intent attribution before a successful HTTP response can become historical feedback. */
export function decodeApprovalReceipt(
  body: unknown,
  command: RunApprovalCommand,
): RunApprovalReceipt | undefined {
  const decoded = Schema.decodeUnknownEither(receiptSchema)(body);
  if (Either.isLeft(decoded)) return undefined;
  const receipt = decoded.right;
  return receipt.commandId.toLowerCase() === command.commandId.toLowerCase() &&
    receipt.runId.toLowerCase() === command.runId.toLowerCase() &&
    receipt.requestId.toLowerCase() === command.requestId.toLowerCase() &&
    receipt.supervisionRevision === command.expectedSupervisionRevision &&
    receipt.outcome === command.outcome
    ? receipt
    : undefined;
}
// Schema validity alone cannot establish lifecycle consistency or pinned authority.
export function isConsistentApprovalReview(run: AssignedRunConsole): boolean {
  const review = run.approvalReview;
  if (review === undefined) return true;
  const { status, request, decision } = review;
  if (status === 'NOT_REQUIRED' || status === 'NOT_REQUESTED')
    return (
      request === null &&
      decision === null &&
      !review.canDecide &&
      (status === 'NOT_REQUIRED') === (run.requiredApproval === 'NONE')
    );
  if (
    request === null ||
    request.authority !== run.requiredApproval ||
    run.supervisionRevision === undefined
  )
    return false;
  if (compareInstant(request.requestedAt, request.expiresAt) >= 0) return false;
  if (status === 'DECIDED')
    return (
      !review.canDecide &&
      decision !== null &&
      compareInstant(decision.decidedAt, request.requestedAt) >= 0 &&
      compareInstant(decision.decidedAt, request.expiresAt) < 0
    );
  if (
    decision !== null ||
    (status === 'EXPIRED') !==
      compareInstant(review.observedAt, request.expiresAt) >= 0
  )
    return false;
  return (
    !review.canDecide ||
    (status === 'PENDING' &&
      run.state === 'WAITING_FOR_APPROVAL' &&
      compareInstant(request.requestedAt, review.observedAt) <= 0)
  );
}
function compareInstant(left: string, right: string): number {
  const fixed = (value: string) =>
    `${value.slice(0, 19)}.${value.slice(19, -1).replace('.', '').padEnd(9, '0')}Z`;
  const first = fixed(left);
  const second = fixed(right);
  return first === second ? 0 : first < second ? -1 : 1;
}
