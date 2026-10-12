import type { ReactElement, ReactNode } from 'react';

export function AssignedRunFact({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-ink [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}
