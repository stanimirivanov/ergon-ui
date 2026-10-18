import {
  normalizeRunEscalationFailure,
  useEscalateExhaustedRunMutation,
  type RunEscalationCommand,
  type RunEscalationFailure,
  type RunEscalationReceipt,
} from '@ergon/run-supervision-data-access-web';
import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';
import {
  useConfirmedRunCommand,
  type ConfirmedRunCommandState,
} from './use-confirmed-run-command';

export type RunEscalationState =
  | ConfirmedRunCommandState<
      RunEscalationCommand,
      RunEscalationReceipt,
      RunEscalationFailure
    >
  | { readonly phase: 'review-failed'; readonly error: RunEscalationFailure };

/** Owns exact intent and historical feedback, never remote observations. Failed review withdraws prior disclosure without offering mutation replay. */
export function useRunEscalation(options: {
  readonly heading: RefObject<HTMLHeadingElement | null>;
  readonly onSuccess: (receipt: RunEscalationReceipt) => void;
}): {
  readonly state: RunEscalationState;
  readonly isBlockingDisclosure: boolean;
  readonly submit: (command: RunEscalationCommand) => void;
  readonly retry: () => void;
  readonly clear: () => void;
  readonly rejectReview: (error: RunEscalationFailure) => void;
} {
  const [send] = useEscalateExhaustedRunMutation();
  const command = useConfirmedRunCommand({
    send,
    normalize: normalizeRunEscalationFailure,
    ...options,
  });
  const [reviewError, setReviewError] = useState<RunEscalationFailure | null>(
    null,
  );
  const isCommandBlocking = command.isBlockingDisclosure;
  const rejectReview = useCallback(
    (failure: RunEscalationFailure): void => {
      if (!isCommandBlocking)
        setReviewError(normalizeRunEscalationFailure(failure));
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
