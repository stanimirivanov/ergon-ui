import type { RunSupervisionFailure } from '@ergon/run-supervision-data-access-web';
import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Latches failed inspection as a workspace disclosure barrier after its modal
 * retires. This is recovery intent/feedback, not a second history resource.
 * Only explicit recovery or selection clears it; fresh RTK gates then reacquire
 * discovery and exact-run authority. Late retired reads cannot invoke it.
 */
export function useRunHistoryAccess(
  heading: RefObject<HTMLHeadingElement | null>,
): {
  readonly error: RunSupervisionFailure | null;
  readonly rejectRead: (error: RunSupervisionFailure) => void;
  readonly clear: () => void;
} {
  const [error, setError] = useState<RunSupervisionFailure | null>(null);
  const rejectRead = useCallback(
    (failure: RunSupervisionFailure): void => setError(failure),
    [],
  );
  const clear = useCallback((): void => setError(null), []);
  useLayoutEffect(() => {
    if (error !== null) heading.current?.focus();
  }, [error, heading]);
  return { error, rejectRead, clear };
}
