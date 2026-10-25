import type { ReactElement, ReactNode } from 'react';

/** Requester-only chrome/landmarks; feature children own content, never outer layout. */
export function RequesterFrame({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only rounded bg-ink p-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-10"
      >
        Skip to main content
      </a>
      <header className="border-b border-border bg-surface/90">
        <div className="mx-auto flex max-w-[100rem] flex-wrap items-center justify-between gap-3 px-5 py-5 lg:px-8">
          <a
            href="/"
            className="flex flex-wrap items-center gap-4 text-3xl font-black tracking-tight"
            aria-label="Ergon requester home"
          >
            Ergon{' '}
            <span className="border-l border-border pl-4 text-base font-bold tracking-normal">
              Your request
            </span>
          </a>
          <span className="text-xs font-bold tracking-widest uppercase">
            Private case progress
          </span>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[100rem] flex-1 px-5 py-6 lg:px-8"
      >
        {children}
      </main>
      <footer className="mx-auto w-full max-w-[100rem] px-5 py-6 text-sm text-ink-muted lg:px-8">
        Only your explicitly accessible case progress. No resolver controls.
      </footer>
    </div>
  );
}
