# Current UI implementation state

## TL;DR

The repository contains a verified resolver-workbench shell, a fail-closed
current-actor session boundary, and a web-only UI package. It has no token
acquisition adapter, resolver inbox, case data, form workflow, Motion animation,
requester app, or native app.

## Implemented

- pnpm workspace managed by Nx 23;
- Node 24 and React 19.3 version contract;
- Vite-built workbench with React Router Data Mode;
- Tailwind CSS theme tokens and one shadcn-compatible button primitive;
- accessible home and unknown-route recovery screens;
- tenant route validation and public current-actor contract consumption;
- RTK Query cache ownership with Effect-based HTTP, timeout, bounded retry,
  cancellation, schema decoding, and typed failure mapping;
- explicit authentication-required, unregistered-actor, rejected-identity,
  transient-failure, invalid-response, and verified-session UI states;
- strict TypeScript, ESLint project boundaries, Prettier, Vitest, and Playwright;
- GitHub verification workflow and contributor harness; and
- accepted workbench/requester topology decision.

## Deliberate limits

- The default composition has no token acquisition adapter and fails closed.
- No OIDC client, BFF, login redirect, logout, refresh, or revocation flow exists.
- The provider subject is validated at the wire boundary but not cached or shown.
- No production deployment configuration or ingress exists.
- No `/internal/v1` endpoint is treated as a supported browser contract.
- No requester, widget, or native placeholder has been created.
- React Hook Form and Motion are deferred until their first behavior needs them.

The next security slice should choose and connect the workbench's OIDC-or-BFF
token acquisition model. Resolver data must remain behind the verified actor
boundary.
