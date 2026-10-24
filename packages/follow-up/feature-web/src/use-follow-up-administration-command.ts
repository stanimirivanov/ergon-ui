import {
  followUpHandoverApi,
  followUpCompletionApi,
  normalizeFollowUpHandoverFailure,
  normalizeFollowUpCompletionFailure,
  type FollowUpHandoverCommand,
  type FollowUpHandoverFailure,
  type FollowUpCompletionCommand,
  type FollowUpCompletionFailure,
  followUpPriorityApi,
  normalizeFollowUpPriorityFailure,
  type FollowUpPriorityCommand,
  type FollowUpPriorityFailure,
} from '@ergon/follow-up-data-access-web';
import type {
  FollowUpHandover,
  FollowUpCompletion,
  FollowUpPriorityAssignment,
} from '@ergon/follow-up-model';
import { useCallback, useEffect, useRef, useState } from 'react';

export type FollowUpAdministrationIntent =
  | {
      readonly operation: 'priority';
      readonly command: FollowUpPriorityCommand;
    }
  | {
      readonly operation: 'handover';
      readonly command: FollowUpHandoverCommand;
    }
  | {
      readonly operation: 'completion';
      readonly command: FollowUpCompletionCommand;
    };

export type FollowUpAdministrationPhase =
  | {
      readonly kind: 'priority-recheck';
      readonly operation: 'priority';
      readonly command: FollowUpPriorityCommand;
    }
  | {
      readonly kind: 'failure';
      readonly operation: 'priority';
      readonly command: FollowUpPriorityCommand;
      readonly failure: FollowUpPriorityFailure;
    }
  | {
      readonly kind: 'success';
      readonly operation: 'priority';
      readonly receipt: FollowUpPriorityAssignment;
    }
  | { readonly kind: 'idle' }
  | ({ readonly kind: 'pending' } & FollowUpAdministrationIntent)
  | {
      readonly kind: 'failure';
      readonly operation: 'handover';
      readonly command: FollowUpHandoverCommand;
      readonly failure: FollowUpHandoverFailure;
    }
  | {
      readonly kind: 'failure';
      readonly operation: 'completion';
      readonly command: FollowUpCompletionCommand;
      readonly failure: FollowUpCompletionFailure;
    }
  | {
      readonly kind: 'success';
      readonly operation: 'handover';
      readonly receipt: FollowUpHandover;
    }
  | {
      readonly kind: 'success';
      readonly operation: 'completion';
      readonly receipt: FollowUpCompletion;
    }
  | {
      readonly kind: 'recovering';
      readonly operation: FollowUpAdministrationIntent['operation'];
    };

/**
 * One mounted administrative-command lifetime. Priority preserves ownership,
 * but shares committed withdrawal and explicit independently authorized re-entry.
 * The parent commits private withdrawal before this effect starts I/O. Retains
 * intent and historical acknowledgement only, never copied RTK resources.
 * StrictMode reattaches without another POST. Close/tenant replacement retires
 * callbacks and local replay; abort never establishes that a write did not occur.
 */
