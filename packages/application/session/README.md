# Session application contract — transitional

## Purpose

Hold the existing current-actor result and gateway contract while they are
moved to their capability-first owners. This package contains no executable
use case and is explicit migration debt under ADR 0011.

## Owns

- The current-actor result and presentation-safe failure contracts.
- The cancellation-aware current-actor gateway contract.

These are current rather than target responsibilities. Request, cancellation,
and transport-failure contracts move to data access; capability values move to
the model. Only outcomes consumed by real executable use-case policy would
remain in an application project.

## Does not own

- Session HTTP schemas, problem mapping, retry execution, timeouts, or URLs.
- RTK Query cache policy, React orchestration, routes, or presentation.
- Browser authentication credentials or provider integration.

## Public API and dependencies

The current app and data-access project import only
`@ergon/application-session`. The package depends on the session model and may
not import frameworks or data-access or feature implementations. Its
`AbortSignal` contract and DOM TypeScript library remain known portability debt
for the later contract-consolidation change.

## Verification

```powershell
pnpm nx lint @ergon/application-session
pnpm nx typecheck @ergon/application-session
pnpm nx build @ergon/application-session
```
