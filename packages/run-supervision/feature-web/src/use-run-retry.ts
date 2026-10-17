import {
  normalizeRunRetryFailure,
  useRetryFailedRunMutation,
  type RunRetryCommand,
  type RunRetryFailure,
  type RunRetryReceipt,
} from '@ergon/run-supervision-data-access-web';
import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';
import {
  useConfirmedRunCommand,
  type ConfirmedRunCommandState,
} from './use-confirmed-run-command';

export type RunRetryState =
  | ConfirmedRunCommandState<RunRetryCommand, RunRetryReceipt, RunRetryFailure>
  | { readonly phase: 'review-failed'; readonly error: RunRetryFailure };

/** Owns immutable retry intent and historical feedback, never current run/review facts. Failed review withdraws disclosure without manufacturing a command. */
export function useRunRetry(options: {
  readonly heading: RefObject<HTMLHeadingElement | null>;
  readonly onSuccess: (receipt: RunRetryReceipt) => void;
}): {
  readonly state: RunRetryState;
  readonly isBlockingDisclosure: boolean;
  readonly submit: (command: RunRetryCommand) => void;
  readonly retry: () => void;
  readonly clear: () => void;
  readonly rejectReview: (error: RunRetryFailure) => void;
} {
  const [send] = useRetryFailedRunMutation();
  const command = useConfirmedRunCommand({
    send,
    normalize: normalizeRunRetryFailure,
    ...options,
  });
  const [reviewError, setReviewError] = useState<RunRetryFailure | null>(null);
  const isCommandBlocking = command.isBlockingDisclosure;
  const rejectReview = useCallback(
    (failure: RunRetryFailure): void => {
      if (!isCommandBlocking) setReviewError(normalizeRunRetryFailure(failure));
    },
    [isCommandBlocking],
  );
  const { heading } = options;
  useLayoutEffect(() => {
    if (reviewError !== null) heading.current?.focus();
  }, [reviewError, heading]);
  return {
    ...command,
    state:
      reviewError !== null && !isCommandBlocking
        ? { phase: 'review-failed', error: reviewError }
        : command.state,
    isBlockingDisclosure: isCommandBlocking || reviewError !== null,
    rejectReview,
    submit: (intent) => {
      setReviewError(null);
      command.submit(intent);
    },
    clear: () => {
      setReviewError(null);
      command.clear();
    },
  };
}
