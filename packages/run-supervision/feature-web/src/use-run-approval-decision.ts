import {
  normalizeRunApprovalFailure,
  useDecideRunApprovalMutation,
  type RunApprovalCommand,
  type RunApprovalReceipt,
  type RunApprovalFailure,
} from '@ergon/run-supervision-data-access-web';
import { type RefObject } from 'react';
import { useConfirmedRunCommand } from './use-confirmed-run-command';

/** Confirmation/replay lifecycle only; RTK owns current requests and decisions, and the server owns authority. */
export function useRunApprovalDecision(options: {
  readonly heading: RefObject<HTMLHeadingElement | null>;
  readonly onSuccess: () => void;
}): ReturnType<
  typeof useConfirmedRunCommand<
    RunApprovalCommand,
    RunApprovalReceipt,
    RunApprovalFailure
  >
> {
  const [decide] = useDecideRunApprovalMutation();
  return useConfirmedRunCommand({
    send: decide,
    normalize: normalizeRunApprovalFailure,
    ...options,
  });
}
