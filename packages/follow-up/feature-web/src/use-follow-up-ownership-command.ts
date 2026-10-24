import {
  followUpHandoverApi,
  followUpCompletionApi,
  normalizeFollowUpHandoverFailure,
  normalizeFollowUpCompletionFailure,
  type FollowUpHandoverCommand,
  type FollowUpHandoverFailure,
  type FollowUpCompletionCommand,
  type FollowUpCompletionFailure,
} from '@ergon/follow-up-data-access-web';
import type {
  FollowUpHandover,
  FollowUpCompletion,
} from '@ergon/follow-up-model';
import { useCallback, useEffect, useRef, useState } from 'react';

export type FollowUpOwnershipIntent =
  | {
      readonly operation: 'handover';
      readonly command: FollowUpHandoverCommand;
    }
  | {
      readonly operation: 'completion';
      readonly command: FollowUpCompletionCommand;
    };

export type FollowUpOwnershipPhase =
  | { readonly kind: 'idle' }
  | ({ readonly kind: 'pending' } & FollowUpOwnershipIntent)
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
      readonly operation: FollowUpOwnershipIntent['operation'];
    };

/**
 * One mounted ownership-command lifetime, shared by the two current operations.
 * The parent commits private withdrawal before this effect starts I/O. Retains
 * intent and historical acknowledgement only, never copied RTK resources.
 * StrictMode reattaches without another POST. Close/tenant replacement retires
 * callbacks and local replay; abort never establishes that a write did not occur.
 */
export function useFollowUpOwnershipCommand(
  recheckOwned: () => PromiseLike<unknown>,
): {
  readonly phase: FollowUpOwnershipPhase;
  readonly submit: (intent: FollowUpOwnershipIntent) => void;
  readonly replay: () => void;
  readonly recover: () => void;
  readonly dismiss: () => void;
} {
  const [phase, setPhase] = useState<FollowUpOwnershipPhase>({ kind: 'idle' });
  const [handOver] = followUpHandoverApi.useHandOverFollowUpMutation();
  const [complete] = followUpCompletionApi.useCompleteFollowUpMutation();
  const request = useRef<
    ReturnType<typeof handOver> | ReturnType<typeof complete> | undefined
  >(undefined);
  const reset = useCallback(() => {
    request.current?.reset();
    request.current = undefined;
  }, []);
  const started = useRef<{
    readonly phase: FollowUpOwnershipPhase;
    readonly operation: Promise<FollowUpOwnershipPhase>;
  }>(undefined);
  useEffect(
    () => () => {
      request.current?.abort();
      reset();
    },
    [reset],
  );
  useEffect(() => {
    if (phase.kind !== 'pending' && phase.kind !== 'recovering') return;
    let active = true;
    if (started.current?.phase !== phase) {
      let operation: Promise<FollowUpOwnershipPhase>;
      if (phase.kind === 'recovering') {
        operation = Promise.resolve(recheckOwned()).then(() => ({
          kind: 'idle' as const,
        }));
      } else if (phase.operation === 'handover') {
        const handle = handOver(phase.command);
        request.current = handle;
        operation = handle.then((result): FollowUpOwnershipPhase =>
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
        operation = handle.then((result): FollowUpOwnershipPhase =>
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
  }, [phase, handOver, complete, recheckOwned, reset]);

  const submit = (intent: FollowUpOwnershipIntent) =>
    setPhase(
      intent.operation === 'handover'
        ? { kind: 'pending', operation: 'handover', command: intent.command }
        : { kind: 'pending', operation: 'completion', command: intent.command },
    );
  return {
    phase,
    submit,
    replay: () => {
      if (phase.kind === 'failure') submit(phase);
    },
    recover: () => {
      if (phase.kind !== 'idle')
        setPhase({ kind: 'recovering', operation: phase.operation });
    },
    dismiss: () => {
      request.current?.abort();
      reset();
      started.current = undefined;
      setPhase({ kind: 'idle' });
    },
  };
}
