# Contributing to Ergon UI

## TL;DR

- Deliver one coherent, verified capability per issue and pull request.
- Assign UI work to the existing Ergon milestone that owns the behavior.
- Add dependencies and packages only when the current slice uses them.
- Preserve strict TypeScript, explicit state ownership, accessibility, and
  tenant-aware security boundaries.
- Run `pnpm verify` and report every check honestly.

## Policy and sources of truth

In this repository, **MUST** and **MUST NOT** are requirements. **SHOULD** and
**SHOULD NOT** are strong defaults whose exceptions require a recorded reason.

| Concern                                       | Canonical source                                                   |
| :-------------------------------------------- | :----------------------------------------------------------------- |
| Workflow, review, issue structure, completion | This document                                                      |
| Concise agent entry point                     | [AGENTS.md](AGENTS.md)                                             |
| React, TypeScript, UI, state, tests           | [engineering standards](docs/development/engineering-standards.md) |
| Durable UI architecture                       | [ADRs](docs/decisions/README.md)                                   |
| Product, backend contracts, milestones        | [Ergon core](https://github.com/stanimirivanov/rag-help-center)    |
| Exact project commands and ownership          | The project README and checked-in configuration                    |

Accepted ADRs govern until superseded. Surface conflicts instead of choosing a
convenient interpretation silently.

## Before starting

A contributor MUST inspect the branch and working tree, read the relevant
standards and ADRs, define the smallest independently valuable behavior, and
identify contract, authentication, tenant, accessibility, responsive, browser
compatibility, rollout, and observability effects.

For an architecture change, identify each affected responsibility, its owner
before and after the change, its public contract, and every new dependency
edge. If a slice adds a responsibility to an existing project, explain why it
shares the same reason to change rather than defaulting to the nearest file.

Use an ADR when a choice affects compatibility, security, deployment topology,
foundational technology, persistent browser data, design-token meaning, or
more than one application.

## Issue timing and milestones

Issue-first is preferred. Implementation requested without an issue ends with
proposed issue text. UI work uses the existing domain milestone; do not create a
separate UI milestone. For example, a case timeline remains M01, approval UI is
M03, verified execution UI is M04, and follow-up work is M05.

Use this issue body:

```markdown
**Milestone:** MNN - Outcome

## Goal

Describe the problem and observable result.

## Scope

- Included behavior and boundaries.

## Design decisions

- Important choices, assumptions, compatibility effects, and ADR links.

## Architecture delta

| Responsibility | Owner before | Owner after | Public contract |
| -------------- | ------------ | ----------- | --------------- |
| ...            | ...          | ...         | ...             |

- Dependency edges added or removed.

## Acceptance criteria

- [ ] Observable behavior and verification evidence.
- [ ] Relevant negative, accessibility, and failure behavior.
- [ ] Documentation, security, and operational effects.

## Out of scope

- Explicit exclusions and deferred work.
```

## Pull-request-sized work

A pull request MUST leave the workspace buildable and deliver one behavior with
its tests and documentation. Split independent features, dependency upgrades,
broad restyling, generated churn, and architecture decisions. Do not create an
empty app, package, adapter, state slice, or design-system abstraction for a
future task.

## Architecture and state

- Applications may depend on feature, data, contract, and UI packages. Web UI
  packages do not depend on applications or data access.
- Every Nx project has exactly one `type:*`, `scope:*`, and `platform:*` tag,
  imports other projects only through their public APIs, and documents what it
  owns and deliberately excludes.
- Domain projects contain platform-neutral models and invariants. Application
  projects define use-case inputs, outcomes, and consumed ports. Ports are
  segregated by capability; an adapter implementing several ports does not
  justify exposing one broad client to every consumer.
- Adapters own wire schemas, protocol mapping, transport execution, and
  platform state. Feature code owns orchestration. Presentational UI receives
  explicit view state and callbacks rather than fetching or decoding data.
- Platform-neutral contracts do not import React, React Router, Redux,
  Tailwind, browser APIs, or native APIs.
- RTK Query owns remote caching and invalidation. Redux slices hold only real
  cross-route client state. URL parameters own shareable filters. React Hook
  Form owns form state. React state owns local interaction.
- Effect may execute HTTP, decode untrusted data, enforce timeouts, and map
  typed errors. It does not add another cache or leak Effect values into JSX.
- Mutations are not retried unless the server contract makes replay safe.

## TypeScript and naming

- Prettier, ESLint, and `.editorconfig` own mechanical formatting.
- Keep `strict`, `exactOptionalPropertyTypes`, and
  `noUncheckedIndexedAccess` enabled.
- Use `PascalCase` for components and types, `camelCase` for functions and
  values, `UPPER_SNAKE_CASE` for true constants, and `useX` only for hooks.
- Boolean names state the true condition: `isClaimed`, `hasAuthority`,
  `canRetry`. Event handlers describe the event or intent: `handleClaim` or
  `onClaimRequested`.
- Name wire payloads for their protocol meaning. Do not call a response DTO a
  domain model. Avoid vague `Common`, `Base`, `Manager`, `Helper`, `Util`, and
  `Service` names when a capability-specific name exists.
- Prefer `unknown` at untrusted boundaries, immutable values, exhaustive
  discriminated unions, and explicit nullable meaning. Avoid `any`, non-null
  assertions, type assertions used as validation, and mutable module globals.

## TSDoc and comments

Document exported APIs when their purpose, invariants, parameter or return
constraints, side effects, concurrency, or meaningful errors are not obvious
from the name and type. Add an example only when correct use is not obvious;
prefer an imported, compiled example or executable test over a free-form block
that can drift.

Explain reasons, compatibility constraints, accessibility decisions, security
boundaries, and deliberate performance trade-offs. Never narrate syntax. Skip
members whose names and types already say everything—uninformative comments are
a maintenance liability. Delete stale and commented-out code.

## React and presentation

- Components render behavior; route modules compose features; data access stays
  outside presentational primitives.
- Effects triggered by user intent belong in event handlers. `useEffect` is for
  synchronization with an external system, not derived state.
- Preserve semantic landmarks, heading order, label associations, keyboard
  operation, visible focus, and reduced-motion preferences.
- shadcn source is owned code. Review generated output and keep primitives in
  `@ergon/ui-web`; feature compositions stay with the feature.
- Use semantic design tokens rather than scattering literal product colors.
  Motion supplements meaningful state transitions; CSS handles simple effects.

## Security and privacy

Treat API data, model output, evidence, URLs, files, and runtime configuration
as untrusted. Decode inputs before use. Never render raw HTML, authorize from a
client-selected tenant, put secrets in Vite variables, or persist bearer tokens
and sensitive case data in browser storage. A browser-visible environment value
is public even when its name contains `SECRET`.

## Testing

Test observable behavior at the lowest convincing boundary:

- pure functions and schemas with unit tests;
- components with Testing Library through roles and accessible names;
- HTTP behavior through protocol-level fakes such as MSW once introduced; and
- a small set of Playwright flows for routing, authentication, and critical
  resolver behavior.

Cover loading, empty, malformed, unauthorized, forbidden, conflict, timeout,
cancellation, retry, and stale states when relevant. Tests must not depend on
wall time, ordering, external services, locale, or network availability unless
that behavior is under test.

## Dependencies and generated code

A dependency needs current behavior, compatible licensing, active maintenance,
a bounded security review, a pinned resolution, and a removal path. Keep all
Nx package versions aligned. Commit `pnpm-lock.yaml`; never hand-edit it.
Generated code is reviewed like authored code and committed only when consumers
need it and regeneration is deterministic.

## Verification

The baseline is:

```powershell
pnpm verify
```

It checks formatting, linting, strict type checking, component tests, the
production build, architecture metadata, and Chromium Playwright behavior. A
check that is skipped or cannot run is **not run**, not passed.

## Completion report

After every coding task, provide:

1. the exact milestone as `MNN - Outcome`;
2. a proposed GitHub issue title;
3. a copy/paste-ready Markdown issue body using the required structure;
4. assumptions, unresolved questions, and limitations; and
5. verification commands separated into **passed**, **failed**, and **not run**.
