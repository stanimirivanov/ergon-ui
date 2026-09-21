# ADR 0002: Resolve browser sessions with RTK Query and Effect

- Status: Superseded by [ADR 0003](0003-consume-confidential-bff-sessions.md)
- Date: 2026-09-20
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Use RTK Query for current-actor request state and caching. Run token acquisition,
HTTP, cancellation, timeout, bounded transient retry, schema decoding, and typed
failure mapping as an Effect program inside the endpoint `queryFn`. Keep bearer
tokens and opaque provider subjects out of Redux and browser persistence.

## Context

The control plane exposes a public bearer-authenticated endpoint that maps a
verified issuer and opaque subject to one tenant-scoped Ergon actor. The
workbench must distinguish absent authentication, an unregistered actor,
rejected identity, transient failure, and malformed responses before any
resolver data is visible.

The browser still needs a separate decision between direct OIDC and a backend
for frontend. Choosing an identity SDK in the data-fetching change would combine
token lifecycle, redirect, storage, CSP, ingress, and logout decisions with the
smaller current-actor capability.

## Decision

- RTK Query owns request lifecycle, deduplication, cache state, and React hooks.
- Effect owns access-token acquisition, fetch execution, cancellation, a
  five-second timeout, one retry for transient read failures, schema decoding,
  and stable failure classification.
- RTK Query's abort signal interrupts the Effect program and its fetch.
- The current-actor response is decoded before caching. The opaque provider
  subject is required in the wire response but projected out of browser state.
- Tokens are provided through an injected asynchronous interface and never
  become query arguments, Redux state, browser storage, URLs, or build-time
  environment variables.
- The default provider returns no token, so the workbench fails closed until an
  OIDC-or-BFF decision supplies a production adapter.
- Browser calls use the same-origin `/api` path. Vite provides a development-only
  proxy to the local control plane; production ingress must provide that path.

## Consequences

The UI can verify every actor-session state against a stable contract without
creating a second remote cache or leaking credentials into serializable state.
Later resolver queries can reuse the same execution pattern after their public
browser contracts exist.

The default build cannot sign a user in. That limitation is intentional: the
workbench shows an authentication-required state and loads no resolver data.
The next security slice must decide token isolation, redirect and callback
behavior, refresh, logout, revocation, CSP, and deployment topology.

## Alternatives considered

- **Use `fetchBaseQuery` only:** simpler, but leaves runtime decoding and typed
  failure translation outside the requested Effect boundary.
- **Store the token in Redux or browser storage:** convenient across reloads,
  but expands credential exposure and contradicts the security policy.
- **Choose direct OIDC now:** would make the route interactive, but combines an
  identity-provider and deployment decision with this contract slice.
- **Introduce a BFF now:** can isolate tokens in HTTP-only cookies, but requires
  server session, CSRF, ingress, and operational decisions beyond this PR.
