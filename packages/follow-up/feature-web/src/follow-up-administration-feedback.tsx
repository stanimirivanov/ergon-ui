import { Button } from '@ergon/ui-web';
import type { ReactElement } from 'react';
import type { FollowUpAdministrationPhase } from './use-follow-up-administration-command';
import {
  canReplayCompletion,
  completionFailureCopy,
} from './follow-up-completion-failure-copy';
import { ResolverContextWithheld } from './resolver-context-withheld';
import {
  priorityFailureCopy,
  canReplayPriority,
} from './follow-up-priority-failure-copy';
import {
  canReplayHandover,
  handoverFailureCopy,
} from './follow-up-handover-failure-copy';

/** Historical feedback stays outside private context; re-entry requires a new owned-work read. */
export function FollowUpAdministrationFeedback({
  phase,
  signInHref,
  onReplay,
  onRecover,
}: {
  readonly phase: Exclude<FollowUpAdministrationPhase, { kind: 'idle' }>;
  readonly signInHref: string;
  readonly onReplay: () => void;
  readonly onRecover: () => void;
}): ReactElement {
  const busy =
    phase.kind === 'pending' ||
    phase.kind === 'recovering' ||
    phase.kind === 'priority-recheck';
  const isCompletion = phase.operation === 'completion';
  const isPriority = phase.operation === 'priority';
  const title =
    phase.kind === 'priority-recheck'
      ? 'Rechecking original priority ownership…'
      : phase.kind === 'pending'
        ? isPriority
          ? 'Assigning follow-up priority…'
          : isCompletion
            ? 'Completing owned follow-up…'
            : 'Handing over owned work…'
        : phase.kind === 'recovering'
          ? 'Rechecking your owned work…'
          : phase.kind === 'success'
            ? isPriority
              ? 'Priority assignment recorded'
              : isCompletion
                ? 'Follow-up completion recorded'
                : 'Follow-up handover recorded'
            : isPriority
              ? 'Priority assignment needs attention'
              : isCompletion
                ? 'Completion needs attention'
                : 'Handover needs attention';
  const description =
    phase.kind === 'failure'
      ? phase.operation === 'priority'
        ? priorityFailureCopy(phase.failure)
        : phase.operation === 'completion'
          ? completionFailureCopy(phase.failure)
          : handoverFailureCopy(phase.failure)
      : phase.kind === 'success'
        ? phase.operation === 'priority'
          ? `Historical acknowledgement: ${phase.receipt.priority} at priority revision ${phase.receipt.priorityRevision}. This may already be superseded. Recheck owned work for current metadata; ownership, ordering, risk and proof are unchanged.`
          : phase.operation === 'completion'
            ? `Historical acknowledgement: this follow-up was administratively completed at ${phase.receipt.completedAt}. This is not case resolution, run completion, or verified outcome proof.`
            : `Historical acknowledgement: ownership revision ${phase.receipt.ownershipRevision} was assigned to ${phase.receipt.recipientActorId}. This is not current access or case completion.`
        : 'Case context, internal notes and claim details are hidden while this operation is unresolved.';
  return (
    <ResolverContextWithheld
      id="follow-up-administration-command"
      title={title}
      description={description}
      live
      action={
        <div className="space-y-3">
          <p className="max-w-3xl text-sm text-ink-muted">
            Nothing retries automatically. Leaving this view discards local
            replay intent but does not undo a sent administrative command. A new
            owned-work check does not prove that an earlier request was never
            applied.
          </p>
          {!busy && (
            <div className="flex flex-wrap gap-3">
              {phase.kind === 'failure' &&
                (phase.operation === 'priority'
                  ? canReplayPriority(phase.failure)
                  : phase.operation === 'completion'
                    ? canReplayCompletion(phase.failure)
                    : canReplayHandover(phase.failure)) && (
                  <Button type="button" onClick={onReplay}>
                    {isPriority
                      ? 'Retry exact priority assignment'
                      : isCompletion
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
