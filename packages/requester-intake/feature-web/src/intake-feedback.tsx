import type { ReactElement, ReactNode } from 'react';
import { Button } from '@ergon/ui-web';
import type { IntakePhase } from './use-intake-submission';
import { intakeRecovery } from './intake-recovery';
export function IntakeFeedback({
  phase,
  signInHref,
  caseLink,
  onReplay,
}: {
  readonly phase: IntakePhase;
  readonly signInHref: string;
  readonly caseLink: (caseId: string) => ReactNode;
  readonly onReplay: () => void;
}): ReactElement {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={phase.kind === 'idle' ? 'sr-only' : undefined}
    >
      {phase.kind === 'pending' ? (
        <p role="status">
          Creating the case… Input is hidden. Leaving cannot undo a write.
        </p>
      ) : null}
      {phase.kind === 'recorded' ? (
        <section
          aria-label="Intake acknowledged"
          className="grid gap-4 rounded-lg border border-border bg-surface p-5"
        >
          <h2 className="text-xl font-bold">Intake acknowledged</h2>
          <p>
            The original opening was acknowledged. This is not current case
            status, an active run or verified resolution.
          </p>
          {caseLink(phase.caseId)}
          <p className="text-sm text-ink-muted">
            Opening this link starts independent session, progress and
            question-history checks. No receipt is used as current data.
          </p>
        </section>
      ) : null}
      {phase.kind === 'failure' ? (
        <section
          aria-label="Intake result"
          className="grid gap-4 rounded-lg border border-border bg-surface p-5"
        >
          <h2 className="text-xl font-bold">Intake result</h2>
          <p>{intakeRecovery(phase.failure, phase.mode).message}</p>
          {intakeRecovery(phase.failure, phase.mode).replay ? (
            <Button onClick={onReplay}>Retry exact request</Button>
          ) : null}
          {phase.failure.kind === 'authentication-required' ? (
            <a className="font-bold underline" href={signInHref}>
              Sign in to Ergon
            </a>
          ) : null}
          <p className="text-sm text-ink-muted">
            A lost acknowledgement does not prove no case was created. Recovery
            keeps the original UUID and input only until you leave this page.
          </p>
        </section>
      ) : null}
    </div>
  );
}
