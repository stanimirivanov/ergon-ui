import type { FollowUpCompletionCommand } from '@ergon/follow-up-data-access-web';
import type { ResolverOwnedHumanFollowUpWork } from '@ergon/follow-up-model';
import { Button, ModalDialog } from '@ergon/ui-web';
import {
  useId,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from 'react';
import { useForm } from 'react-hook-form';

/** Mounted only under fresh owned-work disclosure; acknowledgement is intent, never authority. */
export function ConfirmedFollowUpCompletion({
  tenantId,
  item,
  onConfirm,
}: {
  readonly tenantId: string;
  readonly item: ResolverOwnedHumanFollowUpWork;
  readonly onConfirm: (command: FollowUpCompletionCommand) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <Button
        ref={trigger}
        type="button"
        variant="quiet"
        size="compact"
        onClick={() => setOpen(true)}
      >
        Complete follow-up
      </Button>
      {open && (
        <CompletionForm
          key={`${item.claim.claimId}:${item.workItem.ownershipRevision}`}
          tenantId={tenantId}
          item={item}
          trigger={trigger}
          onClose={() => setOpen(false)}
          onConfirm={onConfirm}
        />
      )}
    </div>
  );
}

function CompletionForm({
  tenantId,
  item,
  trigger,
  onClose,
  onConfirm,
}: {
  readonly tenantId: string;
  readonly item: ResolverOwnedHumanFollowUpWork;
  readonly trigger: RefObject<HTMLButtonElement | null>;
  readonly onClose: () => void;
  readonly onConfirm: (command: FollowUpCompletionCommand) => void;
}): ReactElement {
  const id = useId();
  const submitted = useRef(false);
  const form = useForm<{ acknowledge: boolean }>({
    defaultValues: { acknowledge: false },
  });
  return (
    <ModalDialog
      id={id}
      title="Complete owned follow-up"
      dismissLabel="Cancel completion"
      returnFocusRef={trigger}
      onDismiss={onClose}
    >
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(() => {
          if (submitted.current) return;
          submitted.current = true;
          onConfirm({
            tenantId,
            workItemId: item.workItem.workItemId,
            claimId: item.claim.claimId,
            expectedOwnershipRevision: item.workItem.ownershipRevision,
            commandId: crypto.randomUUID(),
          });
        })}
      >
        <p className="text-sm leading-6 text-ink-muted">
          Finish this administrative follow-up and remove it from active work.
          Your private case context and internal notes will no longer be
          available through this item. This does not resolve the case, change
          the run or accept outcome proof. There is no reopen or undo action
          here.
        </p>
        <dl className="space-y-2 text-xs text-ink-muted">
          <div>
            <dt>Original claim</dt>
            <dd className="font-mono break-all">{item.claim.claimId}</dd>
          </div>
          <div>
            <dt>Expected ownership revision</dt>
            <dd>{item.workItem.ownershipRevision}</dd>
          </div>
        </dl>
        <label className="flex items-start gap-3 text-sm leading-6">
          <input
            type="checkbox"
            className="mt-1"
            aria-invalid={form.formState.errors.acknowledge !== undefined}
            aria-describedby={`${id}-error`}
            {...form.register('acknowledge', {
              required: 'Acknowledge completion and loss of private access.',
            })}
          />
          I understand that this ends active follow-up access, not the case or
          its outcome verification.
        </label>
        <p id={`${id}-error`} className="text-sm text-highlight">
          {form.formState.errors.acknowledge?.message}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="submit">Confirm completion</Button>
          <Button type="button" variant="quiet" onClick={onClose}>
            Keep follow-up active
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}
