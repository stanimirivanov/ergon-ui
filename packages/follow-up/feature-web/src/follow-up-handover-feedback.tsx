import { Button } from '@ergon/ui-web';
import type { ReactElement } from 'react';
import type { FollowUpHandoverCommand } from '@ergon/follow-up-data-access-web';
import type { FollowUpHandoverPhase } from './use-follow-up-handover';
import { ResolverContextWithheld } from './resolver-context-withheld';
import {
  canReplayHandover,
  handoverFailureCopy,
} from './follow-up-handover-failure-copy';

/** Historical feedback stays outside private context; re-entry requires a new owned-work read. */
export function FollowUpHandoverFeedback({
  phase,
  signInHref,
  onReplay,
  onRecover,
}: {
  readonly phase: Exclude<FollowUpHandoverPhase, { kind: 'idle' }>;
  readonly signInHref: string;
  readonly onReplay: (command: FollowUpHandoverCommand) => void;
  readonly onRecover: () => void;
}): ReactElement {
  const busy = phase.kind === 'pending' || phase.kind === 'recovering';
  const title =
    phase.kind === 'pending'
      ? 'Handing over owned work…'
      : phase.kind === 'recovering'
        ? 'Rechecking your owned work…'
        : phase.kind === 'success'
          ? 'Follow-up handover recorded'
          : 'Handover needs attention';
  const description =
    phase.kind === 'failure'
      ? handoverFailureCopy(phase.failure)
      : phase.kind === 'success'
        ? `Historical acknowledgement: ownership revision ${phase.receipt.ownershipRevision} was assigned to ${phase.receipt.recipientActorId}. This is not current access or case completion.`
        : 'Case context, internal notes and claim details are hidden while this operation is unresolved.';
  return (
    <ResolverContextWithheld
      id="follow-up-handover"
      title={title}
      description={description}
      live
      action={
        <div className="space-y-3">
          <p className="max-w-3xl text-sm text-ink-muted">
            Nothing retries automatically. Leaving this view discards local
            replay intent but does not undo a sent transfer. A new owned-work
            check does not prove that an earlier request was never applied.
          </p>
          {!busy && (
            <div className="flex flex-wrap gap-3">
              {phase.kind === 'failure' && canReplayHandover(phase.failure) && (
                <Button type="button" onClick={() => onReplay(phase.command)}>
                  Retry exact handover
                </Button>
              )}
              {phase.kind === 'failure' &&
                phase.failure.kind === 'authentication-required' && (
                  <Button asChild>
                    <a href={signInHref}>Sign in again</a>
                  </Button>
                )}
              <Button type="button" variant="quiet" onClick={onRecover}>
                Recheck my owned work
              </Button>
            </div>
          )}
        </div>
      }
    />
  );
}
