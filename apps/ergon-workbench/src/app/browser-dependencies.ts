import { createHumanFollowUpClient } from '../follow-up/human-follow-up-client';
import { createCurrentActorClient } from '../session/current-actor-client';
import type { WorkbenchDependencies } from './workbench-dependencies';

const humanFollowUpAdapter = createHumanFollowUpClient({
  fetch: globalThis.fetch,
});

export const browserDependencies: WorkbenchDependencies = {
  currentActorClient: createCurrentActorClient({
    fetch: globalThis.fetch,
  }),
  listOpenHumanFollowUps: humanFollowUpAdapter,
  listOwnedHumanFollowUps: humanFollowUpAdapter,
  getOwnedFollowUpCaseSummary: humanFollowUpAdapter,
  claimHumanFollowUp: humanFollowUpAdapter,
};
