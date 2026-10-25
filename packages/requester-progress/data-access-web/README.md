# Requester progress web data access

## Purpose and ownership

Own the exact tenant/case GET, narrow response decoding, same-origin credentials,
bounded Effect execution and RTK cache. The client exposes only caseId, goal,
OPEN/VERIFIED_RESOLVED status and UTC case timestamps. It drops unknown fields,
checks case identity and rejects malformed calendar instants.

## Public API and dependencies

Import only from `@ergon/requester-progress-data-access-web`.
`createProgressBffClient` supplies `ProgressClient`; `progressApi` and
`ProgressDependencies` bind it outside Redux state. `useFreshProgress` waits
for older same-key pending reads before a distinct forced gate, withholds retained
facts while pending/failed, and unsubscribes on retirement without aborting other
readers. Zero-grace eviction owns last-reader cancellation. Only gate coordinates
are local; the resource stays in RTK.

Effect owns per-attempt timeout and one transient retry. No mutation exists.
Known HTTP problems become closed, diagnostic-free failures. Cache integration
contains thrown defects before RTK logging/serialization. No raw problem text,
arbitrary redirect, provider/owner identity, internal timeline or persistent cache
escapes. There are no resolver, session or application dependencies; the app
supplies the separate verified-session boundary.

## Verification

```powershell
pnpm nx test @ergon/requester-progress-data-access-web
pnpm nx typecheck @ergon/requester-progress-data-access-web
pnpm nx lint @ergon/requester-progress-data-access-web
```
