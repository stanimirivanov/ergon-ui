import type {
  ClaimHumanFollowUp,
  GetOwnedFollowUpCaseSummary,
  ListOpenHumanFollowUps,
  ListOwnedHumanFollowUps,
} from '@ergon/follow-up-application';

import type { CurrentActorClient } from '../session/current-actor-client';

export interface WorkbenchDependencies {
  readonly currentActorClient: CurrentActorClient;
  readonly listOpenHumanFollowUps: ListOpenHumanFollowUps;
  readonly listOwnedHumanFollowUps: ListOwnedHumanFollowUps;
  readonly getOwnedFollowUpCaseSummary: GetOwnedFollowUpCaseSummary;
  readonly claimHumanFollowUp: ClaimHumanFollowUp;
}
