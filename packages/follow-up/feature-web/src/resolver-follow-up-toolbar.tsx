import { Button } from '@ergon/ui-web';
import type { ReactElement, ReactNode, RefObject } from 'react';

/**
 * Capability actions passed to the app shell. Explicit recheck moves focus to
 * the stable Back control before claim presence retires; no queued focus work
 * can steal pane or app-heading focus after a later response.
 */
export function ResolverFollowUpToolbar({
  onBack,
  onRecheckOwnership,
  renderPresence,
  backRef,
}: {
  readonly onBack: () => void;
  readonly onRecheckOwnership: () => void;
  readonly renderPresence?: (onRecheckOwnership: () => void) => ReactNode;
  readonly backRef: RefObject<HTMLButtonElement | null>;
}): ReactElement {
  function handleRecheck(): void {
    backRef.current?.focus();
    onRecheckOwnership();
  }
  return (
    <div className="flex min-w-0 flex-wrap items-start gap-3">
      <Button
        ref={backRef}
        type="button"
        variant="quiet"
        size="compact"
        onClick={onBack}
      >
        Back to active work
      </Button>
      {renderPresence?.(handleRecheck)}
    </div>
  );
}
