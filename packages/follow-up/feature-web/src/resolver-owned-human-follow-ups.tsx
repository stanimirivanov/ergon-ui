import type { ResolverOwnedHumanFollowUpWork } from '@ergon/follow-up-model';
import {
  useCallback,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import { ResolverOwnedHumanFollowUpsPage } from './resolver-owned-human-follow-ups-page';

/** Inputs supplied by the route-level composition boundary. */
export interface ResolverOwnedHumanFollowUpsProps {
  /** Request context only; the BFF remains authoritative for ownership. */
  readonly tenantId: string;
  /** Trusted same-origin navigation target supplied by the composition root. */
  readonly signInHref: string;
  /** Opaque session-owned display, not claim authority. */
  readonly consoleActorDetails: ReactNode;
  /** Lets the containing workspace replace its inbox chrome while a case is selected. */
  readonly onConsoleVisibilityChange?: (isOpen: boolean) => void;
}

/** Keeps selected claim identity local; no private case context enters the URL or persistent state. */
export function ResolverOwnedHumanFollowUps({
  tenantId,
  signInHref,
  consoleActorDetails,
  onConsoleVisibilityChange,
}: ResolverOwnedHumanFollowUpsProps): ReactElement {
  const [selectedWork, setSelectedWork] =
    useState<ResolverOwnedHumanFollowUpWork | null>(null);
  const [returnFocusToWorkItemId, setReturnFocusToWorkItemId] = useState<
    string | null
  >(null);
  const activeWorkHeading = useRef<HTMLHeadingElement>(null);
  const focusActiveWorkHeading = useCallback(
    () => activeWorkHeading.current?.focus(),
    [],
  );

  function selectWork(item: ResolverOwnedHumanFollowUpWork | null): void {
    setReturnFocusToWorkItemId(
      item === null ? (selectedWork?.workItem.workItemId ?? null) : null,
    );
    setSelectedWork(item);
    onConsoleVisibilityChange?.(item !== null);
  }

  return (
    <section
      aria-labelledby={selectedWork === null ? 'owned-work-heading' : undefined}
      aria-label={selectedWork === null ? undefined : 'Resolver Console'}
      className={selectedWork === null ? 'mt-12' : 'min-w-0'}
    >
      {selectedWork === null ? (
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
        selectedWork={selectedWork}
        returnFocusToWorkItemId={returnFocusToWorkItemId}
        onMissingReturnFocus={focusActiveWorkHeading}
        onSelectWork={selectWork}
      />
    </section>
  );
}
