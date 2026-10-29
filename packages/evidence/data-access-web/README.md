# Evidence data-access-web

## TL;DR

Own the documentary review data-access-web boundary for M06. Acceptance is human
documentary judgment, never operational truth or execution authority.

## Ownership

Strict bounded Effect decoding/HTTP and RTK Query own remote state. Requests use
same-origin credentials, no-store, a five-second budget and a two-MiB response cap.
No automatic retries. Every write obtains a fresh CSRF token. Strip authority proof
IDs and diagnostics before serialization. Host-owned isolated scopes abort queries
and mutations, then clear caches after subscribers unmount; zero cache grace is
not persistent storage. Public clients return safe typed failures, while unexpected
defects reject and are contained cause-free by the RTK boundary.

## Verification

Use the root harness and focused Nx targets:

- `pnpm nx typecheck @ergon/evidence-data-access-web`
- `pnpm nx test @ergon/evidence-data-access-web`
- `pnpm nx lint @ergon/evidence-data-access-web`
