import type { HumanFollowUpClient } from '../follow-up/human-follow-up-client';
import type { CurrentActorClient } from '../session/current-actor-client';

export interface WorkbenchDependencies {
  readonly currentActorClient: CurrentActorClient;
  readonly humanFollowUpClient: HumanFollowUpClient;
}
