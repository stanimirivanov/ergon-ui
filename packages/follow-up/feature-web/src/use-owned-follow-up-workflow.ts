import type {
  HumanFollowUpReleaseCommand,
  ResolverOwnedHumanFollowUpCursor,
} from '@ergon/follow-up-data-access-web';
import {
  normalizeHumanFollowUpReleaseFailure,
  useReleaseHumanFollowUpMutation,
  useResolverOwnedHumanFollowUpsQuery,
} from '@ergon/follow-up-data-access-web';
import type { ResolverOwnedHumanFollowUpWork } from '@ergon/follow-up-model';
import { useEffect, useRef, useState } from 'react';

import type { ReleaseNotice } from './resolver-owned-human-follow-ups-view';

interface OwnedSelection {
  readonly claimId: string;
  readonly workItemId: string;
  readonly caseId: string;
  readonly runId: string;
  readonly ownershipRevision: number;
}

type Workflow =
  | {
      readonly kind: 'list';
      readonly returnFocusToWorkItemId: string | null;
      readonly consoleReleaseFocusId: string | null;
    }
  | { readonly kind: 'console'; readonly selection: OwnedSelection }
  | { readonly kind: 'recheck'; readonly selection: OwnedSelection }
  | {
      readonly kind: 'release';
      readonly command: HumanFollowUpReleaseCommand;
      readonly consoleReleaseFocusId: string | null;
    };

interface PagePosition {
  readonly cursor?: ResolverOwnedHumanFollowUpCursor;
  readonly history: readonly (ResolverOwnedHumanFollowUpCursor | null)[];
}

const INITIAL_WORKFLOW: Workflow = {
  kind: 'list',
  returnFocusToWorkItemId: null,
  consoleReleaseFocusId: null,
};

export interface OwnedFollowUpWorkflow {
  readonly ownedWork: ReturnType<typeof useResolverOwnedHumanFollowUpsQuery>;
  readonly currentSelection: ResolverOwnedHumanFollowUpWork | undefined;
  readonly releaseNotice: ReleaseNotice | undefined;
  readonly position: PagePosition;
  readonly isConsoleOpen: boolean;
  readonly isClaimRechecking: boolean;
  readonly isReleasePending: boolean;
  readonly pendingClaimId: string | undefined;
  readonly returnFocusToWorkItemId: string | null;
  readonly consoleReleaseFocusId: string | null;
  readonly close: () => void;
  readonly open: (item: ResolverOwnedHumanFollowUpWork) => void;
  readonly recheck: () => void;
  readonly release: (item: ResolverOwnedHumanFollowUpWork) => void;
  readonly releaseFromConsole: (item: ResolverOwnedHumanFollowUpWork) => void;
  readonly retryRelease: (command: HumanFollowUpReleaseCommand) => void;
  readonly resetPages: () => void;
  readonly previousPage: () => void;
  readonly nextPage: () => void;
}

/**
 * Single owner of private selection, committed withdrawal, replay, and return
 * focus intent for a mounted tenant's owned-work surface. Remote rows are never
 * copied: the exact selected claim is derived from the current cache response.
 */
