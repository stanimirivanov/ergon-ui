import type { ResolverOwnedHumanFollowUpWork } from '@ergon/follow-up-model';
import type { ReactElement } from 'react';

import { ResolverFollowUpCaseSummary } from './resolver-follow-up-case-summary';

/** Binds the currently owned identity to private context; the app frames its viewport. */
export function ResolverFollowUpConsole({
  tenantId,
  signInHref,
  item,
  onBeforeRetry,
}: {
  readonly tenantId: string;
  readonly signInHref: string;
  readonly item: ResolverOwnedHumanFollowUpWork;
  readonly onBeforeRetry: () => void;
}): ReactElement {
  return (
    <ResolverFollowUpCaseSummary
      tenantId={tenantId}
      signInHref={signInHref}
      workItemId={item.workItem.workItemId}
      caseId={item.workItem.caseId}
      runId={item.workItem.runId}
      regionId={`case-context-${item.workItem.workItemId}`}
      onBeforeRetry={onBeforeRetry}
    />
  );
}
