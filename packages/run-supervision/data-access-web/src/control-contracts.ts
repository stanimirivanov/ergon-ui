import type {
  AssignedRunConsoleQuery,
  RunSupervisionFailure,
} from './contracts';

/** Non-secret server fence: positive browser-exact revision below MAX_SAFE_INTEGER. Possession alone grants no authority. */
export interface RunControlFence {
  readonly leaseId: string;
  readonly revision: number;
}

/** Capture once with confirmed intent; omission denotes an explicitly disabled rollout or legacy history. */
export interface FencedRunCommand {
  readonly control?: RunControlFence;
}

export interface RunControlQuery extends AssignedRunConsoleQuery {
  /** Used locally to reject a status for a different supervision epoch; not sent as authority. */
  readonly expectedSupervisionRevision: number;
}

interface ControlObservation {
  readonly supervisionRevision: number;
  readonly observedAt: string;
}

/** Only THIS_SESSION discloses a usable fence. Every observation is advisory, never authorization. */
export type RunControlView = ControlObservation &
  (
    | { readonly status: 'DISABLED' | 'AVAILABLE' | 'EXPIRED' | 'TERMINAL' }
    | { readonly status: 'ANOTHER_SESSION'; readonly expiresAt: string }
    | {
        readonly status: 'THIS_SESSION';
        readonly fence: RunControlFence;
        readonly expiresAt: string;
      }
  );

/** RTK-owned arrival metadata on this page's monotonic clock, never server input or persisted browser state. */
export type RunControlObservation = RunControlView & {
  readonly receivedAtMonotonic: number;
};

/** Exact local lifecycle intent. Renewal/release retain the acquisition fence; retries never replace the UUID. */
export type RunControlCommand = RunControlQuery & {
  readonly commandId: string;
} & (
    | { readonly action: 'ACQUIRE' }
    | {
        readonly action: 'RENEW' | 'RELEASE';
        readonly control: RunControlFence;
      }
  );

/** Historical acknowledgement, not current ownership or an extended expiry. Observe status again afterward. */
export interface RunControlReceipt {
  readonly commandId: string;
  readonly runId: string;
  readonly action: 'ACQUIRE' | 'RENEW' | 'RELEASE';
  readonly supervisionRevision: number;
  readonly control: RunControlFence;
  readonly changedAt: string;
  readonly expiresAt: string;
  readonly recordedAt: string;
}

export type RunControlResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: RunSupervisionFailure };

/** Bounded same-origin operations. Reads retry once; CSRF plus mutation has one deadline and never retries automatically. Abort cannot undo a commit. */
export interface RunControlClient {
  getRunControl(
    query: RunControlQuery,
    signal: AbortSignal,
  ): Promise<RunControlResult<RunControlView>>;
  changeRunControl(
    command: RunControlCommand,
    signal: AbortSignal,
  ): Promise<RunControlResult<RunControlReceipt>>;
}
