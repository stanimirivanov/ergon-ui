# Follow-up application

## Purpose

Define the platform-neutral use-case inputs, outcomes, and consumed ports for
human follow-up workflows.

## Owns

- Separate ports for listing open work, listing owned work, loading owned case
  context, and claiming work.
- Query, command, cursor, page, and tagged failure contracts returned to
  application consumers.

## Does not own

- HTTP DTO schemas, status-code mapping, retry execution, CSRF state, or URLs.
- RTK Query endpoint and cache policy.
- React orchestration, routes, or presentation.

## Public API and dependencies

Consumers import only `@ergon/follow-up-application`. The package depends
inward on `@ergon/follow-up-domain`; it may not import frameworks or adapters.
Ports return decoded serializable outcomes and accept cancellation from their
caller.

## Verification

```powershell
pnpm nx lint @ergon/follow-up-application
pnpm nx typecheck @ergon/follow-up-application
pnpm nx build @ergon/follow-up-application
```
