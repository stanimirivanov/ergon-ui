import { CurrentActorBoundary } from '@ergon/session-feature-web';
import type { ReactElement } from 'react';
import { useParams } from 'react-router';

import { WorkbenchFrame } from '../app/workbench-frame';
import { VerifiedWorkbench } from '../app/verified-workbench';
import { browserSignInHref } from './browser-session-navigation';

/** Binds tenant navigation and the workbench shell to verified-session gating. */
export function CurrentActorPage(): ReactElement {
  const { tenantId } = useParams();

  return (
    <CurrentActorBoundary
      tenantId={tenantId}
      signInHrefForTenant={browserSignInHref}
      renderFrame={(statusLabel, content) => (
        <WorkbenchFrame statusLabel={statusLabel}>{content}</WorkbenchFrame>
      )}
      renderVerified={(session) => (
        <VerifiedWorkbench key={session.tenantId} {...session} />
      )}
    />
  );
}
