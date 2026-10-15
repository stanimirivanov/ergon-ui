import {
  useAssignedRunDiscovery,
  useAssignedRunDisclosure,
  type AssignedRunConsole,
  type AssignedRunCursor,
  type AssignedRunPage,
  type AssignedRunRead,
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

interface AssignedRunWorkflow {
  readonly proofFinalization: ReturnType<typeof useRunProofFinalization>;
  readonly recoverProofFinalization: () => void;
  readonly approval: ReturnType<typeof useRunApprovalDecision>;
  readonly recoverApproval: () => void;
  readonly isBlockingDisclosure: boolean;
  readonly handover: ReturnType<typeof useRunSupervisorHandover>;
  readonly recoverHandover: () => void;
  readonly selectedRunId: string | null;
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
 */
export function useAssignedRunWorkflow(tenantId: string): AssignedRunWorkflow {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [cursors, setCursors] = useState<readonly AssignedRunCursor[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const afterHandover = useCallback(() => {
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
  const isBlockingDisclosure =
    handover.isBlockingDisclosure ||
    approval.isBlockingDisclosure ||
    proofFinalization.isBlockingDisclosure;
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

  return {
    proofFinalization,
    recoverProofFinalization: () => {
      heading.current?.focus();
      proofFinalization.clear();
      detail.recheck();
    },
    approval,
    isBlockingDisclosure,
    recoverApproval: () => {
      heading.current?.focus();
      approval.clear();
      detail.recheck();
    },
    handover,
    recoverHandover: () => {
      heading.current?.focus();
      handover.clear();
      detail.recheck();
    },
    selectedRunId,
    assigned,
    detail,
    heading,
    hasPrevious: cursors.length > 0,
    selectRun: (runId) => {
      proofFinalization.clear();
      approval.clear();
      handover.clear();
      setSelectedRunId(runId);
    },
    closeRun: () => {
      proofFinalization.clear();
      approval.clear();
      handover.clear();
      setSelectedRunId(null);
    },
    resetTraversal: () => {
      proofFinalization.clear();
      approval.clear();
      handover.clear();
      setSelectedRunId(null);
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
