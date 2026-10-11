import { useCallback, useRef, type ReactElement, type ReactNode } from 'react';

import { ResolverOwnedHumanFollowUpsPage } from './resolver-owned-human-follow-ups-page';
import { useOwnedFollowUpWorkflow } from './use-owned-follow-up-workflow';

/** Inputs supplied by the route-level composition boundary. */
export interface ResolverOwnedHumanFollowUpsProps {
  /** Request context only; the BFF remains authoritative for ownership. */
  readonly tenantId: string;
  /** Trusted same-origin navigation target supplied by the composition root. */
  readonly signInHref: string;
  /** Opaque session-owned display, not claim authority. */
  readonly consoleActorDetails: ReactNode;
  /** Composes surroundings from the workflow's current mode without mirrored state. */
  readonly renderWorkspace?: (view: {
    readonly isConsoleOpen: boolean;
    readonly content: ReactElement;
  }) => ReactElement;
}

/** Keeps selected claim identity local; no private case context enters the URL or persistent state. */
export function ResolverOwnedHumanFollowUps(
  props: ResolverOwnedHumanFollowUpsProps,
): ReactElement {
  // A tenant replacement must not first render the previous tenant's selection,
  // cursor, pending replay, or focus intent and then reset them in an effect.
  return <OwnedFollowUpSurface key={props.tenantId} {...props} />;
}

function OwnedFollowUpSurface({
  tenantId,
  signInHref,
  consoleActorDetails,
  renderWorkspace,
}: ResolverOwnedHumanFollowUpsProps): ReactElement {
  const workflow = useOwnedFollowUpWorkflow(tenantId);
  const activeWorkHeading = useRef<HTMLHeadingElement>(null);
  const focusActiveWorkHeading = useCallback(
    () => activeWorkHeading.current?.focus(),
    [],
  );

  const content = (
    <section
      aria-labelledby={
        workflow.isConsoleOpen ? undefined : 'owned-work-heading'
      }
      aria-label={workflow.isConsoleOpen ? 'Resolver Console' : undefined}
      className={workflow.isConsoleOpen ? 'min-w-0' : 'mt-12'}
    >
      {!workflow.isConsoleOpen ? (
        <div className="border-b border-border pb-7">
          <p className="text-sm font-bold tracking-[0.18em] text-accent-strong uppercase">
            Your active work
          </p>
          <h2
            ref={activeWorkHeading}
            id="owned-work-heading"
            tabIndex={-1}
            className="mt-3 font-display text-3xl tracking-[-0.025em] text-ink sm:text-4xl"
          >
            Claimed follow-ups
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-ink-muted">
            Recover work you already own after navigation or reload. Current
            resolver authority is checked again whenever this list is requested.
          </p>
        </div>
      ) : null}
      <ResolverOwnedHumanFollowUpsPage
        tenantId={tenantId}
        signInHref={signInHref}
        consoleActorDetails={consoleActorDetails}
        workflow={workflow}
        onMissingReturnFocus={focusActiveWorkHeading}
      />
    </section>
  );
  return (
    renderWorkspace?.({ isConsoleOpen: workflow.isConsoleOpen, content }) ??
    content
  );
}
