import type { RunSupervisionFailure } from '@ergon/run-supervision-data-access-web';
import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Latches failed protected inspection as a workspace disclosure barrier after
 * its control retires. This is recovery feedback, not a second resource cache.
 * Only explicit recovery or selection clears it; fresh RTK gates then reacquire
 * discovery and exact-run authority. Late retired reads cannot invoke it.
 */
export function useRunInspectionAccess(
  heading: RefObject<HTMLHeadingElement | null>,
): {
  readonly failure: RunInspectionFailure | null;
  readonly rejectHistoryRead: (error: RunSupervisionFailure) => void;
  readonly rejectSuccessorRead: (error: RunSupervisionFailure) => void;
  readonly rejectInvocationRead: (error: RunSupervisionFailure) => void;
  readonly rejectContractRead: (error: RunSupervisionFailure) => void;
  readonly clear: () => void;
} {
  const [failure, setFailure] = useState<RunInspectionFailure | null>(null);
  const rejectHistoryRead = useCallback(
    (error: RunSupervisionFailure): void =>
      setFailure({ resource: 'history', error }),
    [],
  );
  const rejectSuccessorRead = useCallback(
    (error: RunSupervisionFailure): void =>
      setFailure({ resource: 'successor', error }),
    [],
  );
  const clear = useCallback((): void => setFailure(null), []);
  const rejectContractRead = useCallback(
    (error: RunSupervisionFailure): void =>
      setFailure({ resource: 'contract', error }),
    [],
  );
  const rejectInvocationRead = useCallback(
    (error: RunSupervisionFailure): void =>
      setFailure({ resource: 'invocation', error }),
    [],
  );
  useLayoutEffect(() => {
    if (failure !== null) heading.current?.focus();
  }, [failure, heading]);
  return {
    failure,
    rejectHistoryRead,
    rejectSuccessorRead,
    rejectInvocationRead,
    rejectContractRead,
    clear,
  };
}

export interface RunInspectionFailure {
  readonly resource: 'history' | 'successor' | 'invocation' | 'contract';
  readonly error: RunSupervisionFailure;
}
