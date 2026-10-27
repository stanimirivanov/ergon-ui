/** Original raw input is immutable replay intent; the tenant/case UUIDs are coordinates, never authority. */
export interface IntakeCommand {
  readonly tenantId: string;
  readonly caseId: string;
  readonly goal: string;
  readonly initialObservation: string;
}
/** Diagnostic-free outcomes. Even a cancelled/failed invocation may have committed; recovery retains original intent. */
export type IntakeFailure = {
  readonly kind:
    | 'authentication-required'
    | 'forbidden'
    | 'intake-conflict'
    | 'invalid-input'
    | 'csrf-rejected'
    | 'unavailable'
    | 'timeout'
    | 'transport'
    | 'invalid-response'
    | 'unexpected-response'
    | 'unexpected-defect'
    | 'request-cancelled';
};
/** Acknowledgement identity only; callers must independently check current case progress. */
export type IntakeResult =
  | { readonly ok: true; readonly caseId: string }
  | { readonly ok: false; readonly error: IntakeFailure };
/** Explicit invocation obtains fresh CSRF and sends at most one POST, without retries. Abort cannot undo writes; defects may reject and must be contained by the RTK boundary. */
export interface IntakeClient {
  submit(command: IntakeCommand, signal: AbortSignal): Promise<IntakeResult>;
}
