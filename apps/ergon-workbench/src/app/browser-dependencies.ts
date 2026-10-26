import {
  createHumanFollowUpBffAdapter,
  createFollowUpQuestionsReader,
} from '@ergon/follow-up-data-access-web';
import { createCurrentActorBffAdapter } from '@ergon/session-data-access-web';
import { createRunSupervisionClient } from '@ergon/run-supervision-data-access-web';

import type { WorkbenchDependencies } from './workbench-dependencies';

const humanFollowUpAdapter = createHumanFollowUpBffAdapter({
  fetch: globalThis.fetch,
});

/**
 * Production browser dependency graph for the resolver workbench.
 *
 * All follow-up mutations deliberately share one client instance so its ephemeral
 * CSRF state has the same lifetime as the workbench store.
 */
export const browserDependencies: WorkbenchDependencies = {
  recordFollowUpQuestion: humanFollowUpAdapter.recordQuestion,
  listFollowUpQuestions: createFollowUpQuestionsReader({
    fetch: globalThis.fetch,
  }),
  runSupervision: createRunSupervisionClient({ fetch: globalThis.fetch }),
  resolveCurrentActor: createCurrentActorBffAdapter({
    fetch: globalThis.fetch,
  }),
  listOpenHumanFollowUps: humanFollowUpAdapter,
  listOwnedHumanFollowUps: humanFollowUpAdapter,
  getOwnedFollowUpCaseSummary: humanFollowUpAdapter,
  claimHumanFollowUp: humanFollowUpAdapter,
  releaseHumanFollowUp: humanFollowUpAdapter,
  followUpNotes: humanFollowUpAdapter,
  followUpHandover: humanFollowUpAdapter,
  followUpCompletion: humanFollowUpAdapter,
  followUpPriority: humanFollowUpAdapter,
};
