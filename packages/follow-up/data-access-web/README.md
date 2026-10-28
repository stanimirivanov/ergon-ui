# Follow-up web data access

## Purpose

Notification targets use a separate current-owner summary resource accepting a historical work pointer. Full model/work validation remains mandatory; existing queue readers still correlate case/run/work. The app owns fresh session and scope disposal. See [ADR 0055](../../../docs/decisions/0055-check-historical-notification-targets-independently.md).

Own confidential-browser BFF execution and follow-up remote-cache integration.

## Owns

- Owner-scoped question history: strict bounded/case/ordering checks, the
  `createFollowUpQuestionsReader` binding and `useFreshFollowUpQuestions`.
  Mount/recheck observations are exclusive, zero-grace and cancelled on retirement.
  Question recording joins the existing session CSRF lifecycle without automatic
  POST replay. Both 200/201 receipts must match exact request/case/claim/revision/text;
  safe mutation failures preserve uncertainty. Acknowledgement never patches history.
  The GET-only response extension validates exact Unicode text, UTC calendar instants
  and unique response identities, strips private extras and preserves omission/null.
  Supplied malformed answers fail the whole observation; POST receipts stay separate.

- Required current priority pairs and exact independent-revision assignment
  receipts, sharing session CSRF without POST retries. Every outcome invalidates
  work/context, not notes; historical receipts never patch current metadata.
  A distinct owned-page observation gates original-active-claim replay, waiting
  for older same-key reads without copying their resources.

- Exact administrative completion requests and historical receipt validation.
  Reuse session CSRF and bounded execution without automatic POST retries.
  Every outcome invalidates work and exact private context/notes observations;
  a completion receipt never synthesizes terminal rows or current access.

- Same-origin BFF request construction and response decoding.
- Direct handover commands and exact echoed receipt validation, sharing CSRF
  without automatic POST retry. All outcomes revalidate work/context/notes;
  historical acknowledgement never supplies current owner-scoped resources.
- Bounded internal-note history and exact append/replay receipt validation,
  sharing the session CSRF lifecycle without automatic mutation retry.
  Notes use tenant/work/claim/revision cache identity, zero-grace eviction and
  a fresh acquisition hook; an append does not invalidate evidence or ownership.
- Follow-up client operations, requests, results, cursors, and presentation-safe
  failures consumed by the feature and cache.
- Browser wire schemas and protocol-to-typed-failure translation.
- Structural owned-work decoding followed by the model's claim/work-item
  pairing and ownership-revision refinement before remote caching.
- Revision-checked claim command construction and echoed-receipt validation;
  the command POST is never automatically retried.
- Exact-claim release construction, receipt validation, typed failure mapping,
  and targeted work/context invalidation using the same CSRF token lifecycle.
- Bounded read retries, per-request timeouts, and cancellation conversion.
- The in-memory, session-bound CSRF token lifecycle for claim commands,
  including single-flight acquisition and compare-and-clear invalidation.
- Follow-up RTK Query cache identity, request lifecycle, tag invalidation, and
  generated React hooks.
- Fresh case-summary disclosure acquisition and subscription retirement through
  a capability-local cache hook, including same-key pending-read sequencing.
- A safe cache-boundary `unexpected-defect` outcome for thrown/rejected clients
  and missing dependency bindings, without serializing or logging their causes.
- Closed failure normalization that keeps only known kinds and valid integer
  HTTP statuses; malformed errors do not become invalid server responses.

Case-summary cache entries use the full tenant, work-item, case, and run request
tuple. A different tuple must fetch and pass BFF response validation before it
can be displayed; the cache never substitutes a summary validated for another
case or run. The entry is evicted after its last active reader leaves, rather
than retaining case evidence for the general query-cache grace period.

## Does not own

- Follow-up model semantics or executable application policy. It checks that a
  decoded case summary matches the requested work, case, and run before using
  the follow-up model's pure cross-field refinement.
- Redux store composition or non-remote client state.
- React routes, feature components, or presentation.
- Session identity resolution or control-plane implementation details.

## Public API and dependencies

Consumers import the BFF client factory, typed client contracts,
`humanFollowUpApi`, generated hooks, and `HumanFollowUpCacheDependencies` from
`@ergon/follow-up-data-access-web`. The package maps validated responses to
follow-up model values without exposing Effect programs or wire DTOs.
Composition roots provide executable operation dependencies through Redux
thunk extra arguments and register the API reducer and middleware.

`useFreshResolverFollowUpCaseSummary` exposes a pending, typed-failure/retry, or
ready projection from current RTK state. Mount and explicit retry establish a
distinct BFF gate after any older exact-key pending read settles. Its local
state contains only gate coordinates, never response copies. Cleanup detaches
the subscription without aborting a request another active reader needs; the
zero-grace cache policy cancels only after the last reader leaves. Abandoned
StrictMode setups and obsolete query lifetimes cannot publish a new disclosure.

The public failure normalizers accept unknown cache/framework errors and return
the operation's closed failure contract. Extra name, message, stack, body, and
cause fields are discarded. Direct client calls can still reject unexpected
defects; RTK Query operations contain those defects as `unexpected-defect`.
The cache adds no retry and never infers cancellation from an aborted signal.
Normalizers recognize only RTK's plain, two-field `AbortError`/`Aborted`
cancellation fingerprint; exceptions and surplus fields are defects. Catches
never inspect thrown errors for that fingerprint.
Claim/release defects leave write outcomes uncertain: any explicit replay keeps
the caller's original command/claim identity and expected revision. Invalidation,
timeouts, read retry policy, and typed client cancellation remain unchanged.

## Verification

```powershell
pnpm nx lint @ergon/follow-up-data-access-web
pnpm nx typecheck @ergon/follow-up-data-access-web
pnpm nx test @ergon/follow-up-data-access-web
```
