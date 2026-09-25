import { Button } from '@ergon/ui-web';

import { browserSignInHref } from '../session/browser-session-navigation';
import { useResolverFollowUpCaseSummaryQuery } from './human-follow-up-api';
import type { ResolverFollowUpCaseSummaryFailure } from './human-follow-up-client';

const observedAtFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

/**
 * Shows server-authorized case evidence for one resolver-owned follow-up.
 *
 * The component deliberately receives only opaque tenant and work-item keys.
 * Current ownership and authority are re-evaluated by the BFF for every query.
 */
export function ResolverFollowUpCaseSummary({
  tenantId,
  workItemId,
  caseId,
  runId,
  regionId,
}: {
  readonly tenantId: string;
  readonly workItemId: string;
  readonly caseId: string;
  readonly runId: string;
  readonly regionId: string;
}) {
  const result = useResolverFollowUpCaseSummaryQuery({
    tenantId,
    workItemId,
    caseId,
    runId,
  });

  if (result.isLoading || (result.isFetching && result.data === undefined)) {
    return (
      <CaseContextMessage
        id={regionId}
        title="Loading case context…"
        description="The control plane is rechecking ownership and assembling the evidence used by the escalated run."
        live
      />
    );
  }

  if (result.data === undefined) {
    const failure = normalizeFailure(result.error);
    const copy = failureCopy(failure);
    const action =
      failure.kind === 'authentication-required' ? (
        <Button asChild>
          <a href={browserSignInHref(tenantId)}>Sign in again</a>
        </Button>
      ) : copy.canRetry ? (
        <Button type="button" variant="quiet" onClick={() => result.refetch()}>
          Try case context again
        </Button>
      ) : undefined;
    return (
      <CaseContextMessage
        id={regionId}
        title={copy.title}
        description={copy.description}
        action={action}
      />
    );
  }

  const summary = result.data;
  return (
    <section
      id={regionId}
      aria-labelledby={`${regionId}-heading`}
      className="mt-5 border-t border-border pt-5"
      aria-busy={result.isFetching}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
            Case context
          </p>
          <h4
            id={`${regionId}-heading`}
            className="mt-2 text-lg font-bold text-ink"
          >
            {summary.case.goal}
          </h4>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Case and run status">
          <ContextBadge>{summary.case.status}</ContextBadge>
          <ContextBadge>
            {summary.resolutionRun.effectiveRisk} risk
          </ContextBadge>
          <ContextBadge>{summary.resolutionRun.state}</ContextBadge>
        </div>
      </div>

      <dl className="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <ContextFact label="Resolution contract">
          {summary.case.resolutionContract.key} revision{' '}
          {summary.case.resolutionContract.revision}
        </ContextFact>
        <ContextFact label="Capability">
          {summary.resolutionRun.capability}
        </ContextFact>
        <ContextFact label="Escalated step">
          {summary.resolutionRun.stepId}
        </ContextFact>
        <ContextFact label="Required approval">
          {summary.resolutionRun.requiredApproval}
        </ContextFact>
        <ContextFact label="Attempt">
          {summary.resolutionRun.attemptNumber}
        </ContextFact>
        <ContextFact label="Evidence boundary">
          Version {summary.resolutionRun.caseEvidenceStreamVersion} of{' '}
          {summary.case.streamVersion}
        </ContextFact>
      </dl>

      <div className="mt-6">
        <h5 className="text-sm font-bold text-ink">Recorded observations</h5>
        {summary.observations.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            No observations were recorded at this evidence boundary.
          </p>
        ) : (
          <ol className="mt-3 grid gap-3" aria-label="Case observations">
            {summary.observations.map((observation) => (
              <li
                key={observation.observationId}
                className="rounded-xl border border-border bg-canvas/60 p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold text-ink">{observation.summary}</p>
                  <p className="text-xs text-ink-muted">
                    Version {observation.streamVersion}
                  </p>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
                  {observation.content}
                </p>
                <p className="mt-3 text-xs text-ink-muted">
                  {observation.originType} via {observation.provider}
                  {observation.reference === null
                    ? ''
                    : ` · ${observation.reference}`}{' '}
                  ·{' '}
                  <time dateTime={observation.occurredAt}>
                    {formatObservedAt(observation.occurredAt)}
                  </time>
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function ContextBadge({ children }: { readonly children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold tracking-wide text-accent-strong uppercase">
      {children}
    </span>
  );
}

function ContextFact({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="font-bold text-ink">{label}</dt>
      <dd className="mt-1 break-words text-ink-muted">{children}</dd>
    </div>
  );
}

function CaseContextMessage({
  id,
  title,
  description,
  action,
  live = false,
}: {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly action?: React.ReactNode;
  readonly live?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="mt-5 border-t border-border pt-5"
      aria-live={live ? 'polite' : undefined}
    >
      <h4 id={`${id}-heading`} className="font-bold text-ink">
        {title}
      </h4>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
        {description}
      </p>
      {action === undefined ? null : <div className="mt-4">{action}</div>}
    </section>
  );
}

function normalizeFailure(error: unknown): ResolverFollowUpCaseSummaryFailure {
  if (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    typeof error.kind === 'string'
  ) {
    switch (error.kind) {
      case 'authentication-required':
        return 'signInPath' in error && error.signInPath === '/bff/login'
          ? { kind: error.kind, signInPath: error.signInPath }
          : { kind: 'invalid-response' };
      case 'authentication-unavailable':
      case 'actor-not-registered':
      case 'identity-rejected':
      case 'forbidden':
      case 'invalid-filter':
      case 'invalid-page':
      case 'not-found':
      case 'timeout':
      case 'transport':
      case 'invalid-response':
      case 'request-cancelled':
        return { kind: error.kind };
      case 'service-unavailable':
      case 'unexpected-response':
        return {
          kind: error.kind,
          status:
            'status' in error && typeof error.status === 'number'
              ? error.status
              : 0,
        };
    }
  }
  return { kind: 'invalid-response' };
}

function failureCopy(failure: ResolverFollowUpCaseSummaryFailure) {
  switch (failure.kind) {
    case 'authentication-required':
      return {
        title: 'Your browser session has expired.',
        description: 'Sign in again before requesting case context.',
        canRetry: false,
      };
    case 'authentication-unavailable':
      return {
        title: 'Browser sign-in is not configured.',
        description:
          'Ask an operator to configure the workbench authentication boundary.',
        canRetry: false,
      };
    case 'actor-not-registered':
      return {
        title: 'Your resolver access is no longer provisioned.',
        description:
          'Ask a tenant administrator to confirm your actor binding before continuing.',
        canRetry: false,
      };
    case 'identity-rejected':
    case 'forbidden':
      return {
        title: 'This identity cannot read case context.',
        description:
          'The control plane rejected the current tenant identity. No case evidence is displayed.',
        canRetry: false,
      };
    case 'not-found':
      return {
        title: 'Case context is no longer available.',
        description:
          'The follow-up may have changed since this page was loaded. Refresh your active work before continuing.',
        canRetry: false,
      };
    case 'timeout':
    case 'transport':
    case 'service-unavailable':
      return {
        title: 'Case context is temporarily unavailable.',
        description:
          'The workbench could not load the case evidence. Try again after the control plane is reachable.',
        canRetry: true,
      };
    case 'invalid-filter':
    case 'invalid-page':
    case 'unexpected-response':
    case 'invalid-response':
    case 'request-cancelled':
      return {
        title: 'Case context could not be loaded.',
        description:
          'The response was not safe to display. Try again or contact an operator.',
        canRetry: true,
      };
  }
}

function formatObservedAt(value: string) {
  return `${observedAtFormatter.format(new Date(value))} UTC`;
}
