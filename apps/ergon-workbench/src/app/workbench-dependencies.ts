import type {
  ClaimHumanFollowUp,
  GetOwnedFollowUpCaseSummary,
  ListOpenHumanFollowUps,
  ListOwnedHumanFollowUps,
} from '@ergon/application-follow-up';
import type { CurrentActorCacheDependencies } from '@ergon/infrastructure-session-web';

/**
 * Capability-level dependencies supplied once by the workbench composition
 * root and consumed through RTK Query's thunk extra argument.
 *
 * Separate ports keep consumers scoped to one use case even when one concrete
 * infrastructure adapter implements several of them.
 */
export interface WorkbenchDependencies extends CurrentActorCacheDependencies {
  readonly listOpenHumanFollowUps: ListOpenHumanFollowUps;
  readonly listOwnedHumanFollowUps: ListOwnedHumanFollowUps;
  readonly getOwnedFollowUpCaseSummary: GetOwnedFollowUpCaseSummary;
  readonly claimHumanFollowUp: ClaimHumanFollowUp;
}
