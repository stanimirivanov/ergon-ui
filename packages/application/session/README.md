# Session application

## Purpose

Define the platform-neutral outcome and consumed port for resolving the actor
authorized by an authenticated session.

## Owns

- The current-actor result and presentation-safe failure contracts.
- The cancellation-aware current-actor resolution port.

## Does not own

- Session HTTP schemas, problem mapping, retry execution, timeouts, or URLs.
- RTK Query cache policy, React orchestration, routes, or presentation.
- Browser authentication credentials or provider integration.

## Public API and dependencies

Consumers import only `@ergon/application-session`. The package depends inward
on `@ergon/domain-session`; it may not import frameworks or adapters. The port
returns decoded serializable outcomes and accepts cancellation from its caller.

## Verification

```powershell
pnpm nx lint @ergon/application-session
pnpm nx typecheck @ergon/application-session
pnpm nx build @ergon/application-session
```
