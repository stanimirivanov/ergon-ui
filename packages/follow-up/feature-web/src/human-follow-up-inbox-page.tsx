import type {
  HumanFollowUpClaimCommand,
  HumanFollowUpCursor,
  HumanFollowUpQuery,
} from '@ergon/follow-up-data-access-web';
import type { HumanFollowUpWorkItem } from '@ergon/follow-up-model';
import {
  useClaimHumanFollowUpMutation,
  useHumanFollowUpsQuery,
} from '@ergon/follow-up-data-access-web';
import { Button } from '@ergon/ui-web';
import { useState } from 'react';

import {
  normalizeFollowUpClaimFailure,
  normalizeFollowUpReadFailure,
} from './follow-up-failure-normalization';
import { FollowUpMessage } from './follow-up-message';
import { inboxFailureCopy } from './human-follow-up-inbox-copy';
import {
  type ClaimNotice,
  HumanFollowUpPageView,
} from './human-follow-up-inbox-view';

const PAGE_SIZE = 25;

interface PagePosition {
  readonly cursor?: HumanFollowUpCursor;
  readonly history: readonly (HumanFollowUpCursor | null)[];
}

/** Owns inbox request, claim, and reversible keyset-navigation state. */
export function HumanFollowUpInboxPage({
  tenantId,
  signInHref,
  queueKey,
}: {
  readonly tenantId: string;
  readonly signInHref: string;
  readonly queueKey?: string;
}) {
  const [position, setPosition] = useState<PagePosition>({ history: [] });
  const [claimNotice, setClaimNotice] = useState<ClaimNotice>();
  const [claimHumanFollowUp, claimRequest] = useClaimHumanFollowUpMutation();
  const query: HumanFollowUpQuery = {
    tenantId,
    limit: PAGE_SIZE,
    ...(queueKey === undefined ? {} : { queueKey }),
    ...(position.cursor === undefined ? {} : { cursor: position.cursor }),
  };
  const followUps = useHumanFollowUpsQuery(query);

  async function claim(item: HumanFollowUpWorkItem): Promise<void> {
    return submitClaim(item, {
      tenantId,
      workItemId: item.workItemId,
      commandId: crypto.randomUUID(),
      expectedOwnershipRevision: item.ownershipRevision,
    });
  }

  async function submitClaim(
    item: HumanFollowUpWorkItem,
    command: HumanFollowUpClaimCommand,
  ): Promise<void> {
    setClaimNotice(undefined);
    const result = await claimHumanFollowUp(command);
    setClaimNotice(
      'data' in result
        ? { kind: 'success' }
        : {
            kind: 'failure',
            item,
            command,
            failure: normalizeFollowUpClaimFailure(result.error),
          },
    );
  }

  if (
    followUps.isLoading ||
    (followUps.isFetching && followUps.data === undefined)
  ) {
    return (
      <FollowUpMessage
        title="Loading follow-up work…"
        description="The workbench is requesting only the rows visible to your current authority."
        live
      />
    );
  }

  if (followUps.data === undefined) {
    const failure = normalizeFollowUpReadFailure(followUps.error);
    const copy = inboxFailureCopy(failure);
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
          Return to first page
        </Button>
      ) : copy.canRetry ? (
        <Button
          type="button"
          variant="quiet"
          onClick={() => followUps.refetch()}
        >
          Try again
        </Button>
      ) : undefined;
    return (
      <FollowUpMessage
        title={copy.title}
        description={copy.description}
        action={action}
      />
    );
  }

  const { items, nextCursor } = followUps.data;
  return (
    <HumanFollowUpPageView
      items={items}
      {...(queueKey === undefined ? {} : { queueKey })}
      isFetching={followUps.isFetching}
      canGoBack={position.history.length > 0}
      canGoNext={nextCursor !== null}
      pendingWorkItemId={
        claimRequest.isLoading
          ? claimRequest.originalArgs?.workItemId
          : undefined
      }
      claimNotice={claimNotice}
      signInHref={signInHref}
      onClaim={claim}
      onRetry={submitClaim}
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
