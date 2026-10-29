# Requester progress web data access

## Purpose and ownership

Own exact tenant/case progress and requester-history GETs, narrow decoding,
same-origin credentials, bounded Effect execution and separate RTK resources.
Progress exposes only caseId, goal, status and UTC case timestamps. History adds
bounded questions and optional/null/recorded answers without resolver attribution.
Validate exact progress identity, calendar instants, Unicode and latest-100
ordering; strip unknown fields, including nested private answer metadata.

## Public API and dependencies

Import only from `@ergon/requester-progress-data-access-web`.
`createProgressBffClient` supplies `ProgressClient`; `progressApi` and
`ProgressDependencies` bind it outside Redux state. `useFreshProgress` waits
for older same-key pending reads before a distinct forced gate, withholds retained
facts while pending/failed, and unsubscribes on retirement without aborting other
readers. Both progress then history must succeed before disclosure, without
claiming an atomic snapshot. Zero-grace eviction owns last-reader cancellation.
Only gate coordinates are local; resources stay in RTK. Injected `ProgressClient`
implementations must now supply `readQuestions`.

Effect owns per-attempt read timeout and one transient read retry.
The same factory additionally supplies `RequesterAnswerClient`. Its explicit
answer invocation obtains fresh session CSRF then sends at most one POST within
the configured timeout, without automatic setup/POST retries or token caching.
Only an exact 200/201 receipt acknowledges intent; no receipt enters history.
The RTK mutation contains defects and is reset by the mounted workflow after
settlement. Reads remain compatible with read-only injected clients; a missing
write binding fails safely. See [ADR 0053](../../../docs/decisions/0053-record-requester-answers-with-exact-recovery.md).

BREAKING (source-only, pre-release): typed `ProgressDependencies` bindings require
both read and answer ports. The existing app factory supplies both; the narrower
`ProgressClient` read port and HTTP GET contracts remain unchanged.
Known HTTP problems become closed, diagnostic-free failures. Cache integration
contains thrown defects before RTK logging/serialization. No raw problem text,
arbitrary redirect, provider/owner identity, internal timeline or persistent cache
escapes. There are no resolver, session or application dependencies; the app
supplies the separate verified-session boundary.

## Verification

```bash
pnpm nx test @ergon/requester-progress-data-access-web
pnpm nx typecheck @ergon/requester-progress-data-access-web
pnpm nx lint @ergon/requester-progress-data-access-web
```
