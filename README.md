# Ergon UI

## TL;DR

Ergon UI is the browser workspace for Ergon's evidence-led resolution
experiences. The repository contains the resolver workbench, a typed
confidential-BFF boundary, a read-only human follow-up inbox, and a web-only UI
package. The requester application, React Native clients, forms, and animation
enter only with a slice that uses them.

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
- Vitest component tests and a Chromium Playwright smoke path;
- enforced project tags and an accepted application-topology decision; and
- a contributor, security, issue, pull-request, and CI harness.

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

## Repository shape

```text
apps/
  ergon-workbench/       Internal resolver experience
  ergon-workbench-e2e/   Browser verification
packages/
  ui-web/                DOM and Tailwind-specific UI source
docs/
  decisions/             Durable UI architecture decisions
  development/           Engineering rules and current state
```

The eventual external adaptive canvas will be a separate
`apps/ergon-requester` deployable. It will be created with its first usable
requester slice, not as an empty placeholder. Platform-neutral packages and
React Native applications follow the same rule.

Ergon's product and backend contracts remain authoritative in the
[core repository](https://github.com/stanimirivanov/rag-help-center).

## Working agreement

Read [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md), and the
[engineering standards](docs/development/engineering-standards.md) before
changing the workspace. Each change delivers one reviewable capability and is
assigned to the existing Ergon milestone that owns that behavior.

## License

Apache License 2.0. See [LICENSE](LICENSE).
