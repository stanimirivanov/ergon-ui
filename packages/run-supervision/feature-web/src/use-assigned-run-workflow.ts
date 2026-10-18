import {
  useAssignedRunDiscovery,
  useAssignedRunDisclosure,
  type AssignedRunConsole,
  type AssignedRunCursor,
  type AssignedRunPage,
  type AssignedRunRead,
  type RunRetryReceipt,
} from '@ergon/run-supervision-data-access-web';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { useRunSupervisorHandover } from './use-run-supervisor-handover';
import { useRunApprovalDecision } from './use-run-approval-decision';
import { useRunProofFinalization } from './use-run-proof-finalization';
import { useRunCapabilityExecution } from './use-run-capability-execution';
import { useRunRetry } from './use-run-retry';
import { useRunEscalation } from './use-run-escalation';
import { useRunCancellation } from './use-run-cancellation';

export interface AssignedRunWorkflow {
  readonly cancellation: ReturnType<typeof useRunCancellation>;
  readonly recoverCancellation: () => void;
  readonly escalation: ReturnType<typeof useRunEscalation>;
  readonly recoverEscalation: () => void;
  readonly retryRun: ReturnType<typeof useRunRetry>;
  readonly recoverRetry: () => void;
  readonly execution: ReturnType<typeof useRunCapabilityExecution>;
  readonly recoverExecution: () => void;
  readonly proofFinalization: ReturnType<typeof useRunProofFinalization>;
  readonly recoverProofFinalization: () => void;
  readonly approval: ReturnType<typeof useRunApprovalDecision>;
  readonly recoverApproval: () => void;
  readonly isBlockingDisclosure: boolean;
  readonly handover: ReturnType<typeof useRunSupervisorHandover>;
  readonly recoverHandover: () => void;
  readonly selectedRunId: string | null;
  readonly canReturnToAttempt: boolean;
  readonly inspectPredecessor: () => void;
  readonly returnToAttempt: () => void;
  readonly assigned: AssignedRunRead<AssignedRunPage>;
  readonly detail: AssignedRunRead<AssignedRunConsole>;
  readonly hasPrevious: boolean;
  readonly heading: RefObject<HTMLHeadingElement | null>;
  readonly selectRun: (runId: string) => void;
  readonly closeRun: () => void;
  readonly resetTraversal: () => void;
  readonly previousPage: () => void;
  readonly nextPage: () => void;
}

/**
 * Owns local selection, paired cursor traversal and heading-focus intent for one
 * mounted tenant workspace. RTK-owned projections remain behind data-access
 * gates. Discovery revalidation retires disclosure before I/O; successful
 * discovery permits a fresh exact read even when a terminal run left its list.
 * Predecessor inspection retains one return identity, not a history stack or
 * resource copy. Related selection and return use that same fresh disclosure
 * gate; ordinary selection, close, reset and tenant replacement discard it.
 */
