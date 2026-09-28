import type {
  HumanFollowUpCursor,
  HumanFollowUpQuery,
} from '@ergon/application-follow-up';
import type { HumanFollowUpWorkItem } from '@ergon/domain-follow-up';
import {
  useClaimHumanFollowUpMutation,
  useHumanFollowUpsQuery,
} from '@ergon/infrastructure-follow-up-web';
import { Button } from '@ergon/ui-web';
import { useState } from 'react';

import { browserSignInHref } from '../session/browser-session-navigation';
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
  queueKey,
}: {
  readonly tenantId: string;
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
    setClaimNotice(undefined);
    const result = await claimHumanFollowUp({
      tenantId,
      workItemId: item.workItemId,
    });
    setClaimNotice(
      'data' in result
        ? { kind: 'success' }
        : {
            kind: 'failure',
            item,
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
          <a href={browserSignInHref(tenantId)}>Sign in again</a>
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
      signInHref={browserSignInHref(tenantId)}
      onClaim={claim}
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
