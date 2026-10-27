import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  IntakeClient,
  IntakeCommand,
  IntakeFailure,
} from './intake-contract';

/** Executable port belongs to the route's store lifetime, outside serializable Redux state. */
export interface IntakeDependencies {
  readonly intakeClient: IntakeClient;
}
const kinds: readonly IntakeFailure['kind'][] = [
  'authentication-required',
  'forbidden',
  'intake-conflict',
  'invalid-input',
  'csrf-rejected',
  'unavailable',
  'timeout',
  'transport',
  'invalid-response',
  'unexpected-response',
  'unexpected-defect',
  'request-cancelled',
];
/** Validate closed kinds and discard diagnostics. Malformed client results/framework errors are defects, not protocol failures. */
export function normalizeIntakeFailure(value: unknown): IntakeFailure {
  if (typeof value === 'object' && value !== null && 'kind' in value)
    for (const kind of kinds) if (value.kind === kind) return { kind };
  return { kind: 'unexpected-defect' };
}
/** Mutation-only API; callers own abort/reset. Never insert historical receipts into a progress resource. */
export const intakeApi = createApi({
  reducerPath: 'requesterIntakeApi',
  baseQuery: fakeBaseQuery<IntakeFailure>(),
  endpoints: (build) => ({
    submit: build.mutation<{ readonly caseId: string }, IntakeCommand>({
      async queryFn(
        command,
        api,
      ): Promise<
        { data: { readonly caseId: string } } | { error: IntakeFailure }
      > {
        try {
          const extra = api.extra;
          if (
            typeof extra !== 'object' ||
            extra === null ||
            !('intakeClient' in extra) ||
            !isClient(extra.intakeClient)
          )
            return { error: { kind: 'unexpected-defect' } };
          const result = await extra.intakeClient.submit(command, api.signal);
          if (
            typeof result !== 'object' ||
            result === null ||
            (result.ok !== true && result.ok !== false)
          )
            return { error: { kind: 'unexpected-defect' } };
          return result.ok
            ? result.caseId === command.caseId
              ? { data: { caseId: result.caseId } }
              : { error: { kind: 'unexpected-defect' } }
            : { error: normalizeIntakeFailure(result.error) };
        } catch {
          return { error: { kind: 'unexpected-defect' } };
        }
      },
    }),
  }),
});
function isClient(value: unknown): value is IntakeClient {
  return (
    typeof value === 'object' &&
    value !== null &&
    'submit' in value &&
    typeof value.submit === 'function'
  );
}
