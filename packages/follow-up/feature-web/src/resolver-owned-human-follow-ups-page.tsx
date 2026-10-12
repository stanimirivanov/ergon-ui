import { normalizeHumanFollowUpFailure } from '@ergon/follow-up-data-access-web';
import { Button } from '@ergon/ui-web';
import { useEffect, useRef, type ReactElement } from 'react';

import { FollowUpMessage } from './follow-up-message';
import { ResolverFollowUpConsole } from './resolver-follow-up-console';
import { ResolverContextWithheld } from './resolver-context-withheld';
import { ownedWorkFailureCopy } from './resolver-owned-human-follow-ups-copy';
import { ResolverOwnedHumanFollowUpsList } from './resolver-owned-human-follow-ups-view';
import type { OwnedFollowUpWorkflow } from './use-owned-follow-up-workflow';

/** Presents the owned workflow; requests and disclosure transitions have one controller owner. */
export function ResolverOwnedHumanFollowUpsPage({
  tenantId,
  signInHref,
  workflow,
  onMissingReturnFocus,
  onBeforeConsoleRetry,
}: {
  readonly tenantId: string;
  readonly signInHref: string;
  readonly workflow: OwnedFollowUpWorkflow;
  readonly onMissingReturnFocus: () => void;
  /** Moves focus out of a recovery control before its private body is replaced. */
  readonly onBeforeConsoleRetry: () => void;
}): ReactElement {
  const { ownedWork, isConsoleOpen, currentSelection } = workflow;
  const readFailureHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (ownedWork.isError) {
      if (isConsoleOpen) readFailureHeading.current?.focus();
      else if (workflow.returnFocusToWorkItemId !== null)
        onMissingReturnFocus();
    }
  }, [
    ownedWork.isError,
    isConsoleOpen,
    workflow.returnFocusToWorkItemId,
    onMissingReturnFocus,
  ]);

  if (
    workflow.isClaimRechecking ||
    ownedWork.isLoading ||
    (ownedWork.isFetching &&
      (ownedWork.currentData === undefined || isConsoleOpen))
  ) {
    if (isConsoleOpen) {
      return (
        <ResolverContextWithheld
          id="owned-work-check"
          title="Loading your active work…"
          description="The control plane is checking current ownership and resolver authority."
          live
        />
      );
    }
    return (
      <FollowUpMessage
        title="Loading your active work…"
        description="The control plane is checking current ownership and resolver authority."
        live
      />
    );
  }

  // A retained owned page cannot authorize private detail during a failed gate.
  if (ownedWork.isError || ownedWork.currentData === undefined) {
    const failure = normalizeHumanFollowUpFailure(ownedWork.error);
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
          onClick={() => {
            if (isConsoleOpen) onBeforeConsoleRetry();
            workflow.resetPages();
          }}
        >
          Return to first claimed-work page
        </Button>
      ) : copy.canRetry ? (
        <Button
          type="button"
          variant="quiet"
          onClick={() => {
            if (isConsoleOpen) onBeforeConsoleRetry();
            ownedWork.refetch();
          }}
        >
          Try again
        </Button>
      ) : undefined;
    if (isConsoleOpen) {
      return (
        <ResolverContextWithheld
          id="owned-work-check"
          title={copy.title}
          description={copy.description}
          action={action}
          headingRef={readFailureHeading}
        />
      );
    }
    return (
      <FollowUpMessage
        title={copy.title}
        description={copy.description}
        action={action}
      />
    );
  }

  if (isConsoleOpen) {
    return currentSelection === undefined ? (
      <ResolverContextWithheld
        id="owned-work-check"
        title="Returning to active work…"
        description="This exact claim is no longer present in the current owned-work view. Its case context is hidden."
        live
      />
    ) : (
      <ResolverFollowUpConsole
        tenantId={tenantId}
        signInHref={signInHref}
        item={currentSelection}
        onBeforeRetry={onBeforeConsoleRetry}
      />
    );
  }
  const { items, nextCursor } = ownedWork.currentData;
  return (
    <ResolverOwnedHumanFollowUpsList
      signInHref={signInHref}
      items={items}
      releaseNotice={workflow.releaseNotice}
      pendingClaimId={workflow.pendingClaimId}
      consoleReleaseFocusId={workflow.consoleReleaseFocusId}
      isFetching={ownedWork.isFetching}
      canGoBack={workflow.position.history.length > 0}
      canGoNext={nextCursor !== null}
      onRelease={workflow.release}
      onOpenConsole={workflow.open}
      returnFocusToWorkItemId={workflow.returnFocusToWorkItemId}
      onMissingReturnFocus={onMissingReturnFocus}
      onRetryRelease={workflow.retryRelease}
      onPrevious={workflow.previousPage}
      onNext={workflow.nextPage}
    />
  );
}
