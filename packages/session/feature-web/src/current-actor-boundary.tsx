import { Button } from '@ergon/ui-web';
import type { CurrentActor } from '@ergon/session-model';
import {
  type CurrentActorFailure,
  useCurrentActorQuery,
} from '@ergon/session-data-access-web';
import { Schema } from 'effect';
import type { ReactElement, ReactNode } from 'react';

const tenantIdSchema = Schema.UUID;

/** Verified server session passed to app-owned composition only after success. */
export interface VerifiedSession {
  readonly actor: CurrentActor;
  /** Validated navigation context, not evidence of tenant authority. */
  readonly tenantId: string;
  readonly signInHref: string;
}

/**
 * Inputs provided by the workbench composition root.
 *
 * The shell and authenticated content are injected so this feature never
 * imports app layout or follow-up presentation. The sign-in target builder is
 * trusted app code and is called only with a validated tenant identifier.
 */
export interface CurrentActorBoundaryProps {
  readonly tenantId: string | undefined;
  readonly signInHrefForTenant: (tenantId: string) => string;
  readonly renderFrame: (
    statusLabel: string,
    content: ReactNode,
  ) => ReactElement;
  readonly renderVerified: (session: VerifiedSession) => ReactNode;
}

/**
 * Fails closed until the BFF verifies the current actor for a valid tenant.
 * Invalid addresses send no request. Unverified content never mounts, including
 * while the session is loading, unavailable, or rejected.
 */
export function CurrentActorBoundary({
  tenantId: routeTenantId,
  signInHrefForTenant,
  renderFrame,
  renderVerified,
}: CurrentActorBoundaryProps): ReactElement {
  const tenantId = decodeTenantId(routeTenantId);

  if (tenantId === undefined) {
    return renderFrame(
      'Invalid tenant',
      <SessionPanel
        eyebrow="Workspace address rejected"
        title="This tenant address is invalid."
        description="Use a complete Ergon workspace link. No session request was sent."
      />,
    );
  }

  return (
    <CurrentActorSession
      tenantId={tenantId}
      signInHrefForTenant={signInHrefForTenant}
      renderFrame={renderFrame}
      renderVerified={renderVerified}
    />
  );
}

function CurrentActorSession({
  tenantId,
  signInHrefForTenant,
  renderFrame,
  renderVerified,
}: CurrentActorBoundaryProps & { readonly tenantId: string }): ReactElement {
  const session = useCurrentActorQuery({ tenantId });
  const signInHref = signInHrefForTenant(tenantId);

  if (session.isLoading || (session.isFetching && session.data === undefined)) {
    return renderFrame(
      'Verifying session',
      <SessionPanel
        eyebrow="Identity boundary"
        title="Verifying your Ergon session…"
        description="Resolver data stays hidden until the server confirms your tenant-scoped actor."
        live
      />,
    );
  }

  if (session.data !== undefined) {
    return renderFrame(
      'Resolver inbox',
      renderVerified({ actor: session.data, tenantId, signInHref }),
    );
  }

  const failure = normalizeFailure(session.error);
  const copy = failureCopy(failure);
  const action =
    failure.kind === 'authentication-required' ? (
      <Button asChild>
        <a href={signInHref}>Sign in to Ergon</a>
      </Button>
    ) : copy.canRetry ? (
      <Button type="button" onClick={() => session.refetch()}>
        Try again
      </Button>
    ) : undefined;

  return renderFrame(
    copy.statusLabel,
    <SessionPanel
      eyebrow="Identity boundary"
      title={copy.title}
      description={copy.description}
      action={action}
    />,
  );
}

interface SessionPanelProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly action?: React.ReactNode;
  readonly live?: boolean;
}

