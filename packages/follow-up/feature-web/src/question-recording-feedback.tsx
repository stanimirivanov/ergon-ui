import { Button } from '@ergon/ui-web';
import { useLayoutEffect, useRef, type ReactElement } from 'react';
import type { QuestionRecordingPhase } from './use-question-recording';
import { questionRecovery } from './follow-up-question-recovery';

export function QuestionRecordingFeedback({
  phase,
  onReplay,
}: {
  readonly phase: QuestionRecordingPhase;
  readonly onReplay: () => void;
}): ReactElement | null {
  const status = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    if (phase.kind !== 'idle') status.current?.focus();
  }, [phase]);
  if (
    phase.kind === 'idle' ||
    (phase.kind === 'failure' && phase.failure.kind === 'invalid-question')
  )
    return null;
  return (
    <section aria-label="Question recording result" className="space-y-3">
      <p ref={status} tabIndex={-1} role="status">
        {phase.kind === 'pending'
          ? 'Recording question… History is withheld. Closing cannot undo a server write.'
          : phase.kind === 'recorded'
            ? `Question recorded (${phase.requestId}). This acknowledgement is historical, not delivery or continuing access. History is checked again below.`
            : questionRecovery(phase.failure).message}
      </p>
      {phase.kind === 'failure' && questionRecovery(phase.failure).replay && (
        <>
          <Button type="button" onClick={onReplay}>
            Retry exact question
          </Button>
          <p className="text-sm text-ink-muted">
            Retry keeps the original request ID, claim, ownership revision and
            exact question text. There is no automatic retry.
          </p>
        </>
      )}
    </section>
  );
}
