# ADR 0001: Adopt Nx and separate browser trust boundaries

- Status: Accepted
- Date: 2026-09-20
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Use a pnpm and Nx monorepo. Build the internal Ergon Workbench first and add a
separately deployable requester application with its first usable slice. Share
contracts deliberately; keep web and future native presentation separate.

## Context

Ergon needs a resolver console now and will later need an external adaptive
resolution canvas, embeddable web surfaces, and possibly React Native clients.
The resolver and requester experiences differ in audience, identity client,
authority, disclosure risk, navigation, performance budget, CSP, rollout, and
operational ownership.

A single undifferentiated SPA would make those trust boundaries implicit. Four
immediate applications would create unused structure. Independent repositories
would make contract and design changes harder to coordinate before the product
boundaries are mature.

## Decision

- Use pnpm workspaces and Nx for the project graph, affected execution, task
  orchestration, and dependency constraints.
- Use React 19.3, Vite, and React Router Data Mode for browser applications.
- Create `ergon-workbench` now. It hosts resolver behavior and may later host
  studio and simulation route areas while they share an internal trust boundary.
- Add `ergon-requester` only with the first authenticated requester behavior. It
  will build and deploy independently with its own identity and security policy.
- Keep shadcn and Tailwind source in the explicitly web-only `@ergon/ui-web`
  package. Do not promise DOM components as React Native abstractions.
- Add shared API contracts, RTK Query, Effect, forms, Motion, widgets, and native
  projects only when a vertical slice requires them.

## Consequences

One repository can coordinate contract and design changes while producing
separate artifacts. Nx tags make platform and ownership rules executable.
Security review can reason about the external requester separately from the
high-authority workbench.

The workbench cannot be deployed as a production resolver console until a
reviewed browser authentication and API boundary exists. A future BFF remains
possible if the threat model requires server-side token isolation. Adding the
requester or a native client will require explicit application composition and
platform adapters rather than assuming UI reuse.

## Alternatives considered

- **One browser SPA:** fewer initial files, but it couples public and internal
  trust boundaries and release policy.
- **Create all planned apps immediately:** makes the intended topology visible
  but violates the rule against unused components.
- **Separate repository per experience:** maximizes isolation but adds contract,
  dependency, and design-system coordination cost before independent ownership
  exists.
- **Universal React Native Web UI:** promises reuse at the cost of web semantics,
  shadcn compatibility, and platform-appropriate interaction.
