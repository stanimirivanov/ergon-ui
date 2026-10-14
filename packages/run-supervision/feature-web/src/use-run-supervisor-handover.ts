import {
  normalizeRunHandoverFailure,
  useHandoverRunSupervisorMutation,
  type RunSupervisorHandoverCommand,
  type RunSupervisorHandoverFailure,
  type RunSupervisorHandoverReceipt,
} from '@ergon/run-supervision-data-access-web';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type RefObject,
} from 'react';

export type RunHandoverState =
  | { readonly phase: 'idle' }
  | {
      readonly phase: 'candidate-failed';
      readonly error: RunSupervisorHandoverFailure;
    }
  | {
      readonly phase: 'submitting';
      readonly command: RunSupervisorHandoverCommand;
    }
  | {
      readonly phase: 'failed';
      readonly command: RunSupervisorHandoverCommand;
      readonly error: RunSupervisorHandoverFailure;
    }
  | {
      readonly phase: 'succeeded';
      readonly receipt: RunSupervisorHandoverReceipt;
    };

/**
 * Owns confirmed transfer/replay intent, never a run or candidate snapshot.
 * The submitting phase commits closed disclosure before RTK starts the POST.
 * StrictMode's abandoned effect cannot acquire a command. Cleanup retires late
 * callbacks and removes this mutation subscription; the bounded transport may
 * finish a write, so navigation does not promise cancellation of the transfer.
 */
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
  const [state, setState] = useState<RunHandoverState>({ phase: 'idle' });
  const [transfer] = useHandoverRunSupervisorMutation();
  const rejectCandidates = useCallback(
    (error: RunSupervisorHandoverFailure): void => {
      setState((previous) =>
        previous.phase === 'submitting' || previous.phase === 'failed'
          ? previous
          : {
              phase: 'candidate-failed',
              error: normalizeRunHandoverFailure(error),
            },
      );
    },
    [],
  );

  useLayoutEffect(() => {
    // The modal's layout cleanup has closed its top layer before focus moves
    // to this persistent target; focusing an inert outer heading earlier fails.
    if (state.phase === 'submitting' || state.phase === 'candidate-failed')
      heading.current?.focus();
  }, [state, heading]);

  useEffect(() => {
    if (state.phase !== 'submitting') return;
    let active = true;
    let request: ReturnType<typeof transfer> | undefined;
    void Promise.resolve().then(async () => {
      if (!active) return;
      try {
        request = transfer(state.command);
        const result = await request;
        if (!active) return;
        if (result.data !== undefined) {
          setState({ phase: 'succeeded', receipt: result.data });
          onSuccess();
        } else {
          setState({
            phase: 'failed',
            command: state.command,
            error: normalizeRunHandoverFailure(result.error),
          });
        }
      } catch {
        if (active)
          setState({
            phase: 'failed',
            command: state.command,
            error: { kind: 'unexpected-defect' },
          });
      }
    });
    return () => {
      active = false;
      request?.reset();
    };
  }, [state, transfer, onSuccess]);

  return {
    state,
    isBlockingDisclosure:
      state.phase === 'submitting' ||
      state.phase === 'failed' ||
      state.phase === 'candidate-failed',
    rejectCandidates,
    submit: (command) => {
      if (state.phase !== 'submitting')
        setState({ phase: 'submitting', command });
    },
    retry: () => {
      if (state.phase === 'failed')
        setState({ phase: 'submitting', command: state.command });
    },
    clear: () => setState({ phase: 'idle' }),
  };
}
