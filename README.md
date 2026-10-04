# Ergon UI

## TL;DR

Ergon UI is the browser workspace for Ergon's evidence-led resolution
experiences. The repository contains the resolver workbench, a typed
confidential-BFF boundary, a human follow-up inbox with CSRF-protected claiming,
an active claimed-work view, and a web-only UI package. The requester
application, React Native clients, forms, and animation enter only with a slice
that uses them.

## Current status

The first foundation provides:

- React 19.3 in an Nx and pnpm workspace;
- one Vite-built `ergon-workbench` application using React Router Data Mode;
- Tailwind CSS and a shadcn-compatible `@ergon/ui-web` source package;
- RTK Query request state backed by an Effect HTTP, timeout, retry, decoding,
  and typed-error pipeline;
- a fail-closed tenant session route over the confidential BFF contract;
- explicit sign-in navigation that never exposes provider tokens to React;
- a schema-decoded resolver inbox with shareable queue filtering and bounded
  keyset pagination;
- an accessible claim interaction with ephemeral CSRF handling, typed
  failures, explicit safe retry, and tenant inbox invalidation;
- a schema-decoded active-work view with exact claim-cursor pagination and
  post-claim cache refresh;
- lazy, server-authorized case context for owned follow-ups, including the
  pinned resolution contract, escalated run, bounded observation evidence,
  failed connector execution, and exhausted retry decision;
- Vitest component tests and a Chromium Playwright smoke path;
- [local executable guides](apps/ergon-workbench-e2e/README.md) for workbench
  access states, shared-inbox navigation, follow-up handling, owned-context
  revalidation, claim recovery, and release recovery, generated from asserted
  browser paths with explicitly simulated BFF data;
- enforced capability-first project roles and an accepted application-topology
  decision; and
- a progressively routed contributor harness with repository and architecture
  policy sensors, review templates, and staged CI feedback.

The control-plane contracts are connected through same-origin cookies. A live
login and inbox require an OIDC-enabled control plane, identity provider, actor
binding, and current resolver authority. See
[current state](docs/development/current-state.md).

## Prerequisites

- Node.js 24 LTS
- Corepack

Install and verify:

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```

Run the workbench locally:

```powershell
pnpm dev
```

Nx serves it at `http://localhost:4200` by default.

## Target repository shape

```text
apps/
  ergon-workbench/       Internal resolver experience
  ergon-workbench-e2e/   Browser verification
packages/
  follow-up/             Target group for follow-up model, data, and feature projects
  session/               Target group for session model, data, and feature projects
  ui-web/                DOM and Tailwind-specific UI source
docs/
  decisions/             Durable UI architecture decisions
  development/           Engineering rules and current state
```

Existing `packages/domain`, `packages/application`, and
`packages/infrastructure` paths are finite migration locations. Project
`type:*` tags describe their current responsibility until capability-scoped
moves are completed; new projects must use the capability-first layout. The
current-to-target map is maintained in [the architecture guide](docs/architecture.md#project-roles-and-dependency-direction).

The eventual external adaptive canvas will be a separate
`apps/ergon-requester` deployable. It will be created with its first usable
requester slice, not as an empty placeholder. Platform-neutral packages and
React Native applications follow the same rule.

Ergon's product and backend contracts remain authoritative in the
[core repository](https://github.com/stanimirivanov/rag-help-center).

## Working agreement

Read [AGENTS.md](AGENTS.md) and [CONTRIBUTING.md](CONTRIBUTING.md), then use the
[documentation map](docs/README.md) to load only the relevant engineering,
package, security, and decision sources. The
[coding harness](docs/development/harness.md) explains feedback tiers. Each
change delivers one reviewable capability and is assigned to the existing
Ergon milestone that owns that behavior.

## License

Apache License 2.0. See [LICENSE](LICENSE).