export function useAssignedRunWorkflow(tenantId: string): AssignedRunWorkflow {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  // A return target is navigation intent, never a retained Console or proof of
  // access. It survives a denied predecessor read but not ordinary selection.
  const [returnRunId, setReturnRunId] = useState<string | null>(null);
  const [cursors, setCursors] = useState<readonly AssignedRunCursor[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const afterHandover = useCallback(() => {
    setReturnRunId(null);
    setSelectedRunId(null);
    setCursors([]);
  }, []);
  const handover = useRunSupervisorHandover({
    heading,
    onSuccess: afterHandover,
  });
  const approval = useRunApprovalDecision({
    heading,
    onSuccess: afterHandover,
  });
  // Retain selection, not proof data: reopening both gates must fetch the
  // terminal record even after it disappears from active discovery.
  const afterProofFinalization = useCallback(() => setCursors([]), []);
  const proofFinalization = useRunProofFinalization({
    heading,
    onSuccess: afterProofFinalization,
  });
  const execution = useRunCapabilityExecution({
    heading,
    onSuccess: afterProofFinalization,
  });
  const afterRetry = useCallback((receipt: RunRetryReceipt) => {
    setReturnRunId(null);
    // Select only historical identity, never successor data or access. Both
    // RTK gates reopen freshly, including when discovery no longer lists it.
    setSelectedRunId(receipt.successorRunId);
    setCursors([]);
  }, []);
  const retryRun = useRunRetry({ heading, onSuccess: afterRetry });
  // Keep only the selected run identity; fresh reads must recover terminal
  // detail independently even after it leaves active assignment discovery.
  const escalation = useRunEscalation({
    heading,
    onSuccess: afterProofFinalization,
  });
  const cancellation = useRunCancellation({
    heading,
    onSuccess: afterProofFinalization,
  });
  const isBlockingDisclosure =
    cancellation.isBlockingDisclosure ||
    escalation.isBlockingDisclosure ||
    retryRun.isBlockingDisclosure ||
    handover.isBlockingDisclosure ||
    approval.isBlockingDisclosure ||
    proofFinalization.isBlockingDisclosure ||
    execution.isBlockingDisclosure;
  const cursor = cursors.at(-1);
  const assigned = useAssignedRunDiscovery(
    isBlockingDisclosure
      ? null
      : {
          tenantId,
          ...(cursor === undefined ? {} : { cursor }),
        },
  );
  const detail = useAssignedRunDisclosure(
    selectedRunId !== null &&
      assigned.phase === 'ready' &&
      !isBlockingDisclosure
      ? { tenantId, runId: selectedRunId }
      : null,
  );

  useEffect(() => {
    if (selectedRunId === null || detail.phase === 'ready') {
      heading.current?.focus();
    }
  }, [selectedRunId, detail.phase]);

  function selectRun(runId: string | null): void {
    heading.current?.focus();
    cancellation.clear();
    escalation.clear();
    retryRun.clear();
    execution.clear();
    proofFinalization.clear();
    approval.clear();
    handover.clear();
    setReturnRunId(null);
    setSelectedRunId(runId);
  }

  return {
    cancellation: {
      ...cancellation,
      submit: (intent) => {
        escalation.clear();
        retryRun.clear();
        execution.clear();
        proofFinalization.clear();
        approval.clear();
        handover.clear();
        cancellation.submit(intent);
      },
    },
    recoverCancellation: () => {
      heading.current?.focus();
      cancellation.clear();
      detail.recheck();
    },
    escalation: {
      ...escalation,
      submit: (intent) => {
        cancellation.clear();
        retryRun.clear();
        execution.clear();
        proofFinalization.clear();
        approval.clear();
        handover.clear();
        escalation.submit(intent);
      },
    },
    recoverEscalation: () => {
      heading.current?.focus();
      escalation.clear();
      detail.recheck();
    },
    retryRun: {
      ...retryRun,
      submit: (intent) => {
        cancellation.clear();
        escalation.clear();
        execution.clear();
        proofFinalization.clear();
        approval.clear();
        handover.clear();
        retryRun.submit(intent);
      },
    },
    recoverRetry: () => {
      heading.current?.focus();
      retryRun.clear();
      detail.recheck();
    },
    execution: {
      ...execution,
      submit: (intent) => {
        cancellation.clear();
        escalation.clear();
        retryRun.clear();
        handover.clear();
        approval.clear();
        proofFinalization.clear();
        execution.submit(intent);
      },
    },
    recoverExecution: () => {
      heading.current?.focus();
      execution.clear();
      detail.recheck();
    },
    proofFinalization: {
      ...proofFinalization,
      submit: (intent) => {
        cancellation.clear();
        escalation.clear();
        retryRun.clear();
        execution.clear();
        approval.clear();
        handover.clear();
        proofFinalization.submit(intent);
      },
    },
    recoverProofFinalization: () => {
      heading.current?.focus();
      proofFinalization.clear();
      detail.recheck();
    },
    approval: {
      ...approval,
      submit: (intent) => {
        cancellation.clear();
        escalation.clear();
        retryRun.clear();
        execution.clear();
        proofFinalization.clear();
        handover.clear();
        approval.submit(intent);
      },
    },
    isBlockingDisclosure,
    recoverApproval: () => {
      heading.current?.focus();
      approval.clear();
      detail.recheck();
    },
    handover: {
      ...handover,
      submit: (intent) => {
        cancellation.clear();
        escalation.clear();
        retryRun.clear();
        execution.clear();
        proofFinalization.clear();
        approval.clear();
        handover.submit(intent);
      },
    },
    recoverHandover: () => {
      heading.current?.focus();
      handover.clear();
      detail.recheck();
    },
    selectedRunId,
    canReturnToAttempt: returnRunId !== null && !isBlockingDisclosure,
    inspectPredecessor: () => {
      if (detail.phase !== 'ready' || detail.data.predecessorRunId === null)
        return;
      const origin = detail.data.runId;
      selectRun(detail.data.predecessorRunId);
      setReturnRunId(origin);
    },
    returnToAttempt: () => {
      if (returnRunId !== null && !isBlockingDisclosure) selectRun(returnRunId);
    },
    assigned,
    detail,
    heading,
    hasPrevious: cursors.length > 0,
    selectRun,
    closeRun: () => selectRun(null),
    resetTraversal: () => {
      selectRun(null);
      // Recheck is required even when an invalid first-page request leaves the
      // cursor unchanged; the gate closes in this same committed render.
      setCursors([]);
      assigned.recheck();
    },
    previousPage: () => setCursors((previous) => previous.slice(0, -1)),
    nextPage: () => {
      if (assigned.phase !== 'ready' || assigned.data.nextCursor === null)
        return;
      const next = assigned.data.nextCursor;
      setCursors((previous) => [...previous, next]);
    },
  };
}
