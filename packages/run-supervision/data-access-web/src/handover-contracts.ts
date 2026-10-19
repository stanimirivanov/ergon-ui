import type { FencedRunCommand } from './control-contracts';
import type {
  AssignedRunConsoleQuery,
  RunSupervisionFailure,
} from './contracts';

/** Private, best-effort candidate traversal tied to one current supervision epoch. */
export interface RunSupervisorCandidateQuery extends AssignedRunConsoleQuery {
  readonly expectedSupervisionRevision: number;
  readonly limit?: number;
  readonly afterActorId?: string;
}

/** Minimal registered tenant resolver identities, not provider subjects or authority promises. */
export interface RunSupervisorCandidatePage {
  readonly entries: readonly { readonly actorId: string }[];
  readonly nextActorId: string | null;
  readonly supervisionRevision: number;
}

/**
 * Immutable confirmed user intent. Keep this complete tuple for an uncertain-result
 * replay; never mint a new command ID or silently change the recipient/revision.
 * The server resolves the outgoing actor and rechecks both parties' authority.
 */
export interface RunSupervisorHandoverCommand
  extends AssignedRunConsoleQuery, FencedRunCommand {
  readonly commandId: string;
  readonly expectedSupervisionRevision: number;
  readonly supervisorActorId: string;
}

/** Historical transfer acknowledgement, not current supervision after later handovers. */
export interface RunSupervisorHandoverReceipt {
  readonly commandId: string;
  readonly runId: string;
  readonly supervisionRevision: number;
  readonly handedOverAt: string;
  readonly recordedAt: string;
}

export type RunSupervisorHandoverFailure =
  | RunSupervisionFailure
  | {
      readonly kind:
        | 'handover-disabled'
        | 'handover-conflict'
        | 'handover-unavailable'
        | 'recipient-not-eligible'
        | 'invalid-handover'
        | 'csrf-rejected';
    };

export type RunSupervisorCandidateResult =
  | { readonly ok: true; readonly page: RunSupervisorCandidatePage }
  | { readonly ok: false; readonly error: RunSupervisorHandoverFailure };

export type RunSupervisorHandoverResult =
  | { readonly ok: true; readonly receipt: RunSupervisorHandoverReceipt }
  | { readonly ok: false; readonly error: RunSupervisorHandoverFailure };

/**
 * Session-bound supervision operations, not an execution-control client.
 * Candidate reads retry one classified transient failure; transfers never retry
 * automatically. Cancellation/timeout after POST may leave a committed transfer.
 * Expected failures are values; unexpected defects reject for cache containment.
 */
export interface RunSupervisorHandoverClient {
  readonly listHandoverCandidates: (
    query: RunSupervisorCandidateQuery,
    signal: AbortSignal,
  ) => Promise<RunSupervisorCandidateResult>;
  readonly handoverSupervisor: (
    command: RunSupervisorHandoverCommand,
    signal: AbortSignal,
  ) => Promise<RunSupervisorHandoverResult>;
}
