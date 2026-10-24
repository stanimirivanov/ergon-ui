import type { FollowUpPriorityCommand } from '@ergon/follow-up-data-access-web';
import type {
  FollowUpPriority,
  ResolverOwnedHumanFollowUpWork,
} from '@ergon/follow-up-model';
import { Button, ModalDialog } from '@ergon/ui-web';
import {
  useId,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from 'react';
import { useForm } from 'react-hook-form';

/** Capture only a confirmed immutable intent under fresh owned disclosure, never an optimistic resource. */
export function ConfirmedFollowUpPriority({
  tenantId,
  item,
  onConfirm,
}: {
  readonly tenantId: string;
  readonly item: ResolverOwnedHumanFollowUpWork;
  readonly onConfirm: (command: FollowUpPriorityCommand) => void;
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
        disabled={item.workItem.priorityRevision >= Number.MAX_SAFE_INTEGER}
        onClick={() => setOpen(true)}
      >
        Change priority
      </Button>
      {open && (
        <PriorityForm
          key={`${item.claim.claimId}:${item.workItem.ownershipRevision}:${item.workItem.priorityRevision}`}
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

function PriorityForm({
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
  readonly onConfirm: (command: FollowUpPriorityCommand) => void;
}): ReactElement {
  const id = useId();
  const submitted = useRef(false);
  const form = useForm<{ priority: FollowUpPriority; acknowledge: boolean }>({
    defaultValues: { priority: item.workItem.priority, acknowledge: false },
  });
  return (
    <ModalDialog
      id={id}
      title="Change owned follow-up priority"
      dismissLabel="Cancel priority change"
      returnFocusRef={trigger}
      onDismiss={onClose}
    >
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit((values) => {
          if (submitted.current) return;
          submitted.current = true;
          onConfirm({
            tenantId,
            workItemId: item.workItem.workItemId,
            claimId: item.claim.claimId,
            expectedOwnershipRevision: item.workItem.ownershipRevision,
            expectedPriorityRevision: item.workItem.priorityRevision,
            priority: values.priority,
            commandId: crypto.randomUUID(),
          });
        })}
      >
        <p className="text-sm leading-6 text-ink-muted">
          Priority is administrative metadata. It does not reorder queues,
          change risk or SLA, transfer ownership, authorize execution or accept
          proof. Every confirmed new intent advances the independent priority
          revision, even if the value is unchanged.
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
          <div>
            <dt>Current observed priority</dt>
            <dd>
              {item.workItem.priority} · revision{' '}
              {item.workItem.priorityRevision}
            </dd>
          </div>
        </dl>
        <label className="block text-sm font-bold" htmlFor={`${id}-priority`}>
          New priority
        </label>
        <select
          id={`${id}-priority`}
          className="w-full rounded border border-border bg-surface p-2 text-ink"
          {...form.register('priority', { required: true })}
        >
          {(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <label className="flex items-start gap-3 text-sm leading-6">
          <input
            type="checkbox"
            className="mt-1"
            aria-invalid={form.formState.errors.acknowledge !== undefined}
            aria-describedby={`${id}-error`}
            {...form.register('acknowledge', {
              required: 'Acknowledge this priority assignment.',
            })}
          />
          I understand this changes metadata only, not ownership, execution or
          proof.
        </label>
        <p id={`${id}-error`} className="text-sm text-highlight">
          {form.formState.errors.acknowledge?.message}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="submit">Confirm priority assignment</Button>
          <Button type="button" variant="quiet" onClick={onClose}>
            Keep current priority
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}
