# Follow-up web infrastructure

## Purpose

Adapt the confidential browser BFF to the follow-up application ports without
allowing HTTP, Effect, CSRF, retry, or wire-format concerns into the inner
layers.

## Owns

- Same-origin BFF request construction and response decoding.
- Browser wire schemas and protocol-to-application failure translation.
- Bounded read retries, per-request timeouts, and cancellation conversion.
- The in-memory, session-bound CSRF token lifecycle for claim commands,
  including single-flight acquisition and compare-and-clear invalidation.

## Does not own

- Follow-up domain models, use-case contracts, or application policy.
- RTK Query cache keys and invalidation.
- React hooks, routes, components, or presentation.
- Session identity resolution or control-plane implementation details.

## Public API and dependencies

Consumers import only `createHumanFollowUpBffAdapter` from
`@ergon/infrastructure-follow-up-web`. The package implements the narrow ports
from `@ergon/application-follow-up` and maps validated responses to
`@ergon/domain-follow-up` values. Its public API does not expose Effect programs
or wire DTOs.

## Verification

```powershell
pnpm nx lint @ergon/infrastructure-follow-up-web
pnpm nx typecheck @ergon/infrastructure-follow-up-web
pnpm nx test @ergon/infrastructure-follow-up-web
pnpm nx build @ergon/infrastructure-follow-up-web
```
