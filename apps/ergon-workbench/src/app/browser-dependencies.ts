import { createCurrentActorClient } from '../session/current-actor-client';
import type { WorkbenchDependencies } from '../session/current-actor-api';

export const browserDependencies: WorkbenchDependencies = {
  currentActorClient: createCurrentActorClient({
    fetch: globalThis.fetch,
  }),
};
