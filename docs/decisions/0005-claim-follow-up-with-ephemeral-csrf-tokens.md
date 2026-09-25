# ADR 0005: Claim follow-up work with ephemeral CSRF tokens

- Status: Accepted
- Date: 2026-09-25
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Claim visible follow-up work through the confidential BFF. Keep the advertised
session-bound CSRF value only in the in-memory HTTP client, model claiming as an
RTK Query mutation, and invalidate all cached inbox pages for the tenant after
success or a stale-item response. Ambiguous failures require explicit retry.

## Context

ADR 0004 deliberately kept the resolver inbox read-only until a browser-safe
mutation existed. Core ADR 0038 now defines authenticated CSRF acquisition and
an idempotent claim command. The claim returns the original immutable ownership
record when the same resolver repeats it, while a competing resolver receives a
conflict.

Keyset pages may be cached under several queue filters and cursor positions.
Removing one row optimistically would require the UI to reconstruct server
ordering and page boundaries that it does not own.

## Decision

- Obtain the CSRF token and advertised header through the same-origin BFF. Keep
  the decoded value in the HTTP client closure only; never place it in Redux,
  React state, a URL, logs, analytics, or persistent browser storage.
- Reuse a token within the current client lifetime. Discard it after an
  `invalid-browser-csrf-token` response so the next explicit attempt obtains a
  replacement.
- Model claiming as an RTK Query mutation. Effect executes token acquisition,
  claim HTTP, timeout, cancellation, complete response decoding, and stable
  problem translation inside `queryFn`.
- Do not automatically retry the claim request. An ambiguous failure presents
  an explicit retry, and the control plane's same-resolver replay makes that
  action safe.
- Invalidate all cached inbox pages for the tenant after success, conflict, or
  absence. The active page refetches from the server rather than applying an
  optimistic keyset-page edit.
- Disable every claim control while one claim is pending and announce success
  or failure using semantic live feedback.

## Consequences

Resolvers can acquire ownership without provider tokens, actor identifiers, or
authority evidence entering the mutation request. Authentication, expired
CSRF, authority loss, competing ownership, absence, ambiguous results, and
invalid responses remain distinct user-visible states.

The token remains process-memory data in one browser tab. A full reload obtains
a replacement, which is intentional. Successful work disappears from the
shared inbox, but there is no browser-owned work view yet, so the resolver
cannot recover or continue a claim through this UI after leaving the page.

## Alternatives considered

- **Persist the CSRF token in Redux or browser storage:** rejected because it is
  ephemeral session security state, not application state.
- **Optimistically remove the work item:** rejected because filtered keyset
  pages and concurrent claims make client-side page repair unreliable.
- **Automatically retry every failed mutation:** rejected because only the
  claim command has a server-backed replay guarantee and an explicit retry
  keeps ambiguous state visible to the resolver.
- **Fetch a new token for every claim:** rejected because the server contract
  permits session-bound reuse and invalid-token recovery provides a clear
  rotation boundary.
