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
| Progressive task-to-source routing            | [documentation map](docs/README.md)                                |
| Harness tiers and executable feedback         | [coding harness](docs/development/harness.md)                      |
| React, TypeScript, UI, state, tests           | [engineering standards](docs/development/engineering-standards.md) |
| Durable UI architecture                       | [ADRs](docs/decisions/README.md)                                   |
| Product, backend contracts, milestones        | [Ergon core](https://github.com/stanimirivanov/rag-help-center)    |
| Exact project commands and ownership          | The project README and checked-in configuration                    |

Accepted ADRs govern until superseded. Surface conflicts instead of choosing a
convenient interpretation silently.

## Before starting

A contributor MUST inspect the branch and working tree, use the
[documentation map](docs/README.md) to load the relevant standards, package
guides, and ADRs, define the smallest independently valuable behavior, and
identify contract, authentication, tenant, accessibility, responsive, browser
compatibility, rollout, and observability effects. Do not bulk-read unrelated
guidance.

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

- Organize projects first by business capability and then by concrete role.
  Models own platform-neutral values and pure semantic refinements. Data-access
  projects own wire schemas, protocol mapping, Effect execution, security
  state, RTK Query endpoints, and cache policy. Feature projects own
  capability-specific React orchestration, interaction, accessibility, copy,
  and presentation. Deployable apps own routes and dependency composition.
- Every Nx project has exactly one `type:*`, `scope:*`, and `platform:*` tag,
  imports other projects only through public APIs, and documents what it owns
  and deliberately excludes. Supported types are `model`, `application`,
  `data-access`, `feature`, `ui`, `app`, and `test`.
- New package projects MUST use `packages/<scope>/<role[-platform]>`, with
  `packages/ui-web` as the current explicit exception. The package name MUST
  match the path as `@ergon/<scope>-<role[-platform]>`; `packages/ui-web` is
  named `@ergon/ui-web`. Existing global-layer paths are finite migration
  entries and MUST NOT be copied. Deployables and end-to-end projects live
  under `apps/*` with `type:app` and `type:test`, respectively; their names
  are not derived from this package convention.
- Dependency direction is enforced independently by type, scope, and platform.
  Model depends on model; application on application and model; data access on
  data access, application, and model; feature on data access, application,
  model, and UI; UI only on UI; app on production project types; and test on
  the behavior it verifies.
- Application projects are optional. They MUST own executable,
  platform-neutral use-case policy, a state machine, or workflow behavior plus
  any ports that behavior consumes. Interface-only projects and services that
  merely forward a data-access call MUST NOT be introduced. A new application
  project also requires a checked architecture-policy ledger entry referencing
  its accepted ADR.
- A feature MAY consume data access directly for cache-centric reads or
  mutations when the client owns no independent application policy. When a
  real client use case exists, the feature invokes application behavior and
  composition binds its data-access implementation.
- Platform-neutral model and application projects do not import React, React
  Router, Redux, RTK Query, Effect, Tailwind, DOM, browser, or native APIs.
  Their library builds MUST extend the DOM-free `tsconfig.core.json`; finite
  legacy exceptions identify existing portability debt.
  Presentational components receive explicit view state and callbacks rather
  than decoding protocols themselves.
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
- Supported APIs and non-trivial protocol, schema-decoding, persistence, and
  asynchronous boundary functions MUST declare return types. The annotation
  must expose the success, failure, and environment channels of Effect values
  rather than relying on an inferred implementation type. Small local
  callbacks and obvious pure helpers MAY rely on inference.

## TSDoc and comments

The declaration that owns a supported public contract MUST document any
non-obvious purpose, invariants, parameter or return constraints, units,
ordering, ownership, lifetime, side effects, concurrency, cancellation,
retry, idempotency, security boundary, or meaningful error behavior. Package
entry points, cross-layer contracts, and application composition boundaries
define the supported surface; an `export` used only between implementation
modules does not become public API merely because TypeScript requires it.
Re-export files MUST NOT duplicate declaration documentation.

Use `@param` and `@returns` only to add semantics or constraints that the name
and type do not express. Use `@throws` only for exceptions or promise
rejections that can actually escape; describe discriminated failure results as
outcomes instead. Add an example only when correct use is not obvious, and
prefer an executable test or typechecked source example over a free-form block
that can drift. TypeScript has no repository-supported equivalent of Kotlin's
compiled `@sample`; do not invent one.

Ports and Effect-backed adapters MUST document relevant timeout, retry,
cancellation, idempotency, resource-lifetime, and disclosure semantics. React
components and hooks document non-obvious accessibility, state-ownership, and
cleanup contracts. Wire schemas document protocol meaning or compatibility
constraints when those are not already owned by a referenced contract.

Implementation comments explain reasons, compatibility constraints,
accessibility decisions, security boundaries, concurrency, and deliberate
performance trade-offs. Never narrate syntax. Skip members whose names and
types already say everything—uninformative comments are a maintenance
liability. If an API needs extensive prose because its name or type is vague,
improve the API first. Delete stale and commented-out code.

Reviews evaluate documentation correctness and usefulness, not coverage
percentages. Syntax tooling MAY reject malformed TSDoc, but MUST NOT require a
comment for every export or reward boilerplate.

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

## Documentation

Code and documentation change together when behavior, contracts,
configuration, responsibility ownership, or operations change. Long or
policy-oriented documents begin with a visible, non-empty `## TL;DR` after the
title and permitted status metadata. A document is long when it has at least
800 visible words, more than five second-level sections, or is an architecture,
security, migration, operations, operational, or end-to-end guide.

ADRs and GitHub templates are exempt from that general threshold because their
fixed formats are validated separately. Required headings, metadata, prompts,
commands, and review fields use visible Markdown or semantic YAML; comments,
raw HTML, image-only text, and code fences cannot carry policy fields.

Repository-local links use exact path casing, stay inside the repository, and
name real heading anchors. Accepted ADRs are historical records: supersede
rather than rewrite them. The UI repository validates milestone field shape
but does not duplicate Ergon core's milestone catalog.

## Pull request description

A pull request states its linked issue and exact milestone, resulting behavior,
scope and exclusions, assumptions and limitations, architecture and
compatibility effects, accessibility, security, rollout, and verification.
Every applicable command is reported as passed, failed, or not run; a not-run
check includes its blocker and residual risk. Use the checked-in pull-request
template. Its heading order, prompts, command table, and ordered checklist are
repository-policy contracts.

## Verification

Run the fast structural checks during editing:

```powershell
pnpm repository:check
pnpm architecture:check
```

Before handoff, run the complete acceptance gate:

```powershell
pnpm verify
```

It checks repository policy, architecture metadata, formatting, linting,
strict type checking, unit and component tests, production builds, and
Chromium Playwright behavior. Dependency changes also require
`pnpm install --frozen-lockfile`. A check that is skipped or cannot run is
**not run**, not passed. The [coding harness](docs/development/harness.md)
defines timing tiers and specialist checks.

## Improving the harness

When a review finding recurs, clarify the narrow guide, add a deterministic
structural sensor, add a focused behavior test, or record an owned exception
when automation would be noisy. Sensors MUST be deterministic, actionable,
repository-pinned, and documented in the harness inventory. They MUST NOT
rewrite expectations, weaken invariants, depend on undeclared ambient tools,
or turn an unavailable check into a pass.

## Completion report

After every coding task, provide:

1. the exact milestone as `MNN - Outcome`;
2. a proposed GitHub issue title;
3. a copy/paste-ready Markdown issue body using the required structure;
4. assumptions, unresolved questions, and limitations; and
5. verification commands separated into **passed**, **failed**, and **not run**.
