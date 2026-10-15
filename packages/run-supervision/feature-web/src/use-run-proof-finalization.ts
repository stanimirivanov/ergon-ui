import {
  normalizeRunProofFinalizationFailure,
  useFinalizeRunProofMutation,
  type RunProofFinalizationCommand,
  type RunProofFinalizationReceipt,
  type RunProofFinalizationFailure,
} from '@ergon/run-supervision-data-access-web';
import type { RefObject } from 'react';
import { useConfirmedRunCommand } from './use-confirmed-run-command';

/** Exact intent and historical feedback only; current proof remains RTK-owned behind fresh disclosure gates. */
export function useRunProofFinalization(options: {
  readonly heading: RefObject<HTMLHeadingElement | null>;
  readonly onSuccess: () => void;
}): ReturnType<
  typeof useConfirmedRunCommand<
    RunProofFinalizationCommand,
    RunProofFinalizationReceipt,
    RunProofFinalizationFailure
  >
> {
  const [finalizeProof] = useFinalizeRunProofMutation();
  return useConfirmedRunCommand({
    send: finalizeProof,
    normalize: normalizeRunProofFinalizationFailure,
    ...options,
  });
}
