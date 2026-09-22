import { createHumanFollowUpClient } from '../follow-up/human-follow-up-client';
import { createCurrentActorClient } from '../session/current-actor-client';
import type { WorkbenchDependencies } from './workbench-dependencies';

export const browserDependencies: WorkbenchDependencies = {
  currentActorClient: createCurrentActorClient({
    fetch: globalThis.fetch,
  }),
  humanFollowUpClient: createHumanFollowUpClient({
    fetch: globalThis.fetch,
  }),
};
