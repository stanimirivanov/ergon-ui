import type {
  ResolverOwnedHumanFollowUpCursor,
  ResolverOwnedHumanFollowUpQuery,
} from '@ergon/infrastructure-follow-up-web';
import { useResolverOwnedHumanFollowUpsQuery } from '@ergon/infrastructure-follow-up-web';
import { Button } from '@ergon/ui-web';
import { useState } from 'react';

import { normalizeFollowUpReadFailure } from './follow-up-failure-normalization';
import { FollowUpMessage } from './follow-up-message';
import { ownedWorkFailureCopy } from './resolver-owned-human-follow-ups-copy';
import { ResolverOwnedHumanFollowUpsList } from './resolver-owned-human-follow-ups-view';

const PAGE_SIZE = 25;

interface PagePosition {
  readonly cursor?: ResolverOwnedHumanFollowUpCursor;
  readonly history: readonly (ResolverOwnedHumanFollowUpCursor | null)[];
}

/** Owns active-work requests and reversible claim-cursor navigation. */
export function ResolverOwnedHumanFollowUpsPage({
  tenantId,
  signInHref,
}: {
  readonly tenantId: string;
  readonly signInHref: string;
}) {
  const [position, setPosition] = useState<PagePosition>({ history: [] });
  const query: ResolverOwnedHumanFollowUpQuery = {
    tenantId,
    limit: PAGE_SIZE,
    ...(position.cursor === undefined ? {} : { cursor: position.cursor }),
  };
  const ownedWork = useResolverOwnedHumanFollowUpsQuery(query);

  if (
    ownedWork.isLoading ||
    (ownedWork.isFetching && ownedWork.data === undefined)
  ) {
    return (
      <FollowUpMessage
        title="Loading your active work…"
        description="The control plane is checking current ownership and resolver authority."
        live
      />
    );
  }

  if (ownedWork.data === undefined) {
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
        action={action}
      />
    );
  }

  const { items, nextCursor } = ownedWork.data;
  return (
    <ResolverOwnedHumanFollowUpsList
      tenantId={tenantId}
      signInHref={signInHref}
      items={items}
      isFetching={ownedWork.isFetching}
      canGoBack={position.history.length > 0}
      canGoNext={nextCursor !== null}
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
