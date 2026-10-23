import {
  followUpHandoverApi,
  normalizeFollowUpHandoverFailure,
  type FollowUpHandoverCommand,
  type FollowUpHandoverFailure,
} from '@ergon/follow-up-data-access-web';
import type { FollowUpHandover } from '@ergon/follow-up-model';
import { useCallback, useEffect, useRef, useState } from 'react';

export type FollowUpHandoverPhase =
  | { readonly kind: 'idle' }
  | { readonly kind: 'pending'; readonly command: FollowUpHandoverCommand }
  | {
      readonly kind: 'failure';
      readonly command: FollowUpHandoverCommand;
      readonly failure: FollowUpHandoverFailure;
    }
  | { readonly kind: 'success'; readonly receipt: FollowUpHandover }
  | { readonly kind: 'recovering' };

/**
 * Owns only committed command/recovery phases and immutable intent, not work
 * resources. The parent renders the withheld workspace before this effect runs.
 * StrictMode reattaches to an existing operation; it never repeats a POST.
 * Close/tenant replacement retires callbacks and local replay state. Aborting
 * transport never establishes that the server did not apply the transfer.
 */
export function useFollowUpHandover(recheckOwned: () => PromiseLike<unknown>): {
  readonly phase: FollowUpHandoverPhase;
  readonly submit: (command: FollowUpHandoverCommand) => void;
  readonly recover: () => void;
  readonly dismiss: () => void;
} {
  const [phase, setPhase] = useState<FollowUpHandoverPhase>({ kind: 'idle' });
  const [send] = followUpHandoverApi.useHandOverFollowUpMutation();
  const request = useRef<ReturnType<typeof send> | undefined>(undefined);
  // Reset the owned handle, not the mutation hook's render-dependent reset callback.
  const reset = useCallback(() => {
    request.current?.reset();
    request.current = undefined;
  }, []);
  const started = useRef<{
    readonly phase: FollowUpHandoverPhase;
    readonly operation: Promise<FollowUpHandoverPhase>;
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
      let operation: Promise<FollowUpHandoverPhase>;
      if (phase.kind === 'pending') {
        const handle = send(phase.command);
        request.current = handle;
        operation = handle.then((result): FollowUpHandoverPhase =>
          result.data === undefined
            ? {
                kind: 'failure',
                command: phase.command,
                failure: normalizeFollowUpHandoverFailure(result.error),
              }
            : { kind: 'success', receipt: result.data },
        );
      } else {
        operation = Promise.resolve(recheckOwned()).then(() => ({
          kind: 'idle' as const,
        }));
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
  }, [phase, send, recheckOwned, reset]);

  return {
    phase,
    submit: (command) => setPhase({ kind: 'pending', command }),
    recover: () => setPhase({ kind: 'recovering' }),
    dismiss: () => {
      request.current?.abort();
      reset();
      started.current = undefined;
      setPhase({ kind: 'idle' });
    },
  };
}
