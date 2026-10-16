import {
  normalizeRunExecutionFailure,
  useSubmitRunExecutionMutation,
  type RunExecutionCommand,
  type RunExecutionFailure,
  type RunExecutionReceipt,
} from '@ergon/run-supervision-data-access-web';
import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';
import {
  useConfirmedRunCommand,
  type ConfirmedRunCommandState,
} from './use-confirmed-run-command';

export type RunCapabilityExecutionState =
  | ConfirmedRunCommandState<
      RunExecutionCommand,
      RunExecutionReceipt,
      RunExecutionFailure
    >
  | { readonly phase: 'review-failed'; readonly error: RunExecutionFailure };

/** Owns immutable intent and historical feedback only. Retry may first admit unchanged intent; admitted identities acknowledge only. Additional recovery requires fresh confirmation. */
export function useRunCapabilityExecution(options: {
  readonly heading: RefObject<HTMLHeadingElement | null>;
  readonly onSuccess: () => void;
}): {
  readonly state: RunCapabilityExecutionState;
  readonly isBlockingDisclosure: boolean;
  readonly submit: (command: RunExecutionCommand) => void;
  readonly retry: () => void;
  readonly clear: () => void;
  readonly rejectReview: (error: RunExecutionFailure) => void;
} {
  const [send] = useSubmitRunExecutionMutation();
  const command = useConfirmedRunCommand({
    send,
    normalize: normalizeRunExecutionFailure,
    ...options,
  });
  const [reviewError, setReviewError] = useState<RunExecutionFailure | null>(
    null,
  );
  const isCommandBlocking = command.isBlockingDisclosure;
  const rejectReview = useCallback(
    (failure: RunExecutionFailure): void => {
      if (!isCommandBlocking)
        setReviewError(normalizeRunExecutionFailure(failure));
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
