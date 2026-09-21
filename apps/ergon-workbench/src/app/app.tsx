import { Button } from '@ergon/ui-web';

const principles = [
  {
    number: '01',
    title: 'Evidence before inference',
    description:
      'Resolvers work from attributable observations and explicit unknowns, not reconstructed chat history.',
  },
  {
    number: '02',
    title: 'Authority before action',
    description:
      'Every consequential operation remains bounded by policy, identity, scope, and durable approval.',
  },
  {
    number: '03',
    title: 'Proof before closure',
    description:
      'A case is resolved only when its desired outcome has independent, accepted evidence.',
  },
] as const;

export function App() {
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>

      <header className="border-b border-border/80 bg-surface/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <a
            className="flex items-center gap-3"
            href="/"
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
          </a>
          <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-bold tracking-wide text-accent-strong uppercase">
            Session boundary
          </span>
        </div>
      </header>

      <main id="main-content">
        <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.3fr_0.7fr] lg:px-10 lg:py-28">
          <div className="max-w-3xl">
            <p className="mb-6 flex items-center gap-3 text-sm font-bold tracking-[0.18em] text-accent-strong uppercase">
              <span className="h-px w-10 bg-highlight" aria-hidden="true" />
              Resolution operations
            </p>
            <h1 className="font-display text-5xl leading-[0.98] tracking-[-0.04em] text-ink sm:text-6xl lg:text-7xl">
              Evidence in.
              <br />
              Verified outcomes out.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-ink-muted">
              Ergon gives resolvers one structured view of the case, the
              authority behind each action, and the proof required to call the
              work complete.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button asChild>
                <a href="#foundation">Review the session boundary</a>
              </Button>
              <p className="max-w-xs text-sm leading-6 text-ink-muted">
                Resolver data remains closed until the control plane verifies a
                tenant-scoped actor.
              </p>
            </div>
          </div>

          <aside
            id="foundation"
            className="relative overflow-hidden rounded-[2rem] border border-border bg-ink p-8 text-white shadow-[0_30px_80px_rgb(24_32_25_/_16%)]"
            aria-labelledby="foundation-title"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-28 -top-28 size-44 rounded-full border-[28px] border-highlight/20"
            />
            <p className="text-xs font-bold tracking-[0.2em] text-highlight uppercase">
              Current capability
            </p>
            <h2 id="foundation-title" className="mt-4 font-display text-3xl">
              Session gate ready
            </h2>
            <p className="mt-4 leading-7 text-white/70">
              RTK Query owns request state while Effect acquires credentials,
              executes the request, bounds retries and timeouts, and validates
              every response before it enters the cache.
            </p>
            <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-white/15 pt-6">
              <div>
                <dt className="text-xs tracking-wide text-white/55 uppercase">
                  Runtime
                </dt>
                <dd className="mt-1 text-lg font-semibold">React + Redux</dd>
              </div>
              <div>
                <dt className="text-xs tracking-wide text-white/55 uppercase">
                  Workspace
                </dt>
                <dd className="mt-1 text-lg font-semibold">Effect boundary</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="border-y border-border/80 bg-surface/65">
          <div className="mx-auto grid max-w-7xl divide-y divide-border px-6 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-10">
            {principles.map((principle) => (
              <article
                className="py-10 md:px-8 md:first:pl-0 md:last:pr-0"
                key={principle.number}
              >
                <p className="font-display text-2xl text-highlight">
                  {principle.number}
                </p>
                <h2 className="mt-5 text-lg font-bold">{principle.title}</h2>
                <p className="mt-3 text-sm leading-6 text-ink-muted">
                  {principle.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <p>Ergon open resolution infrastructure.</p>
        <p>M05 · Human follow-up and resolver console</p>
      </footer>
    </div>
  );
}

export default App;
