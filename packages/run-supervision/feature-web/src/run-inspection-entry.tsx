import type { ReactElement, ReactNode } from 'react';

/**
 * Shared launch framing for the four current protected run inspectors.
 * The caller owns the trigger/ref, eligibility, resource and modal lifetime.
 * This component renders purpose and unavailable feedback; it neither interprets
 * authority nor opens, mounts or retains an inspection on its own.
 */
export function RunInspectionEntry({
  title,
  description,
  action,
  unavailableReason,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly action: ReactNode;
  /** Undefined means the caller has no unavailable reason to display, not read authorization. */
  readonly unavailableReason: string | undefined;
  readonly children?: ReactNode;
}): ReactElement {
  return (
    <section
      aria-label={title}
      className="min-w-0 rounded-md border border-border bg-canvas/60 p-3"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h3 className="min-w-0 text-sm font-bold [overflow-wrap:anywhere]">
          {title}
        </h3>
        <div className="min-w-0">{action}</div>
      </div>
      <p className="mt-2 text-xs leading-5 text-ink-muted">{description}</p>
      {unavailableReason === undefined ? null : (
        <p className="mt-2 text-xs leading-5 text-ink-muted">
          {unavailableReason}
        </p>
      )}
      {children}
    </section>
  );
}
