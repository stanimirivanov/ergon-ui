import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';

export type ConfirmedRunCommandState<C, R, F> =
  | { readonly phase: 'idle' }
  | { readonly phase: 'submitting'; readonly command: C }
  | { readonly phase: 'failed'; readonly command: C; readonly error: F }
  | { readonly phase: 'succeeded'; readonly receipt: R };
type MutationRequest<R> = PromiseLike<{
  readonly data?: R | undefined;
  readonly error?: unknown;
}> & { readonly reset: () => void };

/**
 * Committed disclosure barrier shared by the two real Console mutations.
 * Caller withdraws private readers whenever isBlockingDisclosure is true.
 * After modal teardown, focus reaches the persistent heading before acquisition.
 * A microtask prevents abandoned StrictMode setup from sending a mutation;
 * cleanup retires callbacks/reset only, never promises server-side cancellation.
 * State retains exact user intent or historical feedback, not remote resources.
 */
export function useConfirmedRunCommand<C, R, F>({
  send,
  normalize,
  heading,
  onSuccess,
}: {
  readonly send: (command: C) => MutationRequest<R>;
  readonly normalize: (failure: unknown) => F;
  readonly heading: RefObject<HTMLHeadingElement | null>;
  readonly onSuccess: () => void;
}): {
  readonly state: ConfirmedRunCommandState<C, R, F>;
  readonly isBlockingDisclosure: boolean;
  readonly submit: (command: C) => void;
  readonly retry: () => void;
  readonly clear: () => void;
} {
  const [state, setState] = useState<ConfirmedRunCommandState<C, R, F>>({
    phase: 'idle',
  });
  useLayoutEffect(() => {
    if (state.phase === 'submitting') heading.current?.focus();
  }, [state, heading]);
  useEffect(() => {
    if (state.phase !== 'submitting') return;
    let active = true;
    let request: MutationRequest<R> | undefined;
    void Promise.resolve().then(async () => {
      if (!active) return;
      try {
        request = send(state.command);
        const result = await request;
        if (!active) return;
        if (result.data !== undefined) {
          setState({ phase: 'succeeded', receipt: result.data });
          onSuccess();
        } else
          setState({
            phase: 'failed',
            command: state.command,
            error: normalize(result.error),
          });
      } catch {
        if (active)
          setState({
            phase: 'failed',
            command: state.command,
            error: normalize({ kind: 'unexpected-defect' }),
          });
      }
    });
    return () => {
      active = false;
      request?.reset();
    };
  }, [state, send, normalize, onSuccess]);
  return {
    state,
    isBlockingDisclosure:
      state.phase === 'submitting' || state.phase === 'failed',
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
