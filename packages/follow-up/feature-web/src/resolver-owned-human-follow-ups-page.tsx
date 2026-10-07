import type {
  HumanFollowUpReleaseCommand,
  ResolverOwnedHumanFollowUpCursor,
  ResolverOwnedHumanFollowUpQuery,
} from '@ergon/follow-up-data-access-web';
import {
  useReleaseHumanFollowUpMutation,
  useResolverOwnedHumanFollowUpsQuery,
} from '@ergon/follow-up-data-access-web';
import type { ResolverOwnedHumanFollowUpWork } from '@ergon/follow-up-model';
import { Button } from '@ergon/ui-web';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import {
  normalizeFollowUpReadFailure,
  normalizeFollowUpReleaseFailure,
} from './follow-up-failure-normalization';
import { FollowUpMessage } from './follow-up-message';
import { ResolverFollowUpConsole } from './resolver-follow-up-console';
import { ownedWorkFailureCopy } from './resolver-owned-human-follow-ups-copy';
import {
  type ReleaseNotice,
  ResolverOwnedHumanFollowUpsList,
} from './resolver-owned-human-follow-ups-view';

const PAGE_SIZE = 25;

interface PagePosition {
  readonly cursor?: ResolverOwnedHumanFollowUpCursor;
  readonly history: readonly (ResolverOwnedHumanFollowUpCursor | null)[];
}

