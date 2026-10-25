# ADR 0048: Compose requester-owned case progress

- Status: Accepted
- Date: 2026-10-25
- Milestone: M05 - Adaptive Resolution Experience

## TL;DR

Add the first usable requester deployable with session-first supplied-link access
and a narrow fresh progress observation. Keep resolver dependencies and authority
outside that artifact.

## Context

Ergon PR #202 supplies explicitly owned progress under the separate requester BFF.
Legacy cases have no inferred requester ownership; approval evidence is a distinct
permission. Login returns only to a canonical tenant path.

## Decision

Use `apps/ergon-requester` for separate artifact, routes, shell and store
composition. Reuse session feature/data access with audience-neutral copy.
A new supplied-link lifetime gets a new store, so cached identity cannot verify
another link. No provider tokens, case payloads or private selections persist.

Use `packages/requester-progress/data-access-web` for the five-field DTO,
Effect execution, strict exact-case decoding, typed failures and RTK cache.
Use its feature peer for presentation, privacy withdrawal and focus. No model or
application core is justified: there is no independent client-owned policy.

Requester scope may consume session, requester-progress and shared UI; progress
cannot consume resolver/session capabilities. Workbench cannot consume progress.
Checked architecture and ESLint scope rules enforce those edges.
The existing multi-app browser harness uses test-only `scope:browser-tests`,
not a new production permission for workbench to import requester. Policy
rejects that scope on non-test projects.

The supplied case URL is an intentional navigation contract, never authority.
It contains opaque tenant/case IDs, not content or credentials. Use no-referrer,
do not add analytics, and configure equivalent production headers. The trusted
sign-in builder returns only to the tenant; users then reopen the original case
link. Do not broaden backend redirects or persist a private return location.

Progress acquisition waits for older same-key pending requests, then forces a
distinct check. Pending/failed observations outrank retained data. Recheck intent
commits before I/O; a persistent heading owns focus. Cleanup releases only this
subscription; zero-grace cache eviction retires the last reader.

## Consequences

This first usable app shows only goal, lifecycle and case timestamps. It does not
pretend to be the full M05-PR18 canvas. OPEN has no run/wait/ETA meaning.
VERIFIED_RESOLVED records accepted case proof without disclosing its payload.

Until M05-PR23 a trusted operator provisions ownership. There is no discovery
list, ownership writer, transfer/revocation, intake or sign-out here. Incorrect
provisioning requires stopping requester access and reviewed forward repair.
Separate backend/client/origin/cookie configuration remains mandatory.
Mocked Chromium guides do not prove live IdP/two-origin operations.

## Alternatives considered

A resolver route would share the wrong trust boundary and artifact. App-owned
fetch/JSX would lose capability boundaries. A mandatory application layer would
only forward reads. Persisting a case return target or extending the backend
login allowlist would expand this slice's security contract unnecessarily.
