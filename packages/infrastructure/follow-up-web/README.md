# Follow-up web data access — transitional location

## Purpose

Own confidential-browser BFF execution and follow-up remote-cache integration
until the project moves to `packages/follow-up/data-access-web`.

## Owns

- Same-origin BFF request construction and response decoding.
- Follow-up client operations, requests, results, cursors, and presentation-safe
  failures consumed by the feature and cache.
- Browser wire schemas and protocol-to-typed-failure translation.
- Bounded read retries, per-request timeouts, and cancellation conversion.
- The in-memory, session-bound CSRF token lifecycle for claim commands,
  including single-flight acquisition and compare-and-clear invalidation.
- Follow-up RTK Query cache identity, request lifecycle, tag invalidation, and
  generated React hooks.

## Does not own

- Follow-up model semantics or executable application policy. The package
  temporarily performs case-summary semantic refinements; moving those pure
  checks to the follow-up model is explicit migration debt.
- Redux store composition or non-remote client state.
- React routes, feature components, or presentation.
- Session identity resolution or control-plane implementation details.

## Public API and dependencies

Consumers import the BFF client factory, typed client contracts,
`humanFollowUpApi`, generated hooks, and `HumanFollowUpCacheDependencies` from
`@ergon/infrastructure-follow-up-web`. The package maps validated responses to
follow-up model values without exposing Effect programs or wire DTOs.
Composition roots provide executable operation dependencies through Redux
thunk extra arguments and register the API reducer and middleware.

## Verification

```powershell
pnpm nx lint @ergon/infrastructure-follow-up-web
pnpm nx typecheck @ergon/infrastructure-follow-up-web
pnpm nx test @ergon/infrastructure-follow-up-web
```
