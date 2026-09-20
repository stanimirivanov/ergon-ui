# Current UI implementation state

## TL;DR

The repository contains a verified resolver-workbench shell and a web-only UI
package. It has no API, authentication, resolver inbox, case data, Redux store,
Effect runtime, form workflow, Motion animation, requester app, or native app.

## Implemented

- pnpm workspace managed by Nx 23;
- Node 24 and React 19.3 version contract;
- Vite-built workbench with React Router Data Mode;
- Tailwind CSS theme tokens and one shadcn-compatible button primitive;
- accessible home and unknown-route recovery screens;
- strict TypeScript, ESLint project boundaries, Prettier, Vitest, and Playwright;
- GitHub verification workflow and contributor harness; and
- accepted workbench/requester topology decision.

## Deliberate limits

- No backend endpoint is consumed.
- No authentication or browser session exists.
- No production deployment configuration or ingress exists.
- No `/internal/v1` endpoint is treated as a supported browser contract.
- No requester, widget, or native placeholder has been created.
- Redux Toolkit, RTK Query, Effect, React Hook Form, and Motion are deferred
  until their first behavior needs them.

The next UI slice should resolve an authenticated human actor and fail closed
for missing, invalid, or unregistered identity before exposing resolver data.
