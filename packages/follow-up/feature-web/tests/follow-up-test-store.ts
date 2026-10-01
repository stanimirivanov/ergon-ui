import { configureStore } from '@reduxjs/toolkit';
import type {
  ClaimHumanFollowUp,
  GetOwnedFollowUpCaseSummary,
  ListOpenHumanFollowUps,
  ListOwnedHumanFollowUps,
} from '@ergon/follow-up-data-access-web';
import {
  type HumanFollowUpCacheDependencies,
  humanFollowUpApi,
} from '@ergon/follow-up-data-access-web';

/**
 * Capability implementations enabled for one follow-up component test.
 *
 * Omitted capabilities fail immediately when exercised. This keeps each test's
 * acquired operations visible without recreating the broad client surface that the
 * production application deliberately segregates.
 */
export interface FollowUpTestCapabilities {
  readonly listOpen?: ListOpenHumanFollowUps['listOpen'];
  readonly listOwned?: ListOwnedHumanFollowUps['listOwned'];
  readonly getOwnedCaseSummary?: GetOwnedFollowUpCaseSummary['getOwnedCaseSummary'];
  readonly claim?: ClaimHumanFollowUp['claim'];
}

type FollowUpTestStore = ReturnType<typeof configureFollowUpStore>;

/** Creates an isolated follow-up cache whose undeclared operations fail fast. */
export function createFollowUpTestStore(
  capabilities: FollowUpTestCapabilities,
): FollowUpTestStore {
  const dependencies: HumanFollowUpCacheDependencies = {
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
  };

  return configureFollowUpStore(dependencies);
}

function configureFollowUpStore(dependencies: HumanFollowUpCacheDependencies) {
  return configureStore({
    reducer: {
      [humanFollowUpApi.reducerPath]: humanFollowUpApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: dependencies },
      }).concat(humanFollowUpApi.middleware),
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
