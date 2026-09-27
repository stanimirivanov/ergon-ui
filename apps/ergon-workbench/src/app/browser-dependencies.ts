import { createHumanFollowUpBffAdapter } from '@ergon/infrastructure-follow-up-web';
import { createCurrentActorBffAdapter } from '@ergon/infrastructure-session-web';

import type { WorkbenchDependencies } from './workbench-dependencies';

const humanFollowUpAdapter = createHumanFollowUpBffAdapter({
  fetch: globalThis.fetch,
});

/**
 * Production browser dependency graph for the resolver workbench.
 *
 * All follow-up ports deliberately share one adapter instance so its ephemeral
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
};
