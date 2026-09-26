# ADR 0009: Enforce capability and dependency boundaries

- Status: Accepted
- Date: 2026-09-26
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Represent domain, application, adapter, data-access, feature, UI, and
composition responsibilities as explicit Nx projects with enforced dependency
direction. Begin by extracting follow-up domain models and capability-specific
application ports without changing runtime behavior.

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

- Use Nx project roles `domain`, `application`, `adapter`, `data-access`,
  `feature`, `ui`, `app`, `e2e`, and `util`. Every project has exactly one
  `type:*`, `scope:*`, and `platform:*` tag.
- Dependencies point inward. Domain has no framework or infrastructure
  dependencies. Application depends on domain. Adapters and data access depend
  on application and domain. Feature code may compose data access and UI.
  Applications are composition roots.
- Define one consumed application port per use case. Listing open work, listing
  owned work, loading owned case context, and claiming work are separate ports.
  One adapter may implement several ports, but consumers receive only the port
  they require.
- Keep wire schemas, HTTP status interpretation, URLs, credentials, retry,
  timeout, cancellation execution, and CSRF state in platform adapters. Wire
  schemas do not become domain models merely because Effect decodes them.
- Use package public APIs for cross-project imports. Each project README states
  purpose, ownership, exclusions, dependencies, and verification commands.
- Enforce project direction with Nx lint rules and validate complete project
  tag metadata with `pnpm architecture:check` as part of `pnpm verify`.
- Evaluate cohesion from responsibilities and dependency direction. Do not use
  source-line limits as an architectural substitute.

The first implementation creates `@ergon/follow-up-domain` and
`@ergon/follow-up-application`. The existing confidential-BFF adapter, RTK
Query integration, and React feature remain in the workbench until subsequent
behavior-preserving pull requests move those established responsibilities.

## Consequences

Nx can now reject forbidden project dependencies, while the tag verifier stops
untagged projects from escaping those rules. Tests and composition code can
depend on narrow capabilities rather than constructing an unrelated client
surface.

The repository temporarily contains both extracted inner boundaries and outer
follow-up implementations still located in the application. That is an
explicit migration state, not the target topology. Further extractions must
preserve browser contracts, RTK cache identity, Effect cancellation and retry,
non-disclosure behavior, and CSRF lifetime.

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
- **Adopt Feature-Sliced Design verbatim:** rejected in favor of its
  capability ownership and downward-import principles expressed through the
  repository's existing Nx project model.
