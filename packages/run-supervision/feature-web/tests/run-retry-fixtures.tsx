import { configureStore } from '@reduxjs/toolkit';
import {
  runSupervisionApi,
  type AssignedRunConsole,
  type RunRetryClient,
  type RunRetryCommand,
  type RunRetryCommandResult,
  type RunRetryReview,
  type RunSupervisionClient,
} from '@ergon/run-supervision-data-access-web';
import { cleanup, render, type RenderResult } from '@testing-library/react';
import { StrictMode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, vi } from 'vitest';
import { AssignedRunWorkspace } from '../src';
import {
  assignedPage,
  assignedRunConsole,
  RUN_ID,
  SECOND_RUN_ID,
  TENANT_ID,
} from './assigned-run-fixtures';

export const retryReview = {
  supported: true,
  observedAt: '2026-10-17T08:00:00Z',
  supervisionRevision: 7,
  runVersion: 1,
  attemptNumber: 1,
  retryPolicyRevision: 'ergon.dev/policy/resolution-retry/v1',
  maximumAttempts: 2,
  canRetry: true,
  reason: null,
  plan: {
    caseStreamVersion: 4,
    contractKey: assignedRunConsole.contractKey,
    contractRevision: assignedRunConsole.contractRevision,
    policyRevision: 'CURRENT_RETRY_POLICY',
    stepId: assignedRunConsole.stepId,
    capability: assignedRunConsole.capability,
    effectiveRisk: 'HIGH',
    requiredApproval: 'RESOLVER',
  },
} satisfies RunRetryReview;
export const failedConsole: AssignedRunConsole = {
  ...assignedRunConsole,
  state: 'ACTION_FAILED',
  stateVersion: 1,
  supervisionRevision: 7,
  handoverSupported: false,
  policyRevision: 'PRIVATE_FAILED_POLICY',
};

export function successfulRetryClient(): RunSupervisionClient & RunRetryClient {
  let hasSuccessor = false;
  return {
    listAssigned: async () => ({
      ok: true,
      page: assignedPage(hasSuccessor ? SECOND_RUN_ID : RUN_ID),
    }),
    getConsole: async (query) => ({
      ok: true,
      console:
        query.runId === RUN_ID
          ? failedConsole
          : {
              ...assignedRunConsole,
              runId: SECOND_RUN_ID,
              predecessorRunId: RUN_ID,
              attemptNumber: 2,
              supervisionRevision: 0,
              handoverSupported: false,
              caseEvidenceStreamVersion: 4,
              policyRevision: 'CURRENT_RETRY_POLICY',
              effectiveRisk: 'HIGH',
              execution: null,
              approvalReview: {
                status: 'NOT_REQUESTED',
                observedAt: retryReview.observedAt,
                canDecide: false,
                request: null,
                decision: null,
              },
            },
    }),
    getRetryReview: async () => ({ ok: true, review: retryReview }),
    retryRun: async (command) => {
      hasSuccessor = true;
      return retryResult(command);
    },
  };
}
export function retryResult(command: RunRetryCommand): RunRetryCommandResult {
  return {
    ok: true,
    receipt: {
      commandId: command.commandId,
      runId: command.runId,
      successorRunId: SECOND_RUN_ID,
      supervisionRevision: command.expectedSupervisionRevision,
      expectedRunVersion: 1,
      caseStreamVersion: command.plan.caseStreamVersion,
      retryPolicyRevision: command.retryPolicyRevision,
      sourceAttemptNumber: command.expectedAttemptNumber,
      maximumAttempts: command.maximumAttempts,
      startedAt: '2026-10-17T08:01:00Z',
      recordedAt: '2026-10-17T08:01:00.123456Z',
    },
  };
}
const stores: ReturnType<typeof buildStore>[] = [];

/** Lifecycle double only; native modality, containment and narrow geometry are exercised by Chromium. */
export function installRetryTestEnvironment(): void {
  const originals = new Map(
    ['showModal', 'close'].map((name) => [
      name,
      Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name),
    ]),
  );
  beforeEach(() => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = true;
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = false;
      },
    });
  });
  afterEach(() => {
    cleanup();
    for (const store of stores)
      store.dispatch(runSupervisionApi.util.resetApiState());
    stores.length = 0;
    for (const [name, original] of originals) {
      if (original === undefined)
        Reflect.deleteProperty(HTMLDialogElement.prototype, name);
      else Object.defineProperty(HTMLDialogElement.prototype, name, original);
    }
    vi.restoreAllMocks();
  });
}
function buildStore(client: RunSupervisionClient & RunRetryClient) {
  return configureStore({
    reducer: { [runSupervisionApi.reducerPath]: runSupervisionApi.reducer },
    middleware: (get) =>
      get({ thunk: { extraArgument: { runSupervision: client } } }).concat(
        runSupervisionApi.middleware,
      ),
  });
}
export function renderRetryWorkspace<
  Client extends RunSupervisionClient & RunRetryClient,
>(client: Client): RenderResult {
  const store = buildStore(client);
  stores.push(store);
  return render(
    <StrictMode>
      <Provider store={store}>
        <AssignedRunWorkspace
          tenantId={TENANT_ID}
          signInHref="/bff/login"
          renderWorkspace={({ toolbar, content, statusLabel }) => (
            <>
              <header>
                <p>{statusLabel}</p>
                {toolbar}
              </header>
              <main>{content}</main>
            </>
          )}
        />
      </Provider>
    </StrictMode>,
  );
}
export function deferred<A>() {
  let resolve: (value: A) => void = () => undefined;
  const promise = new Promise<A>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
