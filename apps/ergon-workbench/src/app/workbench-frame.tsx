import {
  useEffect,
  useRef,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Link, useLocation } from 'react-router';
import { LocalSignOutControl } from '@ergon/session-feature-web';

interface WorkbenchFrameProps extends PropsWithChildren {
  readonly statusLabel: string;
  readonly mode?: 'standard' | 'focused';
  readonly navigation?: ReactNode;
  readonly toolbar?: ReactNode;
}

/**
 * Owns workbench chrome, landmarks and available viewport space. Capability
 * controls occupy a naturally sized toolbar row, never an assumed header height.
 * Mode comes directly from the workflow's render slot, not inferred descendants.
 * The main/content positions stay stable across detours to preserve mounted intent.
 */
export function WorkbenchFrame({
  children,
  statusLabel,
  mode = 'standard',
  navigation,
  toolbar,
}: WorkbenchFrameProps): ReactElement {
  const { pathname, search } = useLocation();
  // A bare fragment resolves against index.html's root base, losing the tenant
  // and selected capability. Keep this native focus target on the current URL.
  const mainContentHref = `${pathname}${search}#main-content`;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (mode === 'focused') heading.current?.focus();
  }, [mode]);

  return (
    <div
      data-workbench-mode={mode}
      className={
        mode === 'focused'
          ? 'workbench-frame flex min-h-dvh min-w-0 flex-col xl:h-dvh'
          : 'workbench-frame flex min-h-dvh min-w-0 flex-col'
      }
    >
      <a
        href={mainContentHref}
        className="sr-only z-50 rounded-md bg-ink px-4 py-2 text-canvas focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>

      <header className="shrink-0 border-b border-border bg-surface">
        <div
          className={
            mode === 'focused'
              ? 'flex min-h-16 flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 lg:px-6'
              : 'mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5 lg:px-10'
          }
        >
          <Link
            className="flex items-center gap-3"
            to="/"
            aria-label="Ergon home"
          >
            <span
              aria-hidden="true"
              className={
                mode === 'focused'
                  ? 'grid size-9 place-items-center rounded-md border border-accent/60 bg-canvas font-display text-xl font-bold text-accent-strong'
                  : 'grid size-10 place-items-center rounded-xl bg-ink font-display text-xl text-white'
              }
            >
              E
            </span>
            <span>
              <span className="block text-sm font-bold tracking-[0.16em] uppercase">
                Ergon
              </span>
              <span
                className={
                  mode === 'focused' ? 'hidden' : 'block text-xs text-ink-muted'
                }
              >
                Resolver workbench
              </span>
            </span>
          </Link>
          {mode === 'focused' ? (
            <h1
              ref={heading}
              tabIndex={-1}
              className="min-w-0 flex-1 text-2xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-strong"
            >
              Resolver Console
            </h1>
          ) : null}
          <span className="rounded-md border border-accent/60 bg-accent/10 px-3 py-1.5 text-xs font-bold tracking-wide text-accent-strong uppercase">
            {statusLabel}
          </span>
          {mode === 'focused' ? navigation : null}
          <LocalSignOutControl />
        </div>
        {mode === 'standard' ? navigation : null}
        <div
          className={
            mode === 'focused' ? 'px-3 pt-3 pb-3 sm:px-4 lg:px-5' : undefined
          }
        >
          {toolbar}
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className={
          mode === 'focused'
            ? 'flex min-h-0 min-w-0 flex-1 flex-col gap-3 px-3 py-4 sm:px-4 lg:px-5 xl:overflow-y-auto'
            : 'min-w-0 flex-1'
        }
      >
        {children}
      </main>

      {mode === 'standard' ? (
        <footer className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-6 py-8 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <p>Ergon open resolution infrastructure.</p>
          <p>M05 · Adaptive resolution experience</p>
        </footer>
      ) : null}
    </div>
  );
}
