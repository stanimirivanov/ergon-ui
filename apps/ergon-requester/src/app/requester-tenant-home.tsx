import type { ReactElement } from 'react';
import { Link } from 'react-router';

/** App-owned navigation, not a case collection or implicit ownership grant. */
export function RequesterTenantHome({
  tenantId,
}: {
  readonly tenantId: string;
}): ReactElement {
  return (
    <section className="grid max-w-3xl gap-5">
      <h1 className="text-3xl font-black">Your session is verified.</h1>
      <p>
        Reopen your supplied case link or check Notifications for recent
        information requests. Notifications are historical deliveries, not a
        complete case list; every target requires a fresh access check.
      </p>
      <p>
        For a new request, describe the outcome and what happened. Only explicit
        submission creates a new case bound to your verified identity; no
        resolution run or approval starts automatically.
      </p>
      <Link
        className="w-fit rounded-lg bg-accent px-5 py-3 font-bold text-accent-foreground hover:bg-accent-strong"
        to={'/tenants/' + tenantId + '/new'}
      >
        Start a request
      </Link>
    </section>
  );
}
