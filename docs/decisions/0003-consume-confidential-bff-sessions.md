# ADR 0003: Consume confidential BFF sessions

- Status: Accepted
- Date: 2026-09-21
- Milestone: M05 - Human follow-up and resolver console
- Supersedes: [ADR 0002](0002-resolve-browser-sessions-with-rtk-query-and-effect.md)

## TL;DR

Resolve the workbench session through Ergon's same-origin confidential BFF.
Provider tokens remain server-side; React receives only an opaque session cookie,
a validated tenant actor, and a fixed local sign-in path.

## Context

ADR 0002 deliberately left browser authentication unconnected while the Ergon
control plane chose between direct OIDC and a BFF. [Core ADR 0036](https://github.com/stanimirivanov/rag-help-center/blob/main/docs/decisions/0036-establish-confidential-browser-session-boundary.md)
now establishes a confidential OIDC BFF with server-side sessions, a
tenant-scoped session resource, and a canonical local login entry point.

The UI must adopt that boundary without retaining the obsolete token-provider
abstraction, trusting an arbitrary redirect supplied by HTTP, or turning a
deliberately disabled BFF into a retry loop. Development must also proxy every
same-origin path used during the authorization redirect and callback.

## Decision

- Request `GET /bff/v1/tenants/{tenantId}/session` with same-origin credentials.
- Do not acquire, accept, store, log, or attach provider bearer tokens in the
  workbench.
- Keep RTK Query as the owner of request state and caching. Keep Effect inside
  `queryFn` for cancellation, timeout, bounded transient retry, schema decoding,
  and typed failure mapping.
- Decode the successful session before caching it. The accepted representation
  contains actor ID, identity-provider name, and registration timestamps only.
- Treat a `401` as actionable authentication only when its problem type is
  `urn:ergon:problem:browser-authentication-required` and its `signInPath` is
  exactly `/bff/login`.
- Build the login URL locally with the current canonical
  `/tenants/{tenantId}` route as the encoded `returnTo` parameter. Use a normal
  document navigation so the control plane and identity provider own the flow.
- Classify the stable browser-authentication-unavailable `503` separately and
  do not retry it. Retain one bounded retry for transport, timeout, and other
  transient server failures.
- Proxy `/bff`, `/oauth2`, and `/login/oauth2` to the control plane in Vite
  development. Production ingress must expose those paths on the workbench
  origin.

## Consequences

Provider tokens never enter JavaScript or Redux. The workbench can now offer a
real sign-in transition, distinguish missing configuration from temporary
failure, and reveal tenant actor data only after the BFF verifies the session.

The browser and BFF must share an origin. The UI depends on the versioned Ergon
BFF contract and its fixed local sign-in path. A live development login requires
the control plane, an OIDC client registration, and an identity provider; the
repository's tests use protocol-level browser fakes instead.

Logout, revocation, distributed server sessions, resolver data, and mutating
BFF calls remain separate slices. A future mutation must add and verify the
server's CSRF contract before it is exposed by the UI.

## Alternatives considered

- **Keep the access-token provider abstraction:** rejected because the selected
  BFF contract intentionally prevents provider tokens from entering browser
  code and no second browser authentication topology currently needs it.
- **Redirect on every `401` automatically:** rejected because background probes
  should not force navigation and users need an explicit, accessible action.
- **Trust any relative `signInPath`:** rejected because HTTP is untrusted input;
  the current contract exposes exactly one reviewed login entry point.
- **Retry every `503`:** rejected because disabled browser authentication is a
  durable operator action, not a transient outage.
