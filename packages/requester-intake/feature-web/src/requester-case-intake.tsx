import { useRef, type ReactElement, type ReactNode } from 'react';
import { IntakeForm } from './intake-form';
import { IntakeFeedback } from './intake-feedback';
import { intakeRecovery } from './intake-recovery';
import { useIntakeSubmission } from './use-intake-submission';
interface IntakeProps {
  readonly tenantId: string;
  readonly signInHref: string;
  /** App-owned navigation slot must link to an independently session-gated case route. */
  readonly caseLink: (caseId: string) => ReactNode;
}
/** Caller supplies a verified tenant and trusted same-origin links. Tenant replacement retires draft, validation, mutation observation and replay; acknowledgement is never current progress. */
export function RequesterCaseIntake(props: IntakeProps): ReactElement {
  return <IntakeWorkspace key={props.tenantId} {...props} />;
}
function IntakeWorkspace({
  tenantId,
  signInHref,
  caseLink,
}: IntakeProps): ReactElement {
  const heading = useRef<HTMLHeadingElement>(null);
  const { phase, submit, replay } = useIntakeSubmission();
  const rejected =
    phase.kind === 'failure' &&
    intakeRecovery(phase.failure, phase.mode).canCorrect;
  return (
    <section className="grid min-w-0 gap-6">
      <header className="grid gap-3">
        <p className="text-xs font-bold tracking-widest text-accent uppercase">
          Your request
        </p>
        <h1
          ref={heading}
          tabIndex={-1}
          className="text-3xl font-black tracking-tight lg:text-4xl"
        >
          Start a request
        </h1>
        <p>
          Create a privately owned case from the outcome you need and what you
          observed. There is no automatic run, upload or approval.
        </p>
      </header>
      <IntakeFeedback
        phase={phase}
        signInHref={signInHref}
        caseLink={caseLink}
        onReplay={() => {
          heading.current?.focus();
          replay();
        }}
      />
      {phase.kind === 'idle' || rejected ? (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
          <IntakeForm
            {...(rejected && phase.kind === 'failure'
              ? { initial: phase.command, rejected: true }
              : {})}
            onSubmit={(input) => {
              heading.current?.focus();
              submit({
                tenantId,
                caseId: globalThis.crypto.randomUUID(),
                goal: input.goal,
                initialObservation: input.initialObservation,
              });
            }}
          />
          <aside
            aria-label="Before you create a request"
            className="grid content-start gap-4 rounded-lg border border-border bg-surface p-5"
          >
            <h2 className="text-xl font-bold">What happens next</h2>
            <p>
              The server binds a new case to your verified identity. A tenant
              link or an approval role does not give access to someone else's
              case.
            </p>
            <h3 className="font-bold">If the response is uncertain</h3>
            <p>
              Keep this page open. Retry only the exact original request; do not
              create a replacement UUID or change its text.
            </p>
            <h3 className="font-bold">Check independently</h3>
            <p>
              An acknowledgement describes the original opening, not current
              work. Follow the progress link only after acknowledgement to make
              fresh protected reads.
            </p>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
