import type {
  ClaimHumanFollowUp,
  GetOwnedFollowUpCaseSummary,
  ListOpenHumanFollowUps,
  ListOwnedHumanFollowUps,
} from '@ergon/application-follow-up';
import type { ResolveCurrentActor } from '@ergon/application-session';

/**
 * Capability-level dependencies supplied once by the workbench composition
 * root and consumed through RTK Query's thunk extra argument.
 *
 * Separate ports keep consumers scoped to one use case even when one concrete
 * infrastructure adapter implements several of them.
 */
export interface WorkbenchDependencies {
  readonly resolveCurrentActor: ResolveCurrentActor;
  readonly listOpenHumanFollowUps: ListOpenHumanFollowUps;
  readonly listOwnedHumanFollowUps: ListOwnedHumanFollowUps;
  readonly getOwnedFollowUpCaseSummary: GetOwnedFollowUpCaseSummary;
  readonly claimHumanFollowUp: ClaimHumanFollowUp;
}
