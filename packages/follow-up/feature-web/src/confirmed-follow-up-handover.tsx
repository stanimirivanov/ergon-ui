import type { FollowUpHandoverCommand } from '@ergon/follow-up-data-access-web';
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

/** Mounted only under the current owned-work gate; no directory or authority is inferred. */
export function ConfirmedFollowUpHandover({
  tenantId,
  item,
  onConfirm,
}: {
  readonly tenantId: string;
  readonly item: ResolverOwnedHumanFollowUpWork;
  readonly onConfirm: (command: FollowUpHandoverCommand) => void;
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
        disabled={item.workItem.ownershipRevision > Number.MAX_SAFE_INTEGER - 2}
        onClick={() => setOpen(true)}
      >
        Hand over follow-up
      </Button>
      {open && (
        <HandoverForm
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

function HandoverForm({
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
  readonly onConfirm: (command: FollowUpHandoverCommand) => void;
}): ReactElement {
  const id = useId();
  const submitted = useRef(false);
  const form = useForm<{ recipient: string; acknowledge: boolean }>({
    defaultValues: { recipient: '', acknowledge: false },
  });
  return (
    <ModalDialog
      id={id}
      title="Hand over owned follow-up"
      dismissLabel="Cancel handover"
      returnFocusRef={trigger}
      onDismiss={onClose}
    >
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(({ recipient }) => {
          if (submitted.current) return;
          submitted.current = true;
          onConfirm({
            tenantId,
            workItemId: item.workItem.workItemId,
            claimId: item.claim.claimId,
            expectedOwnershipRevision: item.workItem.ownershipRevision,
            commandId: crypto.randomUUID(),
            recipientActorId: recipient.trim().toLowerCase(),
          });
        })}
      >
        <p className="text-sm leading-6 text-ink-muted">
          Transfer this open follow-up directly to another authorized resolver.
          It will not enter the shared queue, complete the case or transfer run
          supervision. You will lose access to its private case context and
          internal notes.
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
        <div className="space-y-2">
          <label htmlFor={`${id}-recipient`} className="block font-semibold">
            Recipient actor UUID
          </label>
          <p id={`${id}-help`} className="text-sm text-ink-muted">
            Use the intended resolver's internal actor UUID, not an email or
            provider subject. There is no directory here. The server checks
            tenant membership and current authority.
          </p>
          <input
            id={`${id}-recipient`}
            autoComplete="off"
            spellCheck={false}
            className="w-full min-w-0 rounded-md border border-border bg-canvas p-3 text-ink"
            aria-invalid={form.formState.errors.recipient !== undefined}
            aria-describedby={`${id}-help ${id}-recipient-error`}
            {...form.register('recipient', {
              validate: (value) =>
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                  value.trim(),
                ) || 'Enter a complete internal actor UUID.',
            })}
          />
          <p id={`${id}-recipient-error`} className="text-sm text-highlight">
            {form.formState.errors.recipient?.message}
          </p>
        </div>
        <label className="flex items-start gap-3 text-sm leading-6">
          <input
            type="checkbox"
            className="mt-1"
            aria-invalid={form.formState.errors.acknowledge !== undefined}
            aria-describedby={`${id}-ack-error`}
            {...form.register('acknowledge', {
              required: 'Acknowledge the ownership and access change.',
            })}
          />
          I understand that I will lose private access and that this does not
          complete the case.
        </label>
        <p id={`${id}-ack-error`} className="text-sm text-highlight">
          {form.formState.errors.acknowledge?.message}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="submit">Confirm handover</Button>
          <Button type="button" variant="quiet" onClick={onClose}>
            Keep my ownership
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}
