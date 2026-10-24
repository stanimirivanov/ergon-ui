import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import type { FollowUpPriorityCommand } from '../client/follow-up-priority';
import type { ResolverOwnedHumanFollowUpQuery } from '../client';
import { humanFollowUpApi } from './human-follow-up-api';

/**
 * A distinct current owned-page observation before exact priority replay. Wait
 * for older same-key reads rather than inheriting their result through RTK
 * deduplication. No response is retained locally and a cancelled lifetime cannot
 * acquire a later request. The BFF independently fences authority at the POST.
 */
export function usePriorityOwnershipCheck(
  query: ResolverOwnedHumanFollowUpQuery,
): (command: FollowUpPriorityCommand, signal: AbortSignal) => Promise<boolean> {
  const dispatch = useDispatch<
    ThunkDispatch<
      {
        readonly humanFollowUpApi: ReturnType<typeof humanFollowUpApi.reducer>;
      },
      unknown,
      UnknownAction
    >
  >();
  const { tenantId, limit, cursor } = query;
  return useCallback(
    async (
      command: FollowUpPriorityCommand,
      signal: AbortSignal,
    ): Promise<boolean> => {
      const requestQuery = {
        tenantId,
        limit,
        ...(cursor === undefined ? {} : { cursor }),
      };
      let retiring = dispatch(
        humanFollowUpApi.util.getRunningQueryThunk(
          'resolverOwnedHumanFollowUps',
          requestQuery,
        ),
      );
      while (retiring !== undefined) {
        await retiring;
        if (signal.aborted) return false;
        retiring = dispatch(
          humanFollowUpApi.util.getRunningQueryThunk(
            'resolverOwnedHumanFollowUps',
            requestQuery,
          ),
        );
      }
      if (signal.aborted || command.tenantId !== tenantId) return false;
      const request = dispatch(
        humanFollowUpApi.endpoints.resolverOwnedHumanFollowUps.initiate(
          requestQuery,
          { forceRefetch: true, subscribe: false },
        ),
      );
      const result = await request;
      return (
        !signal.aborted &&
        result.isSuccess &&
        result.data?.items.some(
          (item) =>
            item.workItem.workItemId === command.workItemId &&
            item.claim.claimId === command.claimId &&
            item.workItem.ownershipRevision ===
              command.expectedOwnershipRevision,
        ) === true
      );
    },
    [dispatch, tenantId, limit, cursor],
  );
}