/** Owns active-work requests and reversible claim-cursor navigation. */
export function ResolverOwnedHumanFollowUpsPage({
  tenantId,
  signInHref,
  selectedWork,
  returnFocusToWorkItemId,
  onMissingReturnFocus,
  onSelectWork,
}: {
  readonly tenantId: string;
  readonly signInHref: string;
  readonly selectedWork: ResolverOwnedHumanFollowUpWork | null;
  readonly returnFocusToWorkItemId: string | null;
  readonly onMissingReturnFocus: () => void;
  readonly onSelectWork: (item: ResolverOwnedHumanFollowUpWork | null) => void;
}) {
  const [position, setPosition] = useState<PagePosition>({ history: [] });
  const [releaseNotice, setReleaseNotice] = useState<ReleaseNotice>();
  const [consoleReleaseFocusId, setConsoleReleaseFocusId] = useState<
    string | null
  >(null);
  const readFailureHeading = useRef<HTMLHeadingElement>(null);
  const [releaseHumanFollowUp, releaseRequest] =
    useReleaseHumanFollowUpMutation();
  const query: ResolverOwnedHumanFollowUpQuery = {
    tenantId,
    limit: PAGE_SIZE,
    ...(position.cursor === undefined ? {} : { cursor: position.cursor }),
  };
  const ownedWork = useResolverOwnedHumanFollowUpsQuery(query);
  const currentSelection =
    selectedWork === null
      ? undefined
      : ownedWork.data?.items.find((item) =>
          isExactSelectedClaim(item, selectedWork),
        );

  useEffect(() => {
    if (selectedWork !== null && ownedWork.isError) {
      readFailureHeading.current?.focus();
    }
  }, [selectedWork, ownedWork.isError]);

  useEffect(() => {
    if (
      selectedWork === null &&
      returnFocusToWorkItemId !== null &&
      ownedWork.isError
    ) {
      onMissingReturnFocus();
    }
  }, [
    selectedWork,
    returnFocusToWorkItemId,
    ownedWork.isError,
    onMissingReturnFocus,
  ]);

  useEffect(() => {
    // A refreshed owned page may withdraw or replace a claim. Unmount its
    // private summary before showing any newly observed work.
    if (
      selectedWork !== null &&
      !ownedWork.isFetching &&
      !ownedWork.isError &&
      (ownedWork.data === undefined || currentSelection === undefined)
    ) {
      onSelectWork(null);
    }
  }, [
    selectedWork,
    ownedWork.isFetching,
    ownedWork.isError,
    ownedWork.data,
    currentSelection,
    onSelectWork,
  ]);

  useEffect(() => {
    // A later claim can return this work to the owned list. Its server revision
    // retires feedback about the earlier release, even across cached pages.
    if (
      releaseNotice?.kind === 'success' &&
      ownedWork.data?.items.some(
        (item) =>
          item.workItem.workItemId === releaseNotice.workItemId &&
          item.workItem.ownershipRevision > releaseNotice.ownershipRevision,
      )
    ) {
      setReleaseNotice(undefined);
    }
  }, [releaseNotice, ownedWork.data]);

  async function release(item: ResolverOwnedHumanFollowUpWork): Promise<void> {
    setConsoleReleaseFocusId(null);
    return submitRelease(releaseCommand(tenantId, item));
  }

  function releaseFromConsole(item: ResolverOwnedHumanFollowUpWork): void {
    // The private summary must leave the DOM before the release POST begins.
    // React normally batches event updates, so force this disclosure boundary.
    const command = releaseCommand(tenantId, item);
    flushSync(() => {
      setConsoleReleaseFocusId(item.workItem.workItemId);
      onSelectWork(null);
    });
    void submitRelease(command);
  }

  async function submitRelease(
    command: HumanFollowUpReleaseCommand,
  ): Promise<void> {
    setReleaseNotice(undefined);
    const result = await releaseHumanFollowUp(command);
    if (result.data !== undefined) {
      setReleaseNotice({
        kind: 'success',
        claimId: command.claimId,
        workItemId: command.workItemId,
        ownershipRevision: result.data.ownershipRevision,
      });
      setPosition({ history: [] });
    } else {
      setReleaseNotice({
        kind: 'failure',
        command,
        failure: normalizeFollowUpReleaseFailure(result.error),
      });
    }
  }

  if (
    ownedWork.isLoading ||
    (ownedWork.isFetching &&
      (ownedWork.data === undefined || selectedWork !== null))
  ) {
    return (
      <FollowUpMessage
        title="Loading your active work…"
        description="The control plane is checking current ownership and resolver authority."
        action={
          selectedWork === null ? undefined : (
            <Button
              type="button"
              variant="quiet"
              onClick={() => onSelectWork(null)}
            >
              Back to active work
            </Button>
          )
        }
        live
      />
    );
  }

  // RTK Query can retain successful data after a failed refetch. A stale
  // owned page cannot authorize the selected private case read.
  if (ownedWork.isError || ownedWork.data === undefined) {
    const failure = normalizeFollowUpReadFailure(ownedWork.error);
    const copy = ownedWorkFailureCopy(failure);
    const action =
      failure.kind === 'authentication-required' ? (
        <Button asChild>
          <a href={signInHref}>Sign in again</a>
        </Button>
      ) : failure.kind === 'invalid-page' ? (
        <Button
          type="button"
          variant="quiet"
          onClick={() => setPosition({ history: [] })}
        >
          Return to first claimed-work page
        </Button>
      ) : copy.canRetry ? (
        <Button
          type="button"
          variant="quiet"
          onClick={() => ownedWork.refetch()}
        >
          Try again
        </Button>
      ) : undefined;
    return (
      <FollowUpMessage
        title={copy.title}
        description={copy.description}
        action={
          selectedWork === null ? (
            action
          ) : (
            <div className="flex flex-wrap gap-3">
              {action}
              <Button
                type="button"
                variant="quiet"
                onClick={() => onSelectWork(null)}
              >
                Back to active work
              </Button>
            </div>
          )
        }
        {...(selectedWork === null ? {} : { headingRef: readFailureHeading })}
      />
    );
  }

  const { items, nextCursor } = ownedWork.data;
  if (selectedWork !== null) {
    return currentSelection === undefined ? (
      <FollowUpMessage
        title="Returning to active work…"
        description="This exact claim is no longer present in the current owned-work view. Its case context is hidden."
        live
      />
    ) : (
      <ResolverFollowUpConsole
        tenantId={tenantId}
        signInHref={signInHref}
        item={currentSelection}
        isReleasePending={releaseRequest.isLoading}
        onBack={() => onSelectWork(null)}
        onRecheckOwnership={() => ownedWork.refetch()}
        onConfirmRelease={() => releaseFromConsole(currentSelection)}
      />
    );
  }

  return (
    <ResolverOwnedHumanFollowUpsList
      signInHref={signInHref}
      items={items}
      releaseNotice={releaseNotice}
      pendingClaimId={
        releaseRequest.isLoading
          ? releaseRequest.originalArgs?.claimId
          : undefined
      }
      consoleReleaseFocusId={consoleReleaseFocusId}
      isFetching={ownedWork.isFetching}
      canGoBack={position.history.length > 0}
      canGoNext={nextCursor !== null}
      onRelease={release}
      onOpenConsole={onSelectWork}
      returnFocusToWorkItemId={returnFocusToWorkItemId}
      onMissingReturnFocus={onMissingReturnFocus}
      onRetryRelease={submitRelease}
      onPrevious={() =>
        setPosition((current) => {
          const previous = current.history[current.history.length - 1];
          const history = current.history.slice(0, -1);
          return previous === null || previous === undefined
            ? { history }
            : { cursor: previous, history };
        })
      }
      onNext={() => {
        if (nextCursor !== null) {
          setPosition((current) => ({
            cursor: nextCursor,
            history: [...current.history, current.cursor ?? null],
          }));
        }
      }}
    />
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

function isExactSelectedClaim(
  current: ResolverOwnedHumanFollowUpWork,
  selected: ResolverOwnedHumanFollowUpWork,
): boolean {
  return (
    current.claim.claimId === selected.claim.claimId &&
    current.workItem.workItemId === selected.workItem.workItemId &&
    current.workItem.caseId === selected.workItem.caseId &&
    current.workItem.runId === selected.workItem.runId &&
    current.workItem.ownershipRevision === selected.workItem.ownershipRevision
  );
}
