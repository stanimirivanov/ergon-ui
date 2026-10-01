# Session model

## Purpose

Own the platform-neutral identity projection for a server-verified session.

## Owns

- The current actor value exposed after server-side identity verification.
- The invariant that provider subjects and credentials are absent from that
  value.

## Does not own

- HTTP payload schemas, sign-in URLs, status codes, retries, or timeouts.
- Session-resolution gateway contracts, RTK Query caching, React routes, or
  presentation.
- Provider token storage or browser authentication mechanics.

## Public API and dependencies

Consumers import only `@ergon/session-model`. This `type:model` project has no
runtime dependencies and may not import frameworks, platform APIs, data-access
projects, or feature projects.

## Verification

```powershell
pnpm nx lint @ergon/session-model
pnpm nx typecheck @ergon/session-model
pnpm nx build @ergon/session-model
```
