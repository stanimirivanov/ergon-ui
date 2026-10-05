import { HumanFollowUpWorkspace } from '@ergon/follow-up-feature-web';
import {
  CurrentActorBoundary,
  VerifiedActorDetails,
} from '@ergon/session-feature-web';
import type { ReactElement } from 'react';
import { useParams } from 'react-router';

import { WorkbenchFrame } from '../app/workbench-frame';
import { browserSignInHref } from './browser-session-navigation';

/** Binds the route and shell to session gating and verified follow-up work. */
export function CurrentActorPage(): ReactElement {
  const { tenantId } = useParams();

  return (
    <CurrentActorBoundary
      tenantId={tenantId}
      signInHrefForTenant={browserSignInHref}
      renderFrame={(statusLabel, content) => (
        <WorkbenchFrame statusLabel={statusLabel}>{content}</WorkbenchFrame>
      )}
      renderVerified={({ actor, tenantId: verifiedTenantId, signInHref }) => (
        <HumanFollowUpWorkspace
          key={verifiedTenantId}
          tenantId={verifiedTenantId}
          signInHref={signInHref}
          actorDetails={<VerifiedActorDetails actor={actor} />}
        />
      )}
    />
  );
}
