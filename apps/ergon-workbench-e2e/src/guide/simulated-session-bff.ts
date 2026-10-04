import type { Page } from '@playwright/test';

import { fulfillSimulatedBff } from './simulated-bff-response';

export type SimulatedSessionState =
  | 'authentication-required'
  | 'actor-not-registered'
  | 'authentication-unavailable'
  | 'identity-rejected'
  | 'temporary-failure'
  | 'verified';

const problems: Record<
  Exclude<SimulatedSessionState, 'verified'>,
  {
    status: number;
    type: string;
    title: string;
    detail: string;
    signInPath?: string;
  }
> = {
  'authentication-required': {
    status: 401,
    type: 'urn:ergon:problem:browser-authentication-required',
    title: 'Browser authentication required',
    detail: 'An authenticated browser session is required',
    signInPath: '/bff/login',
  },
  'actor-not-registered': {
    status: 403,
    type: 'urn:ergon:problem:human-actor-not-registered',
    title: 'Human actor not registered',
    detail: 'The actor is not registered in this tenant',
  },
  'authentication-unavailable': {
    status: 503,
    type: 'urn:ergon:problem:browser-authentication-unavailable',
    title: 'Browser authentication unavailable',
    detail: 'Browser authentication is not configured',
  },
  'identity-rejected': {
    status: 403,
    type: 'urn:ergon:problem:untrusted-human-identity-issuer',
    title: 'Untrusted human identity issuer',
    detail: 'The authenticated identity issuer is not trusted',
  },
  'temporary-failure': {
    status: 503,
    type: 'urn:ergon:problem:temporary-failure',
    title: 'Temporary failure',
    detail: 'Session verification is temporarily unavailable',
  },
};

/** Switches between mutually exclusive synthetic session states for illustration. */
export async function installSimulatedSessionBff(page: Page): Promise<{
  show: (state: SimulatedSessionState) => void;
  workReadCount: () => number;
}> {
  let state: SimulatedSessionState = 'authentication-required';
  let workReads = 0;

  await page.route('**/bff/v1/tenants/*/session', async (route) => {
    if (state === 'verified') {
      await fulfillSimulatedBff(route, {
        actorId: '741bcdba-9521-4e96-bfcc-7a5a2830eec8',
        identityProvider: 'workforce-sso',
        registeredAt: '2026-09-20T12:34:56Z',
        recordedAt: '2026-09-20T12:34:57Z',
      });
      return;
    }
    const problem = problems[state];
    await fulfillSimulatedBff(route, problem, problem.status);
  });
  await page.route('**/bff/v1/tenants/*/human-follow-ups?*', (route) => {
    workReads += 1;
    return fulfillSimulatedBff(route, { items: [], nextCursor: null });
  });
  await page.route('**/bff/v1/tenants/*/human-follow-ups/owned?*', (route) => {
    workReads += 1;
    return fulfillSimulatedBff(route, { items: [], nextCursor: null });
  });

  return {
    show: (nextState) => {
      state = nextState;
    },
    workReadCount: () => workReads,
  };
}
