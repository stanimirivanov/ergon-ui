import {
  useChangeRunControlMutation,
  useRunControlRead,
  normalizeRunSupervisionFailure,
  type AssignedRunRead,
  type FencedRunCommand,
  type RunControlFence,
  type RunControlQuery,
  type RunControlView,
  type RunControlCommand,
  type RunControlReceipt,
  type RunSupervisionFailure,
} from '@ergon/run-supervision-data-access-web';
import { useEffect, useState, type RefObject } from 'react';
import { useConfirmedRunCommand } from './use-confirmed-run-command';

/** Lifecycle commands share the committed private-disclosure barrier; retry retains exact UUID/action/fence. */
export function useRunControlCommands(options: {
  readonly heading: RefObject<HTMLHeadingElement | null>;
  readonly onSuccess: () => void;
}): ReturnType<
  typeof useConfirmedRunCommand<
    RunControlCommand,
    RunControlReceipt,
    RunSupervisionFailure
  >
> {
  const [send] = useChangeRunControlMutation();
  return useConfirmedRunCommand({
    send,
    normalize: normalizeRunSupervisionFailure,
    ...options,
  });
}

export interface RunControlAvailability {
  readonly read: AssignedRunRead<RunControlView>;
  readonly deadline: number | null;
  readonly canCommand: boolean;
  /** Capture current coordinates once; never use this to rewrite an uncertain command. */
  readonly bind: <C extends FencedRunCommand>(command: C) => C | undefined;
}

/** Timer estimates from server observation plus monotonic elapsed time, not workstation UTC. No polling, acquisition or renewal is implicit. */
export function useRunControlAvailability(
  query: RunControlQuery | null,
): RunControlAvailability {
  const read = useRunControlRead(query);
  const data = read.phase === 'ready' ? read.data : undefined;
  const [, notifyExpiry] = useState(0);
  const deadline =
    data !== undefined && 'expiresAt' in data
      ? data.receivedAtMonotonic +
        Date.parse(data.expiresAt) -
        Date.parse(data.observedAt)
      : null;
  useEffect(() => {
    if (deadline === null) return;
    // Only the expiry transition affects the workspace. Per-second display ticks stay in the presence panel.
    // Fractional milliseconds must not notify before the exclusive expiry.
    const timer = setTimeout(
      () => notifyExpiry((n) => n + 1),
      Math.ceil(Math.max(0, deadline - performance.now())),
    );
    return () => clearTimeout(timer);
  }, [deadline]);
  const remainingMs =
    deadline === null ? 0 : Math.max(0, deadline - performance.now());
  const canCommand =
    data?.status === 'DISABLED' ||
    (data?.status === 'THIS_SESSION' && remainingMs > 0);
  function bind<C extends FencedRunCommand>(command: C): C | undefined {
    if (data?.status === 'DISABLED') return command;
    // Re-evaluate elapsed time in the event handler; a delayed paint never grants extra time.
    if (
      data?.status !== 'THIS_SESSION' ||
      deadline === null ||
      performance.now() >= deadline
    )
      return undefined;
    const control: RunControlFence = {
      leaseId: data.fence.leaseId,
      revision: data.fence.revision,
    };
    return { ...command, control };
  }
  return { read, deadline, canCommand, bind };
}
