import { useId, type ReactElement, type ReactNode } from 'react';

/** Presentation only: a command family label is not an eligibility or authority claim. */
export function RunActionCard({
  label,
  title,
  consequence,
  children,
}: {
  readonly label: string;
  readonly title: string;
  readonly consequence: string;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <section
      aria-label={label}
      className="min-w-0 border-s-2 border-highlight bg-surface p-4 [overflow-wrap:anywhere]"
    >
      <p className="text-xs font-bold tracking-wide text-highlight uppercase">
        {consequence}
      </p>
      <h3 className="mt-2 text-base font-extrabold text-ink">{title}</h3>
      {children}
    </section>
  );
}

/** Keeps the consequence visible before acknowledgement; callers own all policy and form state. */
export function RunDecisionBoundary({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}): ReactElement {
  const id = useId();
  return (
    <aside
      aria-labelledby={id}
      className="min-w-0 rounded-md border border-highlight/60 bg-highlight/10 p-4 [overflow-wrap:anywhere]"
    >
      <p
        id={id}
        className="text-xs font-bold tracking-wide text-highlight uppercase"
      >
        {title}
      </p>
      <p className="mt-2 text-sm leading-6">{children}</p>
    </aside>
  );
}
