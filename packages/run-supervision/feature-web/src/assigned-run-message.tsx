import { Button } from '@ergon/ui-web';
import type { ReactElement } from 'react';

import {
  canOfferReadRetry,
  failureDescription,
  needsSignIn,
} from './run-supervision-copy';

export function AssignedRunMessage({
  title,
  description,
  error,
  retryLabel,
  onRetry,
  signInHref,
}: {
  readonly title: string;
  readonly description?: string;
  readonly error?: unknown;
  readonly retryLabel?: string;
  readonly onRetry?: () => void;
  readonly signInHref?: string;
}): ReactElement {
  return (
    <div
      className="rounded-md border border-dashed border-border bg-canvas/50 p-4"
      role="status"
    >
      <h3 className="font-bold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        {description ?? failureDescription(error)}
      </p>
      {needsSignIn(error) && signInHref !== undefined ? (
        <a
          href={signInHref}
          className="mt-4 inline-flex min-h-11 items-center rounded-md border border-accent px-3 font-semibold text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
        >
          Sign in
        </a>
      ) : onRetry === undefined || !canOfferReadRetry(error) ? null : (
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
