import type { ReactElement, ReactNode } from 'react';
import type { WorkspaceRenderer } from '@ergon/ui-web';

import { HumanFollowUpInbox } from './human-follow-up-inbox';
import { ResolverOwnedHumanFollowUps } from './resolver-owned-human-follow-ups';

/** Inputs supplied only after the session feature verifies the actor. */
export interface HumanFollowUpWorkspaceProps {
  /** Navigation context only; the BFF remains authoritative for visibility. */
  readonly tenantId: string;
  readonly signInHref: string;
  /** Session-owned identity display; this feature does not inspect its value. */
  readonly actorDetails: ReactNode;
  /** Compact session identity for the Console; never used to decide authority. */
  readonly consoleActorDetails: ReactNode;
  /** App-owned chrome and viewport allocation; preserve one content subtree across modes. */
  readonly renderWorkspace: WorkspaceRenderer;
}

/**
 * Composes work views directly from the owned-work workflow's disclosure mode.
 * The inbox stays mounted but suspended during Console detours, retaining only
 * local traversal and claim replay intent rather than private Console detail.
 */
export function HumanFollowUpWorkspace({
  tenantId,
  signInHref,
  actorDetails,
  consoleActorDetails,
  renderWorkspace,
}: HumanFollowUpWorkspaceProps): ReactElement {
  return (
    <ResolverOwnedHumanFollowUps
      tenantId={tenantId}
      signInHref={signInHref}
      consoleActorDetails={consoleActorDetails}
      renderWorkspace={({ isConsoleOpen, statusLabel, toolbar, content }) =>
        renderWorkspace({
          mode: isConsoleOpen ? 'focused' : 'standard',
          statusLabel,
          ...(toolbar === undefined ? {} : { toolbar }),
          content: (
            <section
              className={
                isConsoleOpen
                  ? 'flex min-h-0 min-w-0 flex-1 flex-col'
                  : 'mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10'
              }
            >
              {isConsoleOpen ? null : (
                <>
                  <p className="text-sm font-bold tracking-[0.18em] text-accent-strong uppercase">
                    Resolver workbench
                  </p>
                  <h1 className="mt-3 font-sans text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                    Human follow-up inbox
                  </h1>
                  <p className="mt-3 max-w-3xl leading-6 text-ink-muted">
                    Resume your claimed work or claim a follow-up from the
                    shared queue. Each view is checked against your current
                    authority.
                  </p>
                  {actorDetails}
                </>
              )}
              <div
                className={
                  isConsoleOpen
                    ? 'flex min-h-0 min-w-0 flex-1 flex-col'
                    : 'mt-8 grid min-w-0 items-start gap-6 xl:grid-cols-2'
                }
              >
                <div
                  className={
                    isConsoleOpen
                      ? 'flex min-h-0 min-w-0 flex-1 flex-col'
                      : 'min-w-0'
                  }
                >
                  {content}
                </div>
                <HumanFollowUpInbox
                  tenantId={tenantId}
                  signInHref={signInHref}
                  isActive={!isConsoleOpen}
                />
              </div>
            </section>
          ),
        })
      }
    />
  );
}
