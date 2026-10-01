# Follow-up web data access

## Purpose

Own confidential-browser BFF execution and follow-up remote-cache integration.

## Owns

- Same-origin BFF request construction and response decoding.
- Follow-up client operations, requests, results, cursors, and presentation-safe
  failures consumed by the feature and cache.
- Browser wire schemas and protocol-to-typed-failure translation.
- Structural owned-work decoding followed by the model's claim/work-item
  pairing refinement before remote caching.
- Bounded read retries, per-request timeouts, and cancellation conversion.
- The in-memory, session-bound CSRF token lifecycle for claim commands,
  including single-flight acquisition and compare-and-clear invalidation.
- Follow-up RTK Query cache identity, request lifecycle, tag invalidation, and
  generated React hooks.

Case-summary cache entries use the full tenant, work-item, case, and run request
tuple. A different tuple must fetch and pass BFF response validation before it
can be displayed; the cache never substitutes a summary validated for another
case or run.

## Does not own

- Follow-up model semantics or executable application policy. It checks that a
  decoded case summary matches the requested work, case, and run before using
  the follow-up model's pure cross-field refinement.
- Redux store composition or non-remote client state.
- React routes, feature components, or presentation.
- Session identity resolution or control-plane implementation details.

## Public API and dependencies

Consumers import the BFF client factory, typed client contracts,
`humanFollowUpApi`, generated hooks, and `HumanFollowUpCacheDependencies` from
`@ergon/follow-up-data-access-web`. The package maps validated responses to
follow-up model values without exposing Effect programs or wire DTOs.
Composition roots provide executable operation dependencies through Redux
thunk extra arguments and register the API reducer and middleware.

## Verification

```powershell
pnpm nx lint @ergon/follow-up-data-access-web
pnpm nx typecheck @ergon/follow-up-data-access-web
pnpm nx test @ergon/follow-up-data-access-web
```
