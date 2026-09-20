# Ergon Workbench

## TL;DR

This application is Ergon's internal browser experience. It currently delivers
the accessible shell only. Authentication and resolver data are deliberate
follow-up slices.

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

The current shell has no runtime configuration and no backend connection.
