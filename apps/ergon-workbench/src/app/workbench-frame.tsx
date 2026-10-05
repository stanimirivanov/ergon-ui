import type { PropsWithChildren } from 'react';
import { Link } from 'react-router';

interface WorkbenchFrameProps extends PropsWithChildren {
  readonly statusLabel: string;
}

/** Shared workbench landmarks, skip navigation, status, and milestone footer. */
export function WorkbenchFrame({ children, statusLabel }: WorkbenchFrameProps) {
  return (
    <div className="workbench-frame min-h-screen">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>

      <header className="workbench-frame-header border-b border-border/80 bg-surface/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <Link
            className="flex items-center gap-3"
            to="/"
            aria-label="Ergon home"
          >
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center rounded-xl bg-ink font-display text-xl text-white"
            >
              E
            </span>
            <span>
              <span className="block text-sm font-bold tracking-[0.16em] uppercase">
                Ergon
              </span>
              <span className="block text-xs text-ink-muted">
                Resolver workbench
              </span>
            </span>
          </Link>
          <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-bold tracking-wide text-accent-strong uppercase">
            {statusLabel}
          </span>
        </div>
      </header>

      <main id="main-content">{children}</main>

      <footer className="workbench-frame-footer mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <p>Ergon open resolution infrastructure.</p>
        <p>M05 · Human follow-up and resolver console</p>
      </footer>
    </div>
  );
}
