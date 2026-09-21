# Ergon Workbench

## TL;DR

This application is Ergon's internal browser experience. It delivers the
accessible shell and a typed, fail-closed current-actor session boundary.
It consumes the control plane's confidential BFF without exposing provider
tokens to browser code. Resolver data is a deliberate follow-up slice.

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

`/tenants/{tenantId}` resolves the control-plane BFF session contract. RTK Query
owns request state and caching; Effect owns HTTP, timeout, bounded transient
retry, response decoding, and typed errors. Provider subjects and credentials
never enter the response or browser cache.

Local Vite development proxies `/bff`, `/oauth2`, and `/login/oauth2` to
`http://localhost:8090`. Override the target with the server-side
`ERGON_CONTROL_PLANE_URL` environment variable. Production deployment must
provide the same-origin paths.

A live sign-in additionally requires the control plane's `ergon-workbench` OIDC
client registration. Its secret remains server-side and must never enter Vite
configuration.
