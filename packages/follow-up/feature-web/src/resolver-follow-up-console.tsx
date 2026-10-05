import type { ResolverOwnedHumanFollowUpWork } from '@ergon/follow-up-model';
import { Button } from '@ergon/ui-web';
import { useEffect, useRef, type ReactElement } from 'react';

import { ResolverFollowUpCaseSummary } from './resolver-follow-up-case-summary';

/** Frames one locally selected, server-owned follow-up without creating a case route. */
export function ResolverFollowUpConsole({
  tenantId,
  signInHref,
  item,
  onBack,
}: {
  readonly tenantId: string;
  readonly signInHref: string;
  readonly item: ResolverOwnedHumanFollowUpWork;
  readonly onBack: () => void;
}): ReactElement {
  const regionId = `case-context-${item.workItem.workItemId}`;
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="flex min-h-16 flex-wrap items-center gap-x-6 gap-y-3 border-b border-border bg-surface px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3 border-r border-border pr-6">
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-md border border-accent font-bold text-accent-strong"
          >
            E
          </span>
          <span className="text-lg font-extrabold tracking-tight">Ergon</span>
        </div>
        <h1
          ref={heading}
          tabIndex={-1}
          className="min-w-0 flex-1 text-xl font-bold tracking-tight sm:text-2xl"
        >
          Resolver Console
        </h1>
        <span className="rounded-md border border-highlight/60 bg-highlight/10 px-3 py-1 text-xs font-bold tracking-wide text-highlight uppercase">
          Escalated · claimed
        </span>
        <Button
          type="button"
          variant="quiet"
          size="compact"
          className="rounded-md"
          onClick={onBack}
        >
          Back to active work
        </Button>
      </header>

      <div className="px-3 pb-6 sm:px-4 lg:px-5">
        <ResolverFollowUpCaseSummary
          tenantId={tenantId}
          signInHref={signInHref}
          workItemId={item.workItem.workItemId}
          caseId={item.workItem.caseId}
          runId={item.workItem.runId}
          regionId={regionId}
        />
      </div>
    </div>
  );
}