export function useOwnedFollowUpWorkflow(
  tenantId: string,
): OwnedFollowUpWorkflow {
  const [workflow, setWorkflow] = useState<Workflow>(INITIAL_WORKFLOW);
  const [position, setPosition] = useState<PagePosition>({ history: [] });
  const [notice, setNotice] = useState<ReleaseNotice>();
  const [releaseHumanFollowUp, releaseRequest] =
    useReleaseHumanFollowUpMutation();
  const ownedWork = useResolverOwnedHumanFollowUpsQuery({
    tenantId,
    limit: 25,
    ...(position.cursor === undefined ? {} : { cursor: position.cursor }),
  });
  const { refetch: refetchOwned } = ownedWork;
  const selection =
    workflow.kind === 'console' || workflow.kind === 'recheck'
      ? workflow.selection
      : null;
  const currentSelection =
    selection === null
      ? undefined
      : ownedWork.currentData?.items.find((item) =>
          isExactSelectedClaim(item, selection),
        );

  // Each committed phase has one operation; StrictMode re-setup attaches to
  // that same promise rather than replaying a mutation. Callbacks retire with
  // the phase, close, tenant replacement, or unmount.
  const started = useRef<{
    readonly phase: Workflow;
    readonly operation: Promise<
      | { readonly kind: 'rechecked' }
      | {
          readonly kind: 'released';
          readonly result: Awaited<ReturnType<typeof releaseHumanFollowUp>>;
        }
    >;
  }>(undefined);
  useEffect(() => {
    let active = true;
    if (workflow.kind !== 'recheck' && workflow.kind !== 'release') return;
    const phase = workflow;
    if (started.current?.phase !== phase) {
      const operation =
        phase.kind === 'recheck'
          ? Promise.resolve(refetchOwned()).then(() => ({
              kind: 'rechecked' as const,
            }))
          : Promise.resolve(releaseHumanFollowUp(phase.command)).then(
              (result) => ({ kind: 'released' as const, result }),
            );
      started.current = { phase, operation };
    }
    void started.current.operation.then((outcome) => {
      if (!active) return;
      if (outcome.kind === 'released' && phase.kind === 'release') {
        const result = outcome.result;
        // Resource truth remains in RTK. This is a historical command receipt
        // or exact uncertain replay intent, not a second ownership cache.
        if (result.data !== undefined) {
          setNotice({
            kind: 'success',
            claimId: phase.command.claimId,
            workItemId: phase.command.workItemId,
            ownershipRevision: result.data.ownershipRevision,
          });
          setPosition({ history: [] });
        } else {
          setNotice({
            kind: 'failure',
            command: phase.command,
            failure: normalizeHumanFollowUpReleaseFailure(result.error),
          });
        }
      }
      setWorkflow((current) =>
        current !== phase
          ? current
          : phase.kind === 'recheck'
            ? { kind: 'console', selection: phase.selection }
            : {
                kind: 'list',
                returnFocusToWorkItemId: null,
                consoleReleaseFocusId: phase.consoleReleaseFocusId,
              },
      );
    });
    return () => {
      active = false;
    };
  }, [workflow, refetchOwned, releaseHumanFollowUp]);

  useEffect(() => {
    if (
      workflow.kind === 'console' &&
      !ownedWork.isFetching &&
      !ownedWork.isError &&
      currentSelection === undefined
    ) {
      setWorkflow({
        kind: 'list',
        returnFocusToWorkItemId: workflow.selection.workItemId,
        consoleReleaseFocusId: null,
      });
    }
  }, [workflow, ownedWork.isFetching, ownedWork.isError, currentSelection]);

  const releaseWasSuperseded =
    notice?.kind === 'success' &&
    ownedWork.currentData?.items.some(
      (item) =>
        item.workItem.workItemId === notice.workItemId &&
        item.workItem.ownershipRevision > notice.ownershipRevision,
    ) === true;
  const releaseNotice = releaseWasSuperseded ? undefined : notice;
  useEffect(() => {
    // New server truth hides the receipt immediately. Retire that historical
    // feedback permanently as well, so moving to a page without the newer claim
    // cannot resurrect it. No remote row or ownership snapshot is retained.
    if (releaseWasSuperseded) {
      setNotice((current) => (current === notice ? undefined : current));
    }
  }, [notice, releaseWasSuperseded]);

  function close(): void {
    setWorkflow({
      kind: 'list',
      returnFocusToWorkItemId: selection?.workItemId ?? null,
      consoleReleaseFocusId: null,
    });
  }
  function open(item: ResolverOwnedHumanFollowUpWork): void {
    setWorkflow({ kind: 'console', selection: selectClaim(item) });
  }
  function submitRelease(
    command: HumanFollowUpReleaseCommand,
    consoleReleaseFocusId: string | null = null,
  ): void {
    setNotice(undefined);
    setWorkflow({ kind: 'release', command, consoleReleaseFocusId });
  }

  return {
    ownedWork,
    currentSelection,
    releaseNotice,
    position,
    isConsoleOpen: selection !== null,
    isClaimRechecking: workflow.kind === 'recheck',
    isReleasePending: workflow.kind === 'release' || releaseRequest.isLoading,
    pendingClaimId:
      workflow.kind === 'release'
        ? workflow.command.claimId
        : releaseRequest.isLoading
          ? releaseRequest.originalArgs?.claimId
          : undefined,
    returnFocusToWorkItemId:
      workflow.kind === 'list' ? workflow.returnFocusToWorkItemId : null,
    consoleReleaseFocusId:
      workflow.kind === 'list' || workflow.kind === 'release'
        ? workflow.consoleReleaseFocusId
        : null,
    close,
    open,
    recheck: () => {
      if (selection !== null) setWorkflow({ kind: 'recheck', selection });
    },
    release: (item: ResolverOwnedHumanFollowUpWork) =>
      submitRelease(releaseCommand(tenantId, item)),
    releaseFromConsole: (item: ResolverOwnedHumanFollowUpWork) =>
      submitRelease(releaseCommand(tenantId, item), item.workItem.workItemId),
    retryRelease: (command: HumanFollowUpReleaseCommand) =>
      submitRelease(
        command,
        workflow.kind === 'list' ? workflow.consoleReleaseFocusId : null,
      ),
    resetPages: () => setPosition({ history: [] }),
    previousPage: () =>
      setPosition((current) => {
        const previous = current.history[current.history.length - 1];
        const history = current.history.slice(0, -1);
        return previous === null || previous === undefined
          ? { history }
          : { cursor: previous, history };
      }),
    nextPage: () => {
      const nextCursor = ownedWork.currentData?.nextCursor;
      if (nextCursor !== null && nextCursor !== undefined)
        setPosition((current) => ({
          cursor: nextCursor,
          history: [...current.history, current.cursor ?? null],
        }));
    },
  };
}

function selectClaim(item: ResolverOwnedHumanFollowUpWork): OwnedSelection {
  return {
    claimId: item.claim.claimId,
    workItemId: item.workItem.workItemId,
    caseId: item.workItem.caseId,
    runId: item.workItem.runId,
    ownershipRevision: item.workItem.ownershipRevision,
  };
}

function isExactSelectedClaim(
  item: ResolverOwnedHumanFollowUpWork,
  selected: OwnedSelection,
): boolean {
  return (
    item.claim.claimId === selected.claimId &&
    item.workItem.workItemId === selected.workItemId &&
    item.workItem.caseId === selected.caseId &&
    item.workItem.runId === selected.runId &&
    item.workItem.ownershipRevision === selected.ownershipRevision
  );
}

function releaseCommand(
  tenantId: string,
  item: ResolverOwnedHumanFollowUpWork,
): HumanFollowUpReleaseCommand {
  return {
    tenantId,
    workItemId: item.workItem.workItemId,
    claimId: item.claim.claimId,
    expectedOwnershipRevision: item.workItem.ownershipRevision,
  };
}
