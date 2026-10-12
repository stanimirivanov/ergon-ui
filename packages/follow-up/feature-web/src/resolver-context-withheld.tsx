import { ThreePaneLayout } from '@ergon/ui-web';
import type { ReactElement, ReactNode, Ref } from 'react';

/** Preserves pane allocation without retaining case, claim, execution or outcome facts. */
export function ResolverContextWithheld({
  id,
  title,
  description,
  action,
  headingRef,
  live = false,
}: {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
  readonly headingRef?: Ref<HTMLHeadingElement>;
  readonly live?: boolean;
}): ReactElement {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      aria-live={live ? 'polite' : undefined}
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-4"
    >
      <div className="rounded-md border border-border bg-surface p-5">
        <h2
          ref={headingRef}
          id={`${id}-heading`}
          tabIndex={headingRef === undefined ? undefined : -1}
          className="font-bold text-ink"
        >
          {title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
          {description}
        </p>
        {action === undefined ? null : <div className="mt-4">{action}</div>}
      </div>
      <ThreePaneLayout
        leadingLabel="Withheld evidence"
        primaryLabel="Withheld execution"
        trailingLabel="Withheld outcome"
        leading={
          <WithheldPane
            id={`${id}-evidence`}
            title="Evidence withheld"
            description="Source observations remain hidden until the current access check succeeds."
          />
        }
        primary={
          <WithheldPane
            id={`${id}-execution`}
            title="Execution withheld"
            description="Recorded attempts and policy inputs are hidden while access is unresolved."
          />
        }
        trailing={
          <WithheldPane
            id={`${id}-outcome`}
            title="Outcome withheld"
            description="Outcome targets and assessment details are hidden while access is unresolved."
          />
        }
      />
    </section>
  );
}

function WithheldPane({
  id,
  title,
  description,
}: {
  readonly id: string;
  readonly title: string;
  readonly description: string;
}): ReactElement {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="min-w-0 flex-1 rounded-md border border-border bg-surface/90 p-4"
    >
      <h3 id={`${id}-heading`} className="text-xl font-bold text-ink">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
    </section>
  );
}
