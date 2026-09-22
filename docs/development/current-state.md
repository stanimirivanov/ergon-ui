# Current UI implementation state

## TL;DR

The repository contains a verified resolver-workbench shell, a fail-closed
confidential-BFF session boundary, a read-only shared resolver inbox, and a
web-only UI package. It has no case detail, claim or release action, logout
flow, form workflow, Motion animation, requester app, or native app.

## Implemented

- pnpm workspace managed by Nx 23;
- Node 24 and React 19.3 version contract;
- Vite-built workbench with React Router Data Mode;
- Tailwind CSS theme tokens and one shadcn-compatible button primitive;
- accessible home and unknown-route recovery screens;
- tenant route validation and confidential BFF session consumption;
- RTK Query cache ownership with Effect-based HTTP, timeout, bounded retry,
  cancellation, schema decoding, and typed failure mapping;
- explicit local sign-in navigation from the validated BFF problem contract;
- explicit authentication-required, unregistered-actor, rejected-identity,
  transient-failure, invalid-response, and verified-session UI states;
- BFF follow-up page decoding with current-authority non-disclosure semantics;
- URL-owned queue filtering, local reversible keyset navigation, and explicit
  loading, empty, failure, and populated inbox states;
- strict TypeScript, ESLint project boundaries, Prettier, Vitest, and Playwright;
- GitHub verification workflow and contributor harness; and
- accepted workbench/requester topology decision.

## Deliberate limits

- OIDC client credentials and provider tokens remain entirely server-side.
- No logout, refresh, or revocation UI exists.
- The inbox is read-only: no claim, release, resolution, or case-detail action
  exists, and no browser mutation is attempted without a CSRF contract.
- The BFF session contains no provider subject, and none is cached or shown.
- No production deployment configuration or ingress exists.
- No `/internal/v1` endpoint is treated as a supported browser contract.
- No requester, widget, or native placeholder has been created.
- React Hook Form and Motion are deferred until their first behavior needs them.

The next resolver slice may introduce a reviewed browser-safe claim transition
and its CSRF, conflict, and cache-invalidation semantics. Existing
`/internal/v1` routes remain ineligible for production UI use.
