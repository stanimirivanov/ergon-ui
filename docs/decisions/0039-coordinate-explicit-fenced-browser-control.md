# ADR 0039: Coordinate explicit fenced browser control

- Status: Accepted
- Date: 2026-10-19
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Consume Ergon PR #172's approved session-bound control policy in the existing
supervision projects. Acquire, renew and release explicitly; preserve the
original command fence during uncertainty. A lease is not tool authorization.

## Context

Backend issue #171 and ADR 0057 establish one 120-second lease per server
browser session and a monotonic acquisition fence. The maintainer merged PR
#172 and requested the dependent UI and guide. The previous Console displays
supervision but cannot coordinate competing authenticated sessions.

## Decision

- Data access owns strict status/lifecycle decoding, safe failures, Effect
  execution and RTK Query. Feature owns presence, the advisory monotonic
  countdown and immutable interaction intent. App shell and ui-web modality
  retain their existing owners; no project, dependency edge or cache is added.
- Status is a fresh private observation tied to tenant, run and supervision
  epoch. Only THIS_SESSION supplies a usable fence. Explicit DISABLED retains
  rollout-off behavior; missing, malformed, denied or unavailable status fails
  closed. Pending/failed status blocks new commands; denial withdraws detail.
- Acquisition, renewal and release are explicit. No read, timer, selection,
  close, navigation or recovery silently renews, releases or takes over.
  Tabs sharing a server session share control. Countdown is advisory; server
  transaction-time expiry and current authority remain decisive.
- All seven existing command families, including additional execution recovery,
  capture the current fence at confirmation. The existing committed barrier
  removes private readers/modal before lifecycle or business POST acquisition.
  CSRF is invocation-local and one deadline bounds the complete attempt.
- Explicit uncertain replay preserves the original command UUID, revisions and
  fence, even after control loss. An absent command can first apply only its
  original still-valid fence; a historical receipt does not reacquire control.
  A definite conflict needs fresh facts and separately reviewed new intent.
- Historical lifecycle receipts are followed by fresh status, never treated as
  current ownership or a renewed expiry. Navigation retires local intent,
  callbacks, subscriptions and timers without promising server cancellation.
- Handover invalidates the outgoing epoch; retry successors acquire independently.
  Terminal runs offer no new control. Lease loss does not revoke grants, cancel
  provider work, accept proof or close a case.
- The simulated guide records explicit lifecycle, competing/expired snapshots,
  unchanged recovery, a fenced cancellation and neutral status denial. Real
  authorization, durability and races remain backend verification.

## Consequences

Default-off deployment remains usable through explicit DISABLED status. A
compatible backend is required for the new control boundary; an older missing
route is not a silent bypass. Before enabling ERGON_RUN_CONTROL_ENABLED, deploy
schema, every compatible writer/reader and UI, then quiesce browser ingress and
in-flight command transactions. The process-local BFF remains single-instance.
Disabling explicitly relaxes policy, never undoes effects. Keep audit history
and recover forward; old writers are unsafe with enforcement enabled.

Local intent is deliberately lost on reload/navigation/sign-in. No personal
session binding, cookie, resource snapshot or fence is persisted in URL/storage.
Observations stay RTK-owned and timer metadata is not a second lease cache.

## Alternatives considered

- Infer exclusivity from supervisor identity: misses competing browser sessions.
- Automatically renew/acquire before command replay: silently changes reviewed
  intent and can repeat an effect whose acknowledgement was lost.
- Treat missing endpoints as disabled: creates a security-sensitive fallback.
- Add a client application core, second cache or distributed tab lock: duplicates
  existing owners and contradicts the approved server-session coordination.
