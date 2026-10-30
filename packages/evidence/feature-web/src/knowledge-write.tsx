import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type ReactElement,
} from 'react';
import { flushSync } from 'react-dom';
import {
  evidenceApi,
  normalizeEvidenceFailure,
  type EvidenceFailure,
} from '@ergon/evidence-data-access-web';
import type {
  AdjudicationIntent,
  BundleIntent,
  KnowledgeTarget,
} from '@ergon/evidence-model';
import { Failure } from './evidence-workspace';
export const actionClass =
  'rounded-md border border-border px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4';
export type KnowledgeIntent =
  | { readonly kind: 'adjudication'; readonly command: AdjudicationIntent }
  | { readonly kind: 'bundle'; readonly command: BundleIntent };
type Phase =
  | { readonly kind: 'idle' }
  | { readonly kind: 'writing'; readonly intent: KnowledgeIntent }
  | { readonly kind: 'uncertain'; readonly intent: KnowledgeIntent }
  | { readonly kind: 'failed'; readonly error: EvidenceFailure };
interface KnowledgeWriteController {
  readonly phase: Phase;
  readonly perform: (intent: KnowledgeIntent) => Promise<void>;
  readonly heading: RefObject<HTMLHeadingElement | null>;
}
/** One mounted write lifetime. Exact intent outlives uncertain I/O, never the disclosure scope. */
export function useKnowledgeWrite({
  send,
  onOpen,
}: {
  readonly send: (intent: KnowledgeIntent) => PromiseLike<{
    data?: { readonly id: string } | undefined;
    error?: unknown;
  }> & {
    abort(): void;
  };
  readonly onOpen: (target: KnowledgeTarget) => void;
}): KnowledgeWriteController {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const alive = useRef(false),
    pending = useRef<{ abort(): void } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      pending.current?.abort();
    };
  }, []);
  async function perform(intent: KnowledgeIntent): Promise<void> {
    if (!alive.current) return;
    // Withdraw quoted content and unsubscribe the read before even synchronous transport can start.
    flushSync(() => setPhase({ kind: 'writing', intent }));
    heading.current?.focus();
    const request = send(intent);
    pending.current = request;
    const result = await request;
    if (!alive.current) return;
    pending.current = null;
    if (result.data !== undefined) {
      onOpen({ kind: intent.kind, id: result.data.id });
      return;
    }
    const error = normalizeEvidenceFailure(result.error);
    setPhase(
      [
        'transport',
        'timeout',
        'invalid-response',
        'unavailable',
        'request-cancelled',
        'unexpected-defect',
      ].includes(error.kind)
        ? { kind: 'uncertain', intent }
        : { kind: 'failed', error },
    );
    heading.current?.focus();
  }
  return { phase, perform, heading };
}
export function KnowledgeOutcome({
  write,
  onRecheck,
  signInHref,
}: {
  readonly write: ReturnType<typeof useKnowledgeWrite>;
  readonly onRecheck: () => void;
  readonly signInHref: string;
}): ReactElement | null {
  const { phase } = write;
  if (phase.kind === 'idle') return null;
  return (
    <section className="space-y-4">
      <h2 ref={write.heading} tabIndex={-1} className="text-xl font-bold">
        Documentary command result
      </h2>
      {phase.kind === 'writing' ? (
        <p role="status">Recording exact documentary intent…</p>
      ) : phase.kind === 'uncertain' ? (
        <>
          <p role="alert">
            The result is uncertain. It may already have been recorded. Retry
            only this exact command or recheck current access.
          </p>
          <p className="break-all">Command: {phase.intent.command.id}</p>
          {phase.intent.kind === 'adjudication' ? (
            <>
              <p>
                {phase.intent.command.choice} ·{' '}
                {phase.intent.command.selectedClaimId}
              </p>
              <blockquote className="whitespace-pre-wrap break-words">
                {phase.intent.command.rationale}
              </blockquote>
            </>
          ) : (
            <p className="break-all">
              Selected claims:{' '}
              {phase.intent.command.claims.join(', ') || 'None'} · Procedures:{' '}
              {phase.intent.command.procedures.join(', ') || 'None'}
            </p>
          )}
          <button
            className={actionClass}
            onClick={() => void write.perform(phase.intent)}
          >
            Retry exact command
          </button>
        </>
      ) : (
        <Failure error={phase.error} signInHref={signInHref} />
      )}
      {phase.kind !== 'writing' && (
        <button className={actionClass} onClick={onRecheck}>
          Recheck documentary evidence
        </button>
      )}
    </section>
  );
}

export function useDocumentaryWrite(
  onOpen: (target: KnowledgeTarget) => void,
): KnowledgeWriteController {
  const [adjudicate] = evidenceApi.useAdjudicateMutation(),
    [publish] = evidenceApi.usePublishMutation();
  return useKnowledgeWrite({
    send: (i) =>
      i.kind === 'bundle' ? publish(i.command) : adjudicate(i.command),
    onOpen,
  });
}
/** RHF validation can finish after its form was retired, even while its parent remains mounted. */
export function useFormLifetime(): RefObject<boolean> {
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  return alive;
}
