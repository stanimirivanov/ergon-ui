import {
  createCurrentActorClient,
  type AccessTokenProvider,
} from '../session/current-actor-client';
import type { WorkbenchDependencies } from '../session/current-actor-api';

const unavailableAccessTokenProvider: AccessTokenProvider = {
  async getAccessToken() {
    // Token acquisition requires a reviewed OIDC-or-BFF decision. Until then,
    // the browser must fail closed rather than accepting an ambient credential.
    return null;
  },
};

export const browserDependencies: WorkbenchDependencies = {
  currentActorClient: createCurrentActorClient({
    accessTokenProvider: unavailableAccessTokenProvider,
    fetch: globalThis.fetch,
  }),
};
