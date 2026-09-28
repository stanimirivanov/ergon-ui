import type {
  ClaimHumanFollowUp,
  GetOwnedFollowUpCaseSummary,
  ListOpenHumanFollowUps,
  ListOwnedHumanFollowUps,
} from '@ergon/application-follow-up';
import type { ResolveCurrentActor } from '@ergon/application-session';

import { createWorkbenchStore } from '../app/store';

/**
 * Capability implementations enabled for one workbench component test.
 *
 * Omitted capabilities fail immediately when exercised. This keeps each test's
 * acquired ports visible without recreating the broad adapter surface that the
 * production application deliberately segregates.
 */
export interface FollowUpTestCapabilities {
  readonly listOpen?: ListOpenHumanFollowUps['listOpen'];
  readonly listOwned?: ListOwnedHumanFollowUps['listOwned'];
  readonly getOwnedCaseSummary?: GetOwnedFollowUpCaseSummary['getOwnedCaseSummary'];
  readonly claim?: ClaimHumanFollowUp['claim'];
}

/** Creates an isolated store whose undeclared capabilities fail fast. */
export function createFollowUpTestStore(
  capabilities: FollowUpTestCapabilities,
): ReturnType<typeof createWorkbenchStore> {
  return createWorkbenchStore({
    resolveCurrentActor: unusedCurrentActorResolver,
    listOpenHumanFollowUps: {
      listOpen: capabilities.listOpen ?? unusedListOpen,
    },
    listOwnedHumanFollowUps: {
      listOwned: capabilities.listOwned ?? unusedListOwned,
    },
    getOwnedFollowUpCaseSummary: {
      getOwnedCaseSummary:
        capabilities.getOwnedCaseSummary ?? unusedGetOwnedCaseSummary,
    },
    claimHumanFollowUp: {
      claim: capabilities.claim ?? unusedClaim,
    },
  });
}

const unusedListOpen: ListOpenHumanFollowUps['listOpen'] = async () => {
  throw new Error('Shared inbox was not configured for this test');
};

const unusedListOwned: ListOwnedHumanFollowUps['listOwned'] = async () => {
  throw new Error('Owned work was not configured for this test');
};

const unusedGetOwnedCaseSummary: GetOwnedFollowUpCaseSummary['getOwnedCaseSummary'] =
  async () => {
    throw new Error('Case context was not configured for this test');
  };

const unusedClaim: ClaimHumanFollowUp['claim'] = async () => {
  throw new Error('Claiming was not configured for this test');
};

const unusedCurrentActorResolver: ResolveCurrentActor = {
  async resolve() {
    throw new Error(
      'Current actor resolution was not configured for this test',
    );
  },
};
