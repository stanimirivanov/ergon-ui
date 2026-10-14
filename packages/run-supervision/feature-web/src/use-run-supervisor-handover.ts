import {
  normalizeRunHandoverFailure,
  useHandoverRunSupervisorMutation,
  type RunSupervisorHandoverCommand,
  type RunSupervisorHandoverFailure,
  type RunSupervisorHandoverReceipt,
} from '@ergon/run-supervision-data-access-web';
import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';
import {
  useConfirmedRunCommand,
  type ConfirmedRunCommandState,
} from './use-confirmed-run-command';

export type RunHandoverState =
  | ConfirmedRunCommandState<
      RunSupervisorHandoverCommand,
      RunSupervisorHandoverReceipt,
      RunSupervisorHandoverFailure
    >
  | {
      readonly phase: 'candidate-failed';
      readonly error: RunSupervisorHandoverFailure;
    };

/** Confirmed transfer intent plus access-check retirement; candidate failures never manufacture replayable command intent. */
export function useRunSupervisorHandover({
  heading,
  onSuccess,
}: {
  readonly heading: RefObject<HTMLHeadingElement | null>;
  readonly onSuccess: () => void;
}): {
  readonly state: RunHandoverState;
  readonly isBlockingDisclosure: boolean;
  readonly submit: (command: RunSupervisorHandoverCommand) => void;
  readonly retry: () => void;
  readonly clear: () => void;
  readonly rejectCandidates: (error: RunSupervisorHandoverFailure) => void;
} {
  const [transfer] = useHandoverRunSupervisorMutation();
  const command = useConfirmedRunCommand({
    send: transfer,
    normalize: normalizeRunHandoverFailure,
    heading,
    onSuccess,
  });
  const [candidateError, setCandidateError] =
    useState<RunSupervisorHandoverFailure | null>(null);
  const isCommandBlocking = command.isBlockingDisclosure;
  const rejectCandidates = useCallback(
    (error: RunSupervisorHandoverFailure): void => {
      if (!isCommandBlocking)
        setCandidateError(normalizeRunHandoverFailure(error));
    },
    [isCommandBlocking],
  );
  useLayoutEffect(() => {
    if (candidateError !== null) heading.current?.focus();
  }, [candidateError, heading]);
  const state: RunHandoverState =
    candidateError !== null && !isCommandBlocking
      ? { phase: 'candidate-failed', error: candidateError }
      : command.state;
  return {
    ...command,
    state,
    isBlockingDisclosure: isCommandBlocking || candidateError !== null,
    rejectCandidates,
    submit: (intent) => {
      setCandidateError(null);
      command.submit(intent);
    },
    clear: () => {
      setCandidateError(null);
      command.clear();
    },
  };
}
