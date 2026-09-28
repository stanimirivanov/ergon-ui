# Follow-up application contracts — transitional

## Purpose

Hold the existing follow-up request, outcome, and gateway contracts while they
are moved to their actual capability-first owners. This package contains no
executable use case and is explicit migration debt under ADR 0011; it is not a
template for new application projects.

## Owns

- Separate contracts for listing open work, listing owned work, loading owned
  case context, and claiming work.
- Query, command, cursor, page, and tagged failure contracts returned to
  feature and data-access consumers.

These are current rather than target responsibilities. Request, cancellation,
and transport-failure contracts move to data access; capability values and
semantic refinements move to the model. Only outcomes consumed by real
executable use-case policy would remain in an application project.

## Does not own

- HTTP DTO schemas, status-code mapping, retry execution, CSRF state, or URLs.
- RTK Query endpoint and cache policy.
- React orchestration, routes, or presentation.

## Public API and dependencies

The current feature and data-access projects import only
`@ergon/application-follow-up`. The package depends on the follow-up model and
may not import frameworks or data-access or feature implementations. Its
`AbortSignal` contract and DOM TypeScript library are known portability debt;
the later contract-consolidation change must either move cancellation to web
data access or establish a genuinely portable boundary.

## Verification

```powershell
pnpm nx lint @ergon/application-follow-up
pnpm nx typecheck @ergon/application-follow-up
pnpm nx build @ergon/application-follow-up
```
