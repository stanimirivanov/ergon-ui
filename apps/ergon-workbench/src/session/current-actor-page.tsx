import { Button } from '@ergon/ui-web';
import { Schema } from 'effect';
import { useParams } from 'react-router';

import { WorkbenchFrame } from '../app/workbench-frame';
import { useCurrentActorQuery } from './current-actor-api';
import type { CurrentActorFailure } from './current-actor-client';

const tenantIdSchema = Schema.UUID;

export function CurrentActorPage() {
  const tenantId = decodeTenantId(useParams().tenantId);

  if (tenantId === undefined) {
    return (
      <WorkbenchFrame statusLabel="Invalid tenant">
        <SessionPanel
          eyebrow="Workspace address rejected"
          title="This tenant address is invalid."
          description="Use a complete Ergon workspace link. No session request was sent."
        />
      </WorkbenchFrame>
    );
  }

  return <CurrentActorSession tenantId={tenantId} />;
}

function CurrentActorSession({ tenantId }: { readonly tenantId: string }) {
  const session = useCurrentActorQuery({ tenantId });

  if (session.isLoading || (session.isFetching && session.data === undefined)) {
    return (
      <WorkbenchFrame statusLabel="Verifying session">
        <SessionPanel
          eyebrow="Identity boundary"
          title="Verifying your Ergon session…"
          description="Resolver data stays hidden until the server confirms your tenant-scoped actor."
          live
        />
      </WorkbenchFrame>
    );
  }

  if (session.data !== undefined) {
    return (
      <WorkbenchFrame statusLabel="Session verified">
        <section className="mx-auto max-w-4xl px-6 py-20 lg:px-10 lg:py-28">
          <p className="text-sm font-bold tracking-[0.18em] text-accent-strong uppercase">
            Identity boundary
          </p>
          <h1 className="mt-5 font-display text-5xl tracking-[-0.035em] text-ink sm:text-6xl">
            Session verified.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-muted">
            The control plane recognized your immutable actor binding for this
            tenant. Resolver capabilities can now be introduced behind this
            boundary.
          </p>
          <dl className="mt-10 grid gap-5 rounded-[2rem] border border-border bg-surface p-7 shadow-[0_24px_70px_rgb(24_32_25_/_10%)] sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold tracking-wide text-ink-muted uppercase">
                Actor ID
              </dt>
              <dd className="mt-2 break-all font-mono text-sm">
                {session.data.actorId}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold tracking-wide text-ink-muted uppercase">
                Identity provider
              </dt>
              <dd className="mt-2 text-sm font-semibold">
                {session.data.identityProvider}
              </dd>
            </div>
          </dl>
          <p className="mt-5 text-sm leading-6 text-ink-muted">
            Provider subjects and credentials remain behind the server-side
            session boundary and never enter Redux.
          </p>
        </section>
      </WorkbenchFrame>
    );
  }

  const failure = normalizeFailure(session.error);
  const copy = failureCopy(failure);
  const action =
    failure.kind === 'authentication-required' ? (
      <Button asChild>
        <a href={signInHref(failure.signInPath, tenantId)}>Sign in to Ergon</a>
      </Button>
    ) : copy.canRetry ? (
      <Button type="button" onClick={() => session.refetch()}>
        Try again
      </Button>
    ) : undefined;

  return (
    <WorkbenchFrame statusLabel={copy.statusLabel}>
      <SessionPanel
        eyebrow="Identity boundary"
        title={copy.title}
        description={copy.description}
        action={action}
      />
    </WorkbenchFrame>
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
}: SessionPanelProps) {
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

function decodeTenantId(value: string | undefined) {
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
        return 'signInPath' in error && error.signInPath === '/bff/login'
          ? { kind: error.kind, signInPath: error.signInPath }
          : { kind: 'invalid-response' };
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

function failureCopy(failure: CurrentActorFailure) {
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

function signInHref(signInPath: '/bff/login', tenantId: string) {
  const parameters = new URLSearchParams({
    returnTo: `/tenants/${tenantId}`,
  });
  return `${signInPath}?${parameters.toString()}`;
}
