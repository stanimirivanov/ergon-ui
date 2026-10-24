import { Button } from '@ergon/ui-web';
import type { ReactElement } from 'react';
import type { FollowUpOwnershipPhase } from './use-follow-up-ownership-command';
import {
  canReplayCompletion,
  completionFailureCopy,
} from './follow-up-completion-failure-copy';
import { ResolverContextWithheld } from './resolver-context-withheld';
import {
  canReplayHandover,
  handoverFailureCopy,
} from './follow-up-handover-failure-copy';

/** Historical feedback stays outside private context; re-entry requires a new owned-work read. */
export function FollowUpOwnershipFeedback({
  phase,
  signInHref,
  onReplay,
  onRecover,
}: {
  readonly phase: Exclude<FollowUpOwnershipPhase, { kind: 'idle' }>;
  readonly signInHref: string;
  readonly onReplay: () => void;
  readonly onRecover: () => void;
}): ReactElement {
  const busy = phase.kind === 'pending' || phase.kind === 'recovering';
  const isCompletion = phase.operation === 'completion';
  const title =
    phase.kind === 'pending'
      ? isCompletion
        ? 'Completing owned follow-up…'
        : 'Handing over owned work…'
      : phase.kind === 'recovering'
        ? 'Rechecking your owned work…'
        : phase.kind === 'success'
          ? isCompletion
            ? 'Follow-up completion recorded'
            : 'Follow-up handover recorded'
          : isCompletion
            ? 'Completion needs attention'
            : 'Handover needs attention';
  const description =
    phase.kind === 'failure'
      ? phase.operation === 'completion'
        ? completionFailureCopy(phase.failure)
        : handoverFailureCopy(phase.failure)
      : phase.kind === 'success'
        ? phase.operation === 'completion'
          ? `Historical acknowledgement: this follow-up was administratively completed at ${phase.receipt.completedAt}. This is not case resolution, run completion, or verified outcome proof.`
          : `Historical acknowledgement: ownership revision ${phase.receipt.ownershipRevision} was assigned to ${phase.receipt.recipientActorId}. This is not current access or case completion.`
        : 'Case context, internal notes and claim details are hidden while this operation is unresolved.';
  return (
    <ResolverContextWithheld
      id="follow-up-ownership-command"
      title={title}
      description={description}
      live
      action={
        <div className="space-y-3">
          <p className="max-w-3xl text-sm text-ink-muted">
            Nothing retries automatically. Leaving this view discards local
            replay intent but does not undo a sent ownership command. A new
            owned-work check does not prove that an earlier request was never
            applied.
          </p>
          {!busy && (
            <div className="flex flex-wrap gap-3">
              {phase.kind === 'failure' &&
                (phase.operation === 'completion'
                  ? canReplayCompletion(phase.failure)
                  : canReplayHandover(phase.failure)) && (
                  <Button type="button" onClick={onReplay}>
                    {isCompletion
                      ? 'Retry exact completion'
                      : 'Retry exact handover'}
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
