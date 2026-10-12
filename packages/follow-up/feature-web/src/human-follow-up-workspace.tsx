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
                  : 'mx-auto w-full max-w-6xl px-6 py-16 lg:px-10 lg:py-20'
              }
            >
              {isConsoleOpen ? null : (
                <>
                  <p className="text-sm font-bold tracking-[0.18em] text-accent-strong uppercase">
                    Resolver workbench
                  </p>
                  <h1 className="mt-5 font-display text-5xl tracking-[-0.035em] text-ink sm:text-6xl">
                    Human follow-up inbox
                  </h1>
                  <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-muted">
                    Review the oldest unclaimed work that is visible under your
                    current tenant authority.
                  </p>
                  {actorDetails}
                </>
              )}
              {content}
              <HumanFollowUpInbox
                tenantId={tenantId}
                signInHref={signInHref}
                isActive={!isConsoleOpen}
              />
            </section>
          ),
        })
      }
    />
  );
}
