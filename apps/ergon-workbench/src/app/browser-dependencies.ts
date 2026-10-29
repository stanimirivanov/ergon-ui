import {
  createHumanFollowUpBffAdapter,
  createFollowUpQuestionsReader,
} from '@ergon/follow-up-data-access-web';
import { createCurrentActorBffAdapter } from '@ergon/session-data-access-web';
import { createRunSupervisionClient } from '@ergon/run-supervision-data-access-web';

import type { WorkbenchDependencies } from './workbench-dependencies';
import { createWorkbenchStore, retireWorkbenchStore } from './store';

/**
 * One mounted private workbench graph. All clients share the supplied session
 * transport; follow-up mutations share CSRF only until disposal. Dispose after
 * subscribers leave: no reset may restart private reads during sign-out.
 */
export function createBrowserWorkbenchScope(fetch: typeof globalThis.fetch): {
  readonly store: ReturnType<typeof createWorkbenchStore>;
  readonly dispose: () => void;
} {
  const humanFollowUpAdapter = createHumanFollowUpBffAdapter({ fetch });
  const dependencies: WorkbenchDependencies = {
    recordFollowUpQuestion: humanFollowUpAdapter.recordQuestion,
    listFollowUpQuestions: createFollowUpQuestionsReader({
      fetch,
    }),
    runSupervision: createRunSupervisionClient({ fetch }),
    resolveCurrentActor: createCurrentActorBffAdapter({
      fetch,
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
  const store = createWorkbenchStore(dependencies);
  let disposed = false;
  return {
    store,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      humanFollowUpAdapter.retire();
      retireWorkbenchStore(store);
    },
  };
}
