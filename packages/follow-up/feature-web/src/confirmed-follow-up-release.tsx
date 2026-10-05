import { Button } from '@ergon/ui-web';
import { useEffect, useId, useRef, useState, type ReactElement } from 'react';

interface ConfirmedFollowUpReleaseProps {
  readonly context: 'owned-card' | 'resolver-console';
  readonly reason: string;
  readonly caseId: string;
  readonly queueKey: string;
  readonly isDisabled: boolean;
  readonly busyLabel?: string;
  readonly onConfirmRelease: () => void;
}

/** Keeps release confirmation and keyboard focus consistent across owned work surfaces. */
export function ConfirmedFollowUpRelease({
  context,
  reason,
  caseId,
  queueKey,
  isDisabled,
  busyLabel,
  onConfirmRelease,
}: ConfirmedFollowUpReleaseProps): ReactElement {
  const [isConfirming, setConfirming] = useState(false);
  const consequenceId = useId();
  const releaseButton = useRef<HTMLButtonElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const restoreFocusAfterCancel = useRef(false);

  useEffect(() => {
    if (isConfirming) {
      confirmButton.current?.focus();
    } else if (restoreFocusAfterCancel.current) {
      releaseButton.current?.focus();
      restoreFocusAfterCancel.current = false;
    }
  }, [isConfirming]);

  function cancelRelease(): void {
    restoreFocusAfterCancel.current = true;
    setConfirming(false);
  }

  function confirmRelease(): void {
    setConfirming(false);
    onConfirmRelease();
  }

  const isConsole = context === 'resolver-console';
  return isConfirming ? (
    <div
      role="group"
      aria-label={
        isConsole
          ? 'Confirm release to shared queue'
          : `Release ${reason} follow-up`
      }
      aria-describedby={consequenceId}
      className={`${isConsole ? '' : 'w-full'} rounded-md border border-highlight/50 bg-highlight/10 p-4`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          cancelRelease();
        }
      }}
    >
      <p id={consequenceId} className="break-words text-sm leading-6 text-ink">
        Releasing returns this work to its original shared queue. It does not
        complete the case. Case <span className="font-mono">{caseId}</span> ·
        queue <span className="font-semibold">{queueKey}</span>.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Button
          ref={confirmButton}
          type="button"
          disabled={isDisabled}
          aria-describedby={consequenceId}
          className={isConsole ? 'text-canvas' : undefined}
          onClick={confirmRelease}
        >
          Confirm release
        </Button>
        <Button type="button" variant="quiet" onClick={cancelRelease}>
          Cancel
        </Button>
      </div>
    </div>
  ) : (
    <Button
      ref={releaseButton}
      type="button"
      variant="quiet"
      className={isConsole ? 'rounded-md' : undefined}
      disabled={isDisabled}
      aria-label={
        isConsole ? 'Release to shared queue' : `Release ${reason} follow-up`
      }
      onClick={() => setConfirming(true)}
    >
      {busyLabel ?? (isConsole ? 'Release to shared queue' : 'Release work')}
    </Button>
  );
}
