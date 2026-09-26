import { createHumanFollowUpBffAdapter } from '@ergon/infrastructure-follow-up-web';

import { createCurrentActorClient } from '../session/current-actor-client';
import type { WorkbenchDependencies } from './workbench-dependencies';

const humanFollowUpAdapter = createHumanFollowUpBffAdapter({
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
