# ADR 0010: Extract capability React code as inbound infrastructure adapters

- Status: Superseded by [ADR 0011](0011-adopt-capability-first-frontend-boundaries.md)
- Date: 2026-09-28
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Move capability-owned React behavior out of deployable applications into
explicit inbound infrastructure adapters. Distinguish inbound and outbound
infrastructure projects so only inbound web adapters may consume
domain-agnostic UI primitives.

## Context

The follow-up domain, application ports, confidential-BFF execution, and RTK
Query cache already have enforced package boundaries. Follow-up React
orchestration and presentation still lived in `@ergon/workbench`, however, so
the deployable application owned queue rules, cursor interaction, failure copy,
claim interaction, and case-context disclosure in addition to route and
dependency composition.

React screens are driving adapters around the same application boundary, not
domain services or generic UI primitives. Treating every infrastructure
project identically would either prevent a React adapter from using
`@ergon/ui-web` or allow outbound HTTP adapters to acquire presentation
dependencies unnoticed.

## Decision

- Capability-owned React orchestration and presentation live in a dedicated
  `layer:infrastructure`, `adapter:inbound` project.
- HTTP, persistence, cache execution, and other driven adapters declare
  `adapter:outbound`.
- Inbound web adapters may depend on infrastructure, application, domain, and
  domain-agnostic UI-primitives projects.
- Outbound adapters may depend on infrastructure, application, and domain
  projects, but not UI primitives or composition roots.
- The project metadata verifier requires exactly one adapter role on every
  infrastructure project. Nx dependency constraints enforce the distinct
  dependency sets.
- `@ergon/infrastructure-follow-up-react` owns follow-up-specific React state,
  rendering, accessible interaction, and presentation-safe failure copy.
- The workbench remains the composition root. It owns route hierarchy, session
  gating, Redux store assembly, and construction of the trusted same-origin
  sign-in URL supplied to the follow-up adapter.
- `@ergon/infrastructure-follow-up-web` continues to own BFF protocol execution,
  decoding, retry, cancellation, CSRF lifetime, and RTK Query cache policy.

## Consequences

Nx can now detect a follow-up feature reaching into workbench composition or an
outbound adapter acquiring UI dependencies. The deployable application becomes
smaller and can compose the feature through a narrow public React API.

The term `infrastructure` covers both driving and driven adapters around the
business hexagon. The explicit adapter-role tag preserves their different
dependency needs without adding a competing architectural layer taxonomy.

The follow-up React package is web-specific and is not a React Native
abstraction. A future native adapter may reuse domain and application contracts
but not this package or `@ergon/ui-web`.

## Alternatives considered

- **Keep the feature in the workbench:** rejected because a deployable
  composition root would continue owning capability behavior and could not be
  checked independently.
- **Put capability components in `@ergon/ui-web`:** rejected because that
  package is intentionally domain-agnostic and cannot depend on follow-up
  models or cache adapters.
- **Create a `feature` or `presentation` layer:** rejected because it would add
  a second architecture axis beside the business hexagon. Inbound adapter is a
  role within the existing infrastructure layer.
- **Let all infrastructure projects import UI primitives:** rejected because
  outbound protocol and persistence adapters must remain presentation-free.
