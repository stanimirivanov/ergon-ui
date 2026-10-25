import type { ReactElement, ReactNode } from 'react';

/** Requester-only chrome/landmarks; feature children own content, never outer layout. */
export function RequesterFrame({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only rounded bg-ink p-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      <header className="border-b-2 border-border bg-surface/90">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-5">
          <a
            href="/"
            className="text-xl font-black tracking-widest uppercase"
            aria-label="Ergon requester home"
          >
            Ergon{' '}
            <span className="text-sm font-medium tracking-normal">
              Requester
            </span>
          </a>
          <span className="text-xs font-bold tracking-widest uppercase">
            Private case progress
          </span>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-5xl px-5 py-8 sm:py-12">
        {children}
      </main>
      <footer className="mx-auto max-w-5xl px-5 py-8 text-sm text-ink-muted">
        Only your explicitly accessible case progress. No resolver controls.
      </footer>
    </div>
  );
}
