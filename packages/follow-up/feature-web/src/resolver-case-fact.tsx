import type { ReactElement, ReactNode } from 'react';

export function ResolverCaseFact({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold tracking-wide text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1 break-words text-ink">{children}</dd>
    </div>
  );
}
