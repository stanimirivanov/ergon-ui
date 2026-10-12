import type { ReactElement, ReactNode } from 'react';

interface ThreePaneLayoutProps {
  readonly leading: ReactNode;
  readonly primary: ReactNode;
  readonly trailing: ReactNode;
  /** Nonempty feature-owned names for the keyboard-scroll viewports. */
  readonly leadingLabel: string;
  readonly primaryLabel: string;
  readonly trailingLabel: string;
}

/**
 * Allocates three named slots in reading order, stacking below desktop width.
 * Slots supply their own landmarks and headings. The parent supplies available
 * space and outer spacing; no header height or domain state is assumed here.
 * On desktop, each slot scrolls within the space left by the actual shell rows.
 * A usable minimum prevents a tall context header from collapsing those scroll
 * viewports; the surrounding shell can scroll when the available height is short.
 * Named groups are tabbable even when their content has no interactive control:
 * browser-specific automatic focusability is not portable keyboard access.
 */
export function ThreePaneLayout({
  leading,
  primary,
  trailing,
  leadingLabel,
  primaryLabel,
  trailingLabel,
}: ThreePaneLayoutProps): ReactElement {
  return (
    <div className="grid min-h-0 min-w-0 flex-1 gap-3 xl:min-h-64 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.8fr)_minmax(0,1.05fr)]">
      <div
        data-pane-slot="leading"
        role="group"
        aria-label={leadingLabel}
        tabIndex={0}
        className="flex min-h-0 min-w-0 flex-col focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-strong xl:overflow-y-auto"
      >
        {leading}
      </div>
      <div
        data-pane-slot="primary"
        role="group"
        aria-label={primaryLabel}
        tabIndex={0}
        className="flex min-h-0 min-w-0 flex-col focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-strong xl:overflow-y-auto"
      >
        {primary}
      </div>
      <div
        data-pane-slot="trailing"
        role="group"
        aria-label={trailingLabel}
        tabIndex={0}
        className="flex min-h-0 min-w-0 flex-col focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-strong xl:overflow-y-auto"
      >
        {trailing}
      </div>
    </div>
  );
}
