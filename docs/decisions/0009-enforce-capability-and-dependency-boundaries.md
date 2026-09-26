# ADR 0009: Enforce capability and dependency boundaries

- Status: Accepted
- Date: 2026-09-26
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Represent the hexagonal domain, application, infrastructure, and composition
layers as explicit Nx projects with enforced inward dependency direction. Keep
domain-agnostic UI primitives outside the business hexagon. Begin by extracting
follow-up domain models and capability-specific application ports without
changing runtime behavior.

## Context

The architecture already described inward dependency direction, but the first
follow-up slices kept domain read models, application ports, confidential-BFF
wire decoding, Effect execution, RTK Query integration, React orchestration,
and presentation inside one application project. Nx could not detect coupling
between responsibilities that shared the same project.

The broad follow-up client also exposed unrelated reads and a command through
one port. Every consumer and test fixture therefore depended on capabilities it
did not use. Continued slices would reinforce that coupling even if the source
were divided into smaller files.

## Decision

- Organize capability packages under `packages/domain/<capability>`,
  `packages/application/<capability>`, and
  `packages/infrastructure/<capability>-<adapter>`. Create a package only when
  current behavior gives it a stable responsibility; do not create empty layer
  or capability placeholders.
- Every Nx project has exactly one `layer:*`, `scope:*`, and `platform:*` tag.
  Layers are `domain`, `application`, `infrastructure`, `composition`,
  `ui-primitives`, and `test`. Scope and platform are independent dimensions,
  not architectural layers.
- Dependencies point inward. Domain depends only on domain. Application may
  depend on application and domain. Infrastructure may depend on
  infrastructure, application, and domain. Composition roots may assemble all
  production layers. Test projects may depend on the layers they verify.
- Keep `@ergon/ui-web` outside the business hexagon. It owns domain-agnostic
  DOM and design-system primitives and may depend only on UI primitives.
  Capability wording and workflow composition do not belong there.
- Define one consumed application port per use case. Listing open work, listing
  owned work, loading owned case context, and claiming work are separate ports.
  One adapter may implement several ports, but consumers receive only the port
  they require.
- Keep wire schemas, HTTP status interpretation, URLs, credentials, retry,
  timeout, cancellation execution, RTK Query integration, and CSRF state in
  infrastructure adapters. Wire schemas do not become domain models merely
  because Effect decodes them.
- Use package public APIs for cross-project imports. Each project README states
  purpose, ownership, exclusions, dependencies, and verification commands.
- Enforce project direction with Nx lint rules and validate complete project
  tag metadata with `pnpm architecture:check` as part of `pnpm verify`.
- Evaluate cohesion from responsibilities and dependency direction. Do not use
  source-line limits as an architectural substitute.

The first implementation creates `@ergon/domain-follow-up` at
`packages/domain/follow-up` and `@ergon/application-follow-up` at
`packages/application/follow-up`. The existing confidential-BFF adapter, RTK
Query integration, and inbound React adapter remain in the workbench until
subsequent behavior-preserving pull requests move established responsibilities.
No empty `session` or `infrastructure` package is introduced by this decision.

## Consequences

Nx can now reject forbidden project dependencies, while the tag verifier stops
untagged projects from escaping those rules. Tests and composition code can
depend on narrow capabilities rather than constructing an unrelated client
surface.

The repository temporarily contains extracted inner boundaries while outer
follow-up adapters remain in the deployable application. That is an explicit
migration state, not the target topology. Further extractions must preserve
browser contracts, RTK cache identity, Effect cancellation and retry,
non-disclosure behavior, and CSRF lifetime.

The initial application package primarily defines consumed ports and outcomes.
Future application policy belongs in explicit use cases; pass-through services
that only rename infrastructure calls do not improve the boundary.

More projects and public APIs add navigation and maintenance cost. A new
project therefore still requires current behavior and a stable responsibility;
empty future-facing packages remain prohibited.

## Alternatives considered

- **Line and function size limits:** rejected because size is not a dependable
  proxy for responsibility or dependency quality and can encourage arbitrary
  fragmentation.
- **Folder conventions inside the workbench:** rejected as the sole control
  because Nx cannot enforce dependency direction between folders in one
  project.
- **Move every follow-up layer at once:** rejected because the resulting change
  would combine several independently reviewable migrations.
- **Treat `feature`, `data-access`, and `adapter` as peer architecture
  layers:** rejected because they mix presentation organization and technical
  roles with hexagonal dependency layers. These terms may describe code inside
  an owning layer, but they do not define the repository's dependency axis.
- **Adopt Feature-Sliced Design verbatim:** rejected because its presentation
  taxonomy would compete with the business hexagon. Its useful capability
  ownership ideas are retained without adding a second layer model.
