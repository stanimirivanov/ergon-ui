import {
  useCallback,
  useLayoutEffect,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react';

import { ResolverOwnedHumanFollowUpsPage } from './resolver-owned-human-follow-ups-page';
import { ResolverFollowUpPresence } from './resolver-follow-up-presence';
import { ResolverFollowUpToolbar } from './resolver-follow-up-toolbar';
import { useOwnedFollowUpWorkflow } from './use-owned-follow-up-workflow';
import { useFollowUpHandover } from './use-follow-up-handover';
import { ConfirmedFollowUpHandover } from './confirmed-follow-up-handover';
import { FollowUpHandoverFeedback } from './follow-up-handover-feedback';

/** Inputs supplied by the route-level composition boundary. */
export interface ResolverOwnedHumanFollowUpsProps {
  /** Request context only; the BFF remains authoritative for ownership. */
  readonly tenantId: string;
  /** Trusted same-origin navigation target supplied by the composition root. */
  readonly signInHref: string;
  /** Opaque session-owned display, not claim authority. */
  readonly consoleActorDetails: ReactNode;
  /** Composes current toolbar/content without mirrored mode; the app owns global entry focus. */
  readonly renderWorkspace?: (view: {
    readonly isConsoleOpen: boolean;
    readonly statusLabel: string;
    readonly toolbar?: ReactNode;
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
  const handover = useFollowUpHandover(workflow.ownedWork.refetch);
  const isHandoverActive = handover.phase.kind !== 'idle';
  const isConsoleOpen = workflow.isConsoleOpen || isHandoverActive;
  const activeWorkHeading = useRef<HTMLHeadingElement>(null);
  const consoleBack = useRef<HTMLButtonElement>(null);
  const focusConsoleBack = useCallback(() => consoleBack.current?.focus(), []);
  const focusActiveWorkHeading = useCallback(
    () => activeWorkHeading.current?.focus(),
    [],
  );
  const wasHandingOver = useRef(false);
  useLayoutEffect(() => {
    if (isHandoverActive && !wasHandingOver.current) focusConsoleBack();
    else if (!isHandoverActive && wasHandingOver.current)
      focusActiveWorkHeading();
    wasHandingOver.current = isHandoverActive;
  }, [isHandoverActive, focusConsoleBack, focusActiveWorkHeading]);
  const gatedSelection = isHandoverActive
    ? undefined
    : workflow.currentSelection;
  const toolbar = isConsoleOpen ? (
    <ResolverFollowUpToolbar
      backRef={consoleBack}
      onBack={() => {
        handover.dismiss();
        workflow.close();
      }}
      onRecheckOwnership={workflow.recheck}
      {...(gatedSelection === undefined
        ? {}
        : {
            renderPresence: (onRecheckOwnership: () => void) => (
              <ResolverFollowUpPresence
                actorDetails={consoleActorDetails}
                item={gatedSelection}
                isReleasePending={workflow.isReleasePending}
                onRecheckOwnership={onRecheckOwnership}
                onConfirmRelease={() =>
                  workflow.releaseFromConsole(gatedSelection)
                }
                handoverAction={
                  <ConfirmedFollowUpHandover
                    tenantId={tenantId}
                    item={gatedSelection}
                    onConfirm={(command) => {
                      workflow.close();
                      handover.submit(command);
                    }}
                  />
                }
              />
            ),
          })}
    />
  ) : undefined;
  const statusLabel = isHandoverActive
    ? 'Handover · context withheld'
    : !isConsoleOpen
      ? 'Human follow-ups'
      : gatedSelection !== undefined
        ? 'Escalated · claimed'
        : workflow.ownedWork.isError
          ? 'Claim check unavailable'
          : 'Checking current claim';

  const content = (
    <section
      aria-labelledby={isConsoleOpen ? undefined : 'owned-work-heading'}
      aria-label={isConsoleOpen ? 'Resolver Console' : undefined}
      className={
        isConsoleOpen
          ? 'flex min-h-0 min-w-0 flex-1 flex-col'
          : 'min-w-0 rounded-md border border-accent/40 bg-surface p-4 sm:p-5'
      }
    >
      {!isConsoleOpen ? (
        <div className="border-b border-border pb-4">
          <p className="text-sm font-bold tracking-[0.18em] text-accent-strong uppercase">
            Your active work
          </p>
          <h2
            ref={activeWorkHeading}
            id="owned-work-heading"
            tabIndex={-1}
            className="mt-2 font-sans text-2xl font-bold tracking-tight text-ink"
          >
            Claimed follow-ups
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
            Recover work you already own after navigation or reload. Current
            resolver authority is checked again whenever this list is requested.
          </p>
        </div>
      ) : null}
      {handover.phase.kind !== 'idle' ? (
        <FollowUpHandoverFeedback
          phase={handover.phase}
          signInHref={signInHref}
          onReplay={(command) => {
            focusConsoleBack();
            handover.submit(command);
          }}
          onRecover={() => {
            focusConsoleBack();
            handover.recover();
          }}
        />
      ) : (
        <ResolverOwnedHumanFollowUpsPage
          tenantId={tenantId}
          signInHref={signInHref}
          workflow={workflow}
          onMissingReturnFocus={focusActiveWorkHeading}
          onBeforeConsoleRetry={focusConsoleBack}
        />
      )}
    </section>
  );
  return (
    renderWorkspace?.({
      isConsoleOpen,
      statusLabel,
      ...(toolbar === undefined ? {} : { toolbar }),
      content,
    }) ?? (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        {toolbar}
        {content}
      </div>
    )
  );
}
