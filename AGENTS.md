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

## Architecture

- Applications compose routes and platform adapters. Feature code owns user
  behavior. UI packages contain presentation. Contract packages remain free of
  React, Redux, the DOM, Tailwind, browser storage, and provider SDKs.
- `@ergon/ui-web` is intentionally web-only. Never present Tailwind or shadcn
  components as React Native abstractions.
- Create a package only when current behavior uses it. Avoid `common`, `core`,
  `helpers`, generic service interfaces, empty applications, and speculative
  native structure.
- Treat HTTP payloads, OpenAPI, runtime configuration, URLs, browser storage,
  and design tokens as compatibility boundaries.

## React and TypeScript

- Keep TypeScript strict and prefer immutable values and discriminated unions.
- RTK Query owns remote cache state; React Hook Form owns form state; the URL
  owns shareable navigation state; local React state owns local interaction.
- Effect belongs at untrusted and asynchronous boundaries. It must not replace
  RTK Query caching or ordinary React rendering.
- Exported APIs document non-obvious purpose, invariants, constraints, and
  errors. Comments explain reasons and constraints, never syntax.
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

Run `pnpm verify`. A skipped or unavailable check is not a pass. Finish every
coding task with the exact milestone, copy/paste-ready issue title and body,
limitations, and passed/failed/not-run checks described in
[CONTRIBUTING.md](CONTRIBUTING.md#completion-report).
