import type { ReactNode } from 'react';

/** Renders a neutral follow-up state with an optional recovery action. */
export function FollowUpMessage({
  title,
  description,
  action,
  live = false,
}: {
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
  readonly live?: boolean;
}) {
  return (
    <div
      className="mt-7 rounded-2xl border border-dashed border-border bg-surface/70 p-7"
      aria-live={live ? 'polite' : undefined}
    >
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 max-w-3xl leading-7 text-ink-muted">{description}</p>
      {action === undefined ? null : <div className="mt-5">{action}</div>}
    </div>
  );
}
