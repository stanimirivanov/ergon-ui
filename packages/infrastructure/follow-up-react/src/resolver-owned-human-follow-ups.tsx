import type { ReactElement } from 'react';

import { ResolverOwnedHumanFollowUpsPage } from './resolver-owned-human-follow-ups-page';

/** Inputs supplied by the route-level composition boundary. */
export interface ResolverOwnedHumanFollowUpsProps {
  /** Request context only; the BFF remains authoritative for ownership. */
  readonly tenantId: string;
  /** Trusted same-origin navigation target supplied by the composition root. */
  readonly signInHref: string;
}

/** Renders active claims without inferring why the server returned an empty page. */
export function ResolverOwnedHumanFollowUps({
  tenantId,
  signInHref,
}: ResolverOwnedHumanFollowUpsProps): ReactElement {
  return (
    <section aria-labelledby="owned-work-heading" className="mt-12">
      <div className="border-b border-border pb-7">
        <p className="text-sm font-bold tracking-[0.18em] text-accent-strong uppercase">
          Your active work
        </p>
        <h2
          id="owned-work-heading"
          className="mt-3 font-display text-3xl tracking-[-0.025em] text-ink sm:text-4xl"
        >
          Claimed follow-ups
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-ink-muted">
          Recover work you already own after navigation or reload. Current
          resolver authority is checked again whenever this list is requested.
        </p>
      </div>
      <ResolverOwnedHumanFollowUpsPage
        tenantId={tenantId}
        signInHref={signInHref}
      />
    </section>
  );
}
