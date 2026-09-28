# Repository working agreement

This is the concise tool-facing entry point. [CONTRIBUTING.md](CONTRIBUTING.md)
is the canonical workflow policy.

## TL;DR

Deliver one verified UI slice at a time. Keep server state in RTK Query once it
is introduced, keep platform-specific UI out of shared contracts, preserve
accessibility and security boundaries, and report checks exactly as run.

## Before changing anything

1. Read [CONTRIBUTING.md](CONTRIBUTING.md), the relevant application or package
   README, [engineering standards](docs/development/engineering-standards.md),
   and accepted ADRs.
2. Inspect the branch and working tree. Preserve pre-existing changes and keep
   unrelated work out of the task.
3. Define one independently reviewable behavior and its existing Ergon
   milestone. Do not create a UI-only milestone.
4. Identify affected browser contracts, authentication, tenant isolation,
   accessibility, responsive behavior, telemetry, and deployment configuration.
5. For every affected architectural responsibility, identify its current and
   proposed owner, public API, and dependency direction before editing code.

## Architecture

- Group projects by business capability, then by the concrete `model`,
  `application`, `data-access`, `feature`, `ui`, `app`, or `test` role defined
  in ADR 0011. Every Nx project has one `type:*`, `scope:*`, and `platform:*`
  tag and is consumed only through its public API.
- New packages use `packages/<scope>/<role[-platform]>`; only `packages/ui-web`
  is a current special location. Old global-layer paths are a finite migration
  ledger, not a naming option. Deployables and end-to-end projects use `apps/*`
  with `type:app` and `type:test`, respectively.
- Models own platform-neutral values and pure semantic refinements. Data-access
  projects own protocols, Effect execution, transport state, and RTK Query.
  Feature projects own capability React behavior and presentation. Apps own
  routes, providers, store assembly, configuration, and dependency binding.
- Application projects are optional and MUST contain executable,
  platform-neutral use-case policy or workflow behavior. Define ports beside
  the application behavior that consumes them; do not add interface-only or
  pass-through application projects. Adding one requires an accepted decision
  path in the architecture policy ledger.
- A feature may consume data access directly for a cache-centric slice without
  client-owned application policy. When a genuine use case exists, the feature
  calls it and composition supplies its data-access port implementation.
- `@ergon/ui-web` owns web-only, domain-agnostic primitives. It may depend only
  on other UI projects and is not a React Native abstraction.
- Model and application library builds extend `tsconfig.core.json`. Do not add
  DOM or ambient platform types; named legacy exceptions are migration debt.
- Create a package only when current behavior uses it. Avoid `common`, `core`,
  `helpers`, generic service interfaces, empty applications, and speculative
  native structure.
- Treat HTTP payloads, OpenAPI, runtime configuration, URLs, browser storage,
  and design tokens as compatibility boundaries.

## React and TypeScript

- Keep TypeScript strict and prefer immutable values and discriminated unions.
- Declare return types on supported APIs and non-trivial protocol, decoding,
  persistence, and asynchronous boundary functions. Small local callbacks may
  rely on inference when the result is immediate and unambiguous.
- RTK Query owns remote cache state; React Hook Form owns form state; the URL
  owns shareable navigation state; local React state owns local interaction.
- Effect belongs at untrusted and asynchronous boundaries. It must not replace
  RTK Query caching or ordinary React rendering.
- Supported public APIs document non-obvious purpose, invariants, constraints,
  ownership, side effects, and errors at their owning declarations. An
  `export` used only between implementation modules does not by itself require
  TSDoc. Comments explain reasons and constraints, never syntax.
- For ports and asynchronous boundaries, document cancellation, retry,
  timeout, idempotency, lifetime, and typed-failure semantics when relevant.
  Do not add documentation merely to satisfy a count.
- Use semantic HTML first, keyboard-visible focus, reduced-motion behavior, and
  accessible names. Color and animation cannot be the only state signal.

## Security

- Never persist access tokens, authority evidence, case payloads, or personal
  data in Redux, local storage, URLs, logs, or analytics.
- A tenant identifier selected in the UI is navigation context, not authority.
- Do not bind production UI behavior to `/internal/v1` endpoints. Promote a
  reviewed browser contract first.
- Render model and evidence content as untrusted data and never inject raw HTML.

## Completion

Run `pnpm verify`, including its architecture check. A skipped or unavailable
check is not a pass. Finish every
coding task with the exact milestone, copy/paste-ready issue title and body,
limitations, and passed/failed/not-run checks described in
[CONTRIBUTING.md](CONTRIBUTING.md#completion-report).
