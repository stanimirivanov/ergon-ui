# Follow-up web infrastructure

## Purpose

Adapt the confidential browser BFF and its remote cache to the follow-up
application ports without allowing HTTP, Effect, CSRF, retry, wire-format, or
Redux concerns into the inner layers.

## Owns

- Same-origin BFF request construction and response decoding.
- Browser wire schemas and protocol-to-application failure translation.
- Bounded read retries, per-request timeouts, and cancellation conversion.
- The in-memory, session-bound CSRF token lifecycle for claim commands,
  including single-flight acquisition and compare-and-clear invalidation.
- Follow-up RTK Query cache identity, request lifecycle, tag invalidation, and
  generated React hooks.

## Does not own

- Follow-up domain models, use-case contracts, or application policy.
- Redux store composition or non-remote client state.
- React routes, feature components, or presentation.
- Session identity resolution or control-plane implementation details.

## Public API and dependencies

Consumers import the BFF adapter factory, `humanFollowUpApi`, its generated
hooks, and `HumanFollowUpCacheDependencies` from
`@ergon/infrastructure-follow-up-web`. The package implements the narrow ports
from `@ergon/application-follow-up` and maps validated responses to
`@ergon/domain-follow-up` values. Its public API does not expose Effect programs
or wire DTOs. Composition roots provide executable port dependencies through
Redux thunk extra arguments and register the API reducer and middleware.

## Verification

```powershell
pnpm nx lint @ergon/infrastructure-follow-up-web
pnpm nx typecheck @ergon/infrastructure-follow-up-web
pnpm nx test @ergon/infrastructure-follow-up-web
```
