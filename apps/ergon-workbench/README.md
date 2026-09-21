# Ergon Workbench

## TL;DR

This application is Ergon's internal browser experience. It delivers the
accessible shell and a typed, fail-closed current-actor session boundary.
Identity-provider integration and resolver data are deliberate follow-up
slices.

## Commands

From the repository root:

```powershell
pnpm nx dev @ergon/workbench
pnpm nx test @ergon/workbench
pnpm nx build @ergon/workbench
pnpm nx e2e @ergon/workbench-e2e
```

## Boundaries

- Compose routes and application providers here.
- Keep reusable DOM primitives in `@ergon/ui-web`.
- Keep API execution outside presentational components.
- Do not consume `/internal/v1` as a production browser contract.
- Do not create requester, studio, simulation, or native placeholder routes.

`/tenants/{tenantId}` resolves the public control-plane current-actor contract.
RTK Query owns request state and caching; Effect owns token acquisition, HTTP,
timeout, bounded retry, response decoding, and typed errors. The provider
subject is validated but removed before caching.

Local Vite development proxies `/api` to `http://localhost:8090`. Override the
target with the server-side `ERGON_CONTROL_PLANE_URL` environment variable.
Production deployment must provide the same-origin `/api` path.

The default access-token provider deliberately returns no token. It must be
replaced only after the workbench's OIDC-or-BFF security topology is accepted;
tokens must not enter Redux, browser storage, URLs, or Vite environment values.