function SessionPanel({
  eyebrow,
  title,
  description,
  action,
  live = false,
}: SessionPanelProps): ReactElement {
  return (
    <section
      className="mx-auto max-w-4xl px-6 py-20 lg:px-10 lg:py-28"
      aria-live={live ? 'polite' : undefined}
    >
      <div className="rounded-[2rem] border border-border bg-surface p-8 shadow-[0_24px_70px_rgb(24_32_25_/_10%)] sm:p-12">
        <p className="text-sm font-bold tracking-[0.18em] text-accent-strong uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-5 font-display text-4xl tracking-[-0.035em] text-ink sm:text-5xl">
          {title}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-muted">
          {description}
        </p>
        {action === undefined ? null : <div className="mt-8">{action}</div>}
      </div>
    </section>
  );
}

/** Session identity details rendered as text, never as trusted markup. */
export function VerifiedActorDetails({
  actor,
}: {
  readonly actor: CurrentActor;
}): ReactElement {
  return (
    <dl className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-surface px-5 py-4 text-sm shadow-[0_12px_35px_rgb(24_32_25_/_6%)] sm:flex-row sm:items-center sm:justify-between">
      <div>
        <dt className="text-xs font-bold tracking-wide text-ink-muted uppercase">
          Verified actor
        </dt>
        <dd className="mt-1 break-all font-mono text-xs">{actor.actorId}</dd>
      </div>
      <div className="sm:text-right">
        <dt className="text-xs font-bold tracking-wide text-ink-muted uppercase">
          Identity provider
        </dt>
        <dd className="mt-1 font-semibold">{actor.identityProvider}</dd>
      </div>
    </dl>
  );
}

function decodeTenantId(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const result = Schema.decodeUnknownEither(tenantIdSchema)(value);
  return result._tag === 'Right' ? result.right : undefined;
}

function normalizeFailure(error: unknown): CurrentActorFailure {
  if (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    typeof error.kind === 'string'
  ) {
    switch (error.kind) {
      case 'authentication-required':
      case 'authentication-unavailable':
      case 'actor-not-registered':
      case 'identity-rejected':
      case 'forbidden':
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

interface SessionFailureCopy {
  readonly statusLabel: string;
  readonly title: string;
  readonly description: string;
  readonly canRetry: boolean;
}

function failureCopy(failure: CurrentActorFailure): SessionFailureCopy {
  switch (failure.kind) {
    case 'authentication-required':
      return {
        statusLabel: 'Sign-in required',
        title: 'Authentication is required.',
        description:
          'Sign in through the Ergon control plane to open this tenant workspace. No resolver data has been loaded.',
        canRetry: false,
      };
    case 'authentication-unavailable':
      return {
        statusLabel: 'Sign-in unavailable',
        title: 'Browser sign-in is not configured.',
        description:
          'The control plane has not enabled its browser session boundary. Ask an operator to configure workbench authentication.',
        canRetry: false,
      };
    case 'actor-not-registered':
      return {
        statusLabel: 'Access not provisioned',
        title: 'Your Ergon actor is not registered.',
        description:
          'Your identity is valid, but it has no actor binding in this tenant. Ask a tenant administrator to provision access.',
        canRetry: false,
      };
    case 'identity-rejected':
    case 'forbidden':
      return {
        statusLabel: 'Identity rejected',
        title: 'This identity cannot enter the workspace.',
        description:
          'The control plane rejected the identity for this tenant. No resolver data has been loaded.',
        canRetry: false,
      };
    case 'timeout':
    case 'transport':
    case 'service-unavailable':
      return {
        statusLabel: 'Temporarily unavailable',
        title: 'Session verification is temporarily unavailable.',
        description:
          'The workbench could not confirm your actor safely. Try again after the control plane is reachable.',
        canRetry: true,
      };
    case 'unexpected-response':
    case 'invalid-response':
    case 'request-cancelled':
      return {
        statusLabel: 'Verification failed',
        title: 'Your session could not be verified.',
        description:
          'The identity response was not usable, so the workbench remained closed. Try again or contact an operator.',
        canRetry: true,
      };
  }
}
