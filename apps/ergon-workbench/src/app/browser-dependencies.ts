import { createHumanFollowUpBffAdapter } from '@ergon/follow-up-data-access-web';
import { createCurrentActorBffAdapter } from '@ergon/session-data-access-web';

import type { WorkbenchDependencies } from './workbench-dependencies';

const humanFollowUpAdapter = createHumanFollowUpBffAdapter({
  fetch: globalThis.fetch,
});

/**
 * Production browser dependency graph for the resolver workbench.
 *
 * All follow-up operations deliberately share one client instance so its ephemeral
 * CSRF state has the same lifetime as the workbench store.
 */
export const browserDependencies: WorkbenchDependencies = {
  resolveCurrentActor: createCurrentActorBffAdapter({
    fetch: globalThis.fetch,
  }),
  listOpenHumanFollowUps: humanFollowUpAdapter,
  listOwnedHumanFollowUps: humanFollowUpAdapter,
  getOwnedFollowUpCaseSummary: humanFollowUpAdapter,
  claimHumanFollowUp: humanFollowUpAdapter,
  releaseHumanFollowUp: humanFollowUpAdapter,
};
