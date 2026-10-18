import {
  normalizeRunCancellationFailure,
  useCancelUntouchedRunMutation,
  type RunCancellationCommand,
  type RunCancellationFailure,
  type RunCancellationReceipt,
} from '@ergon/run-supervision-data-access-web';
import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';
import {
  useConfirmedRunCommand,
  type ConfirmedRunCommandState,
} from './use-confirmed-run-command';

export type RunCancellationState =
  | ConfirmedRunCommandState<
      RunCancellationCommand,
      RunCancellationReceipt,
      RunCancellationFailure
    >
  | { readonly phase: 'review-failed'; readonly error: RunCancellationFailure };

/** Owns exact intent and historical feedback, never remote observations. Failed review withdraws prior disclosure without offering mutation replay. */
export function useRunCancellation(options: {
  readonly heading: RefObject<HTMLHeadingElement | null>;
  readonly onSuccess: (receipt: RunCancellationReceipt) => void;
}): {
  readonly state: RunCancellationState;
  readonly isBlockingDisclosure: boolean;
  readonly submit: (command: RunCancellationCommand) => void;
  readonly retry: () => void;
  readonly clear: () => void;
  readonly rejectReview: (error: RunCancellationFailure) => void;
} {
  const [send] = useCancelUntouchedRunMutation();
  const command = useConfirmedRunCommand({
    send,
    normalize: normalizeRunCancellationFailure,
    ...options,
  });
  const [reviewError, setReviewError] = useState<RunCancellationFailure | null>(
    null,
  );
  const isCommandBlocking = command.isBlockingDisclosure;
  const rejectReview = useCallback(
    (failure: RunCancellationFailure): void => {
      if (!isCommandBlocking)
        setReviewError(normalizeRunCancellationFailure(failure));
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
