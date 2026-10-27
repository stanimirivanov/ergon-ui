import { useCallback, useRef, useState, type ReactElement } from 'react';
import {
  useFreshProgress,
  type ProgressFailure,
  type ProgressQuery,
} from '@ergon/requester-progress-data-access-web';
import { Button } from '@ergon/ui-web';
import { RequesterAnswerWorkspace } from './requester-answer-workspace';

const failures: Readonly<
  Record<
    ProgressFailure['kind'],
    { title: string; detail: string; retry: boolean }
  >
> = {
  'not-found': {
    title: 'Case progress is unavailable.',
    detail:
      'This link does not provide visible case progress for your session. Check the supplied link with your contact; absence does not explain whether the case exists or who owns it.',
    retry: true,
  },
  'authentication-required': {
    title: 'Sign in again.',
    detail:
      'Your session could not authorize this read. Sign in, then reopen your supplied case link.',
    retry: false,
  },
  forbidden: {
    title: 'Case access could not be verified.',
    detail:
      'Ask your tenant administrator to check your identity registration. No case details are shown.',
    retry: false,
  },
  unavailable: {
    title: 'Progress is temporarily unavailable.',
    detail:
      'The requester service could not complete this check. Try again when it is available.',
    retry: true,
  },
  timeout: {
    title: 'The progress check timed out.',
    detail: 'No current case details are shown. You can try a new read.',
    retry: true,
  },
  transport: {
    title: 'The service could not be reached.',
    detail:
      'Check your connection and try a new read. Previous details remain hidden.',
    retry: true,
  },
  'invalid-response': {
    title: 'Progress could not be validated.',
    detail:
      'The response was not usable. Try a new read or contact an operator.',
    retry: true,
  },
  'unexpected-response': {
    title: 'Progress could not be verified.',
    detail:
      'The service returned an unsupported response. Contact an operator.',
    retry: false,
  },
  'unexpected-defect': {
    title: 'The application could not complete this check.',
    detail: 'No diagnostic or case details are shown. Contact an operator.',
    retry: false,
  },
  'request-cancelled': {
    title: 'The progress check was cancelled.',
    detail:
      'No current case details are shown. Try a new read if you still need them.',
    retry: true,
  },
};

/**
 * Narrow requester progress surface. RTK owns all remote facts; local attempt is
 * disclosure intent only. Recheck commits withdrawal before the hook acquires I/O.
 * A persistent heading owns focus while private DOM is removed.
 */
export function RequesterCaseProgress({
  query,
  signInHref,
}: {
  readonly query: ProgressQuery;
  readonly signInHref: string;
}): ReactElement {
  const [attempt, setAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const read = useFreshProgress(query, attempt);
  const focusHeading = useCallback((): void => {
    heading.current?.focus();
  }, []);
  const recheck = useCallback((): void => {
    heading.current?.focus();
    setAttempt((value) => value + 1);
  }, []);
  return (
    <section aria-labelledby="progress-heading" className="grid min-w-0 gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-accent-strong uppercase">
            Your case
          </p>
          <h1
            id="progress-heading"
            ref={heading}
            tabIndex={-1}
            className="mt-2 font-display text-3xl font-bold tracking-tight outline-offset-4"
          >
            Case progress
          </h1>
        </div>
        <Button onClick={recheck} disabled={read.kind === 'pending'}>
          Recheck progress
        </Button>
      </div>
      <div className="grid min-w-0 gap-6">
        <div
          aria-live="polite"
          aria-atomic="true"
          className={read.kind === 'ready' ? 'sr-only' : undefined}
        >
          {read.kind === 'pending' ? (
            <p role="status">
              Checking current case access… Previous details are hidden.
            </p>
          ) : read.kind === 'failure' ? (
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-xl font-bold">
                {failures[read.failure.kind].title}
              </h2>
              <p className="mt-3 leading-7 text-ink-muted">
                {failures[read.failure.kind].detail}
              </p>
              {read.failure.kind === 'authentication-required' ? (
                <a
                  className="mt-4 inline-block font-bold underline"
                  href={signInHref}
                >
                  Sign in to Ergon
                </a>
              ) : null}
              {failures[read.failure.kind].retry ? (
                <p className="mt-3 text-sm">
                  Use Recheck progress to request fresh access.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="sr-only">
              Current progress and question history checked.
            </p>
          )}
        </div>
        {/* Announce completion, not up to 100 private questions and answers as one atomic live update. */}
        <RequesterAnswerWorkspace
          key={JSON.stringify(query)}
          query={query}
          read={read}
          attempt={attempt}
          recheck={recheck}
          focusHeading={focusHeading}
          signInHref={signInHref}
        />
      </div>
    </section>
  );
}
