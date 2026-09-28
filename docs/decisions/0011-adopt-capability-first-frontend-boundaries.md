# ADR 0011: Adopt capability-first frontend boundaries and selective application cores

- Status: Accepted
- Date: 2026-09-28
- Milestone: M05 - Human follow-up and resolver console
- Supersedes: [ADR 0009](0009-enforce-capability-and-dependency-boundaries.md)
  and [ADR 0010](0010-extract-capability-react-adapters.md)

## TL;DR

Organize frontend projects by business capability and concrete responsibility.
Use model, application, data-access, feature, UI, app, and test project types.
Create an application core only when the client owns executable,
platform-neutral policy or workflow behavior. A cache-centric feature may use
data access directly when no such use case exists.

## Context

ADRs 0009 and 0010 made project boundaries enforceable, but assumed each
frontend capability should become domain, application, inbound infrastructure,
and outbound infrastructure projects. The resulting graph has the shape of a
hexagon without an application core.

Current application projects contain endpoint-shaped inputs, outcomes, and
interfaces but no executable use cases. Current domain projects contain
server-owned projections whose documented invariants are enforced elsewhere.
The React project consumes generated RTK Query hooks from the web project, so
runtime behavior does not pass through the application layer.

Calling React a driving adapter is valid ports-and-adapters terminology, but
calling capability presentation infrastructure obscures its frontend role.
Adding pass-through application services would add indirection without moving
policy. The server owns most current business policy; the browser owns remote
cache integration, interaction, presentation, and selected pure validations.
Future native clients do not justify speculative shared layers.

## Decision

Group projects first by capability and then by concrete responsibility. The
target shape is:

```text
packages/
  follow-up/
    model/
    data-access-web/
    feature-web/
    application/        # only when current behavior requires it
  session/
    model/
    data-access-web/
    feature-web/
    application/        # only when current behavior requires it
  ui-web/
```

Every Nx project has exactly one `type:*`, `scope:*`, and `platform:*` tag.
Scope and platform constraints remain independent of project type.

| Source type        | May depend on                                                                   |
| :----------------- | :------------------------------------------------------------------------------ |
| `type:model`       | `type:model`                                                                    |
| `type:application` | `type:application`, `type:model`                                                |
| `type:data-access` | `type:data-access`, `type:application`, `type:model`                            |
| `type:feature`     | `type:data-access`, `type:application`, `type:model`, `type:ui`                 |
| `type:ui`          | `type:ui`                                                                       |
| `type:app`         | `type:feature`, `type:data-access`, `type:application`, `type:model`, `type:ui` |
| `type:test`        | Any type required by the behavior under test                                    |

The types own these responsibilities:

- **Model:** normalized capability values plus pure parsing, refinement, and
  invariant checks. It has no React, Redux, Effect, HTTP, DOM, or native
  dependency. A decoded response is not automatically a domain model.
- **Application:** an optional executable, platform-neutral use case, policy,
  state machine, or workflow; its inputs, outcomes, and consumed ports.
  Interface-only and pass-through application projects are prohibited.
- **Data access:** wire schemas, protocol execution, Effect programs,
  transport failures, timeout and cancellation mechanics, CSRF state, RTK
  Query endpoints, cache identity, invalidation, and generated hooks.
- **Feature:** capability-specific React orchestration, interaction state,
  accessible behavior, presentation copy, and feature composition.
- **UI:** domain-agnostic platform primitives. `@ergon/ui-web` remains web
  specific and is not a React Native abstraction.
- **App:** deployable composition: routes, providers, store assembly, runtime
  configuration, trust-boundary composition, and dependency binding.

A feature may use data access directly for cache-centric reads and mutations
when the client owns no independent application policy. This is an intentional
dependency, not a bypassed application layer. When a genuine use case exists,
selective hexagonal direction applies:

```text
feature -> application use case -> consumed port <- data-access implementation
```

Application and model projects remain independent of React, Redux, RTK Query,
Effect, HTTP, DOM, and native APIs. Ports are declared beside the executable
application behavior that consumes them. Their library builds extend the
DOM-free `tsconfig.core.json`; any temporary exception is named in the finite
legacy ledger and must disappear with the debt that requires it.

Migration is incremental and behavior-preserving:

1. Replace `layer:*` and `adapter:*` metadata with `type:*`.
2. Treat existing global-layer paths and package names as finite migration
   locations; the architecture checker rejects additional projects there.
3. Move one capability responsibility at a time to the target paths.
4. Remove or relocate interface-only application contracts unless a real use
   case is introduced.
5. Add no placeholder project or pass-through service to complete the diagram.

The existing `@ergon/application-follow-up` and
`@ergon/application-session` projects remain explicit migration debt. They are
not precedents for new interface-only application projects. Their use of
`AbortSignal` and the DOM TypeScript library also means they are not yet proven
portable despite their temporary `platform:shared` tags; the contract
consolidation changes must resolve that mismatch.

## Consequences

The graph now names frontend responsibilities that actually exist. React code
is a feature, and RTK Query integration is data access. Thin,
server-authoritative slices need fewer packages, while complex client-owned
workflows can still gain a strict core when behavior justifies it.

The architecture checker validates declared workspace dependencies, tag shape,
and the capability-first path convention. A finite ledger exposes old
global-layer paths and fails when a project is added there or a migration entry
becomes stale. A separate accepted-decision ledger prevents a new application
project from becoming an interface-only placeholder without an explicit review
of the executable policy it will own. Ledger entries reference repository ADRs
whose status is checked as accepted.

Existing package paths and import names remain temporarily unchanged. Later
changes must preserve BFF contracts, cache identity, cancellation, retry, CSRF
lifetime, accessibility, tenant isolation, and non-disclosure behavior.

The model role must not become a generic dumping ground. A value or validator
belongs there only when its semantics are capability-owned and
platform-neutral.

## Alternatives considered

- **Keep a mandatory full hexagon:** rejected because current runtime behavior
  has no application core.
- **Add pass-through application services:** rejected because forwarding does
  not create policy ownership.
- **Keep React as infrastructure:** rejected as the repository taxonomy because
  it hides presentation responsibility.
- **Keep capability code in deployable apps:** rejected because Nx cannot
  independently enforce feature and data-access boundaries there.
- **Adopt Feature-Sliced Design verbatim:** rejected; Ergon needs its
  capability-first ownership principle, not another complete taxonomy.
- **Create native-ready packages now:** rejected until current shared behavior
  demonstrates a portability boundary.