export function useFollowUpAdministrationCommand(
  recheckOwned: () => PromiseLike<unknown>,
  checkPriorityOwnership: (
    command: FollowUpPriorityCommand,
    signal: AbortSignal,
  ) => Promise<boolean>,
): {
  readonly phase: FollowUpAdministrationPhase;
  readonly submit: (intent: FollowUpAdministrationIntent) => void;
  readonly replay: () => void;
  readonly recover: () => void;
  readonly dismiss: () => void;
} {
  const [phase, setPhase] = useState<FollowUpAdministrationPhase>({
    kind: 'idle',
  });
  const [handOver] = followUpHandoverApi.useHandOverFollowUpMutation();
  const [complete] = followUpCompletionApi.useCompleteFollowUpMutation();
  const [assignPriority] =
    followUpPriorityApi.useAssignFollowUpPriorityMutation();
  const request = useRef<
    | ReturnType<typeof handOver>
    | ReturnType<typeof complete>
    | ReturnType<typeof assignPriority>
    | undefined
  >(undefined);
  const reset = useCallback(() => {
    request.current?.reset();
    request.current = undefined;
  }, []);
  const started = useRef<{
    readonly phase: FollowUpAdministrationPhase;
    readonly operation: Promise<FollowUpAdministrationPhase>;
  }>(undefined);
  const ownershipCheck = useRef<AbortController | undefined>(undefined);
  useEffect(
    () => () => {
      ownershipCheck.current?.abort();
      request.current?.abort();
      reset();
    },
    [reset],
  );
  useEffect(() => {
    if (
      phase.kind !== 'pending' &&
      phase.kind !== 'recovering' &&
      phase.kind !== 'priority-recheck'
    )
      return;
    let active = true;
    if (started.current?.phase !== phase) {
      let operation: Promise<FollowUpAdministrationPhase>;
      if (phase.kind === 'priority-recheck') {
        // Commit a distinct pending phase only while this read lifetime remains
        // attached. A retired read callback must never send a late POST.
        ownershipCheck.current = new AbortController();
        operation = checkPriorityOwnership(
          phase.command,
          ownershipCheck.current.signal,
        ).then((isCurrent): FollowUpAdministrationPhase =>
          isCurrent
            ? { kind: 'pending', operation: 'priority', command: phase.command }
            : {
                kind: 'failure',
                operation: 'priority',
                command: phase.command,
                failure: { kind: 'not-found' },
              },
        );
      } else if (phase.kind === 'recovering') {
        operation = Promise.resolve(recheckOwned()).then(() => ({
          kind: 'idle' as const,
        }));
      } else if (phase.operation === 'priority') {
        const send = (): Promise<FollowUpAdministrationPhase> => {
          const handle = assignPriority(phase.command);
          request.current = handle;
          return handle.then((result): FollowUpAdministrationPhase =>
            result.data === undefined
              ? {
                  kind: 'failure',
                  operation: 'priority',
                  command: phase.command,
                  failure: normalizeFollowUpPriorityFailure(result.error),
                }
              : {
                  kind: 'success',
                  operation: 'priority',
                  receipt: result.data,
                },
          );
        };
        operation = send();
      } else if (phase.operation === 'handover') {
        const handle = handOver(phase.command);
        request.current = handle;
        operation = handle.then((result): FollowUpAdministrationPhase =>
          result.data === undefined
            ? {
                kind: 'failure',
                operation: 'handover',
                command: phase.command,
                failure: normalizeFollowUpHandoverFailure(result.error),
              }
            : { kind: 'success', operation: 'handover', receipt: result.data },
        );
      } else {
        const handle = complete(phase.command);
        request.current = handle;
        operation = handle.then((result): FollowUpAdministrationPhase =>
          result.data === undefined
            ? {
                kind: 'failure',
                operation: 'completion',
                command: phase.command,
                failure: normalizeFollowUpCompletionFailure(result.error),
              }
            : {
                kind: 'success',
                operation: 'completion',
                receipt: result.data,
              },
        );
      }
      started.current = { phase, operation };
    }
    void started.current.operation.then((next) => {
      if (active) {
        if (next.kind === 'idle') reset();
        setPhase((current) => (current === phase ? next : current));
      }
    });
    return () => {
      active = false;
    };
  }, [
    phase,
    handOver,
    complete,
    assignPriority,
    recheckOwned,
    checkPriorityOwnership,
    reset,
  ]);

  const submit = (intent: FollowUpAdministrationIntent) =>
    setPhase(
      intent.operation === 'priority'
        ? { kind: 'pending', operation: 'priority', command: intent.command }
        : intent.operation === 'handover'
          ? { kind: 'pending', operation: 'handover', command: intent.command }
          : {
              kind: 'pending',
              operation: 'completion',
              command: intent.command,
            },
    );
  return {
    phase,
    submit,
    replay: () => {
      if (phase.kind === 'failure') {
        if (phase.operation === 'priority')
          setPhase({
            kind: 'priority-recheck',
            operation: 'priority',
            command: phase.command,
          });
        else submit(phase);
      }
    },
    recover: () => {
      if (phase.kind !== 'idle')
        setPhase({ kind: 'recovering', operation: phase.operation });
    },
    dismiss: () => {
      ownershipCheck.current?.abort();
      request.current?.abort();
      reset();
      started.current = undefined;
      setPhase({ kind: 'idle' });
    },
  };
}
