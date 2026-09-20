import { Button } from '@ergon/ui-web';

export function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-sm font-bold tracking-[0.18em] text-accent-strong uppercase">
          404 · Route not found
        </p>
        <h1 className="mt-4 font-display text-5xl tracking-tight">
          This workbench view does not exist.
        </h1>
        <p className="mx-auto mt-5 max-w-lg leading-7 text-ink-muted">
          The requested location is not part of the current resolver experience.
        </p>
        <Button asChild className="mt-8">
          <a href="/">Return to the workbench</a>
        </Button>
      </div>
    </main>
  );
}
