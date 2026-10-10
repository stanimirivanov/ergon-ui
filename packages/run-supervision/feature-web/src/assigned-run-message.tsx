import { Button } from '@ergon/ui-web';
import type { RunSupervisionFailure } from '@ergon/run-supervision-data-access-web';
import type { ReactElement } from 'react';

import { runSupervisionFailureCopy } from './run-supervision-copy';

export function AssignedRunMessage({
  title,
  description,
  error,
  retryLabel,
  onRetry,
  onResetPage,
  signInHref,
}: {
  readonly title: string;
  readonly description?: string;
  readonly error?: RunSupervisionFailure;
  readonly retryLabel?: string;
  readonly onRetry?: () => void;
  readonly onResetPage?: () => void;
  readonly signInHref?: string;
}): ReactElement {
  const copy =
    error === undefined ? undefined : runSupervisionFailureCopy(error);
  const recovery = copy?.recovery;
  return (
    <div
      className="rounded-md border border-dashed border-border bg-canvas/50 p-4"
      role="status"
    >
      <h3 className="font-bold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        {description ?? copy?.description}
      </p>
      {recovery === 'sign-in' && signInHref !== undefined ? (
        <a
          href={signInHref}
          className="mt-4 inline-flex min-h-11 items-center rounded-md border border-accent px-3 font-semibold text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
        >
          Sign in
        </a>
      ) : recovery === 'reset-page' && onResetPage !== undefined ? (
        <Button
          type="button"
          variant="quiet"
          size="compact"
          className="mt-4 rounded-md"
          onClick={onResetPage}
        >
          Return to first assigned page
        </Button>
      ) : recovery !== 'retry-read' || onRetry === undefined ? null : (
        <Button
          type="button"
          variant="quiet"
          size="compact"
          className="mt-4 rounded-md"
          onClick={onRetry}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
