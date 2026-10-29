# Run supervision web data access

## TL;DR

Own the confidential Console's reads, confirmed handover/approval/execution protocols and
RTK cache lifecycle. The backend owns current authority; a human decision is
not a capability grant. Private resources never acquire a second cache.

## Pinned readiness

`getPinnedReadiness` and `useRunPinnedReadiness` consume merged Ergon PR #182.
Exact tenant/run/epoch, case/prefix and contract coordinates key and validate the
fresh RTK read. Decode supported evaluator/status parity, bounded unique missing
names, exact equality and at most one required supported binding/source. Preserve
stream selection and UTC backsteps; strip extras. Selected evidence can lie
beyond the first-100 history. Pending/failed reads withhold retained data;
reopening waits for old exact-key work before a distinct protected observation.
Existing command invalidation applies. No CSRF, lease, polling or internal/latest
fallback exists. Re-evaluation is not historical planning, execution eligibility
or proof. See [ADR 0044](../../../docs/decisions/0044-inspect-pinned-readiness-and-selected-evidence.md).

## Pinned contract

`getPinnedContract` and `useRunPinnedContract` consume merged Ergon PR #180.
Exact tenant/run/epoch and immutable pin coordinates key the private RTK read;
expectations stay local. Validate bounded identifiers/equalities, unique 1–50
evidence and step declarations, applicability membership, high-risk approval
and exact key/revision/step/capability attribution. Strip extras and preserve
declaration order and UTC backsteps. Declared safeguards need not equal effective
runtime policy. Reopening/rechecking obtains fresh access; commands invalidate
the existing RunDetail tag. No lease, CSRF, polling, persistence or internal
fallback exists. Unsupported is distinct from neutral denial; defects stay
cause-free before cache serialization. See
[ADR 0043](../../../docs/decisions/0043-inspect-exact-pinned-contract-declarations.md).

## Gateway-attempt history

`getInvocationHistory` and `useRunInvocationHistory` consume merged Ergon PR
#178. Exact tenant/run/expected epoch keys use the existing fresh RTK lifecycle,
bounded GET retry/cancellation and shared command invalidation. No lease, CSRF,
polling or internal fallback is introduced. Decode at most 100 preparations,
explicit null completion, SUCCEEDED/FAILED/UNKNOWN and non-null exact signed-Long
timing; strip extras. Preserve returned order and UTC backsteps without causal
inference. Empty coverage is not no calls; null is not running; UNKNOWN is not
terminal failure or retry authority. Shared audit-failure mapping distinguishes
unsupported from neutral denial. See
[ADR 0042](../../../docs/decisions/0042-inspect-recorded-gateway-attempts.md).

## Retry successor lookup

`getRetrySuccessor` and `useRunRetrySuccessor` consume Ergon PR #176's protected
direct relationship. Exact tenant/source/expected epoch keys use the existing
fresh RTK lifecycle, no-store GET and bounded read retry/cancellation. Validate
UTC precision, UUIDs, safe source/target epochs, source match and no self-link;
strip extras. Null means no currently visible successor, not no retry. Unknown
missing routes are unsupported; recognized private denial is not null. No lease,
CSRF, target preload, command or second cache is added. See
[ADR 0041](../../../docs/decisions/0041-recover-independently-visible-retry-successors.md).

## Execution admission history

`getExecutionHistory` and `useRunExecutionHistory` consume Ergon PR #174's
read-only sanitized audit. Requests are lazy, no-store and bounded by the existing
read timeout/retry/cancellation policy; no CSRF or lease is acquired. Exact
tenant/run/expected epoch keys and the shared fresh-read gate prevent retained
or pre-retirement pending data from becoming fresh disclosure. Every parent
mutation invalidates the same RunDetail tag. Failures and defects remain
cause-free before RTK serialization.

Decode command/empty parity, the 100-entry cap and truncation, safe revisions,
UTC precision and returned recording order; strip all unused fields. Do not
require causal timestamp order, INITIAL first, row epochs bounded by the earlier
authorization observation, or provider outcomes per row. The request's expected
epoch stays local. See [ADR 0040](../../../docs/decisions/0040-inspect-recorded-execution-admissions.md).

## Purpose

Own confidential-browser reads and remote-cache integration for resolution runs
assigned to the verified session actor. Assignment is not an exclusive control
lease; this package grants no authority.

## Owns

- Same-origin, no-store `GET /bff/v1/tenants/{tenantId}/resolution-runs/assigned`
  with a bounded limit and intact assignment keyset cursor.
- `GET /bff/v1/tenants/{tenantId}/resolution-runs/{runId}/console` for a recorded
  start/current-state snapshot and sanitized terminal execution receipt, including
  retained terminal-state reads.
- Optional execution projection with distinct older-server omission, absent
  receipt, unmeasured timing and measured zero; exact pinned step/capability
  validation and canonical decimal-string nanoseconds through signed 64-bit
  maximum. Unknown fields are stripped before entering the serializable cache.
- Effect-based schema decoding, safe integer and identity validation, typed
  failures, per-attempt deadline, one transient retry, and caller cancellation.
- RTK Query cache identity, lifecycle, dependency binding, and generated hooks.
- Fresh-disclosure hooks that retire subscriptions, sequence pending exact-key
  reads before reopening, and expose only safe current read phases.
- Cause-free unexpected-defect containment before RTK can serialize or log a
  rejected client, invalid dependency binding, or malformed failure value.

The BFF independently checks current resolver authority and exact assignment.
Non-disclosing absence does not identify whether a run exists for another actor.
Both cache entries are evicted after their final reader leaves. The cache hooks
hide prior data during revalidation/failure and request a fresh read on reopening.
Cleanup only unsubscribes: pinned RTK's zero-grace eviction cancels a pending
request only after its last subscriber leaves, without aborting another reader.

## Browser control

Fresh tenant/run/epoch status, explicit lifecycle commands and optional validated
command fences consume Ergon PR #172. Only THIS_SESSION supplies a usable fence;
explicit DISABLED preserves rollout off. HTTP, cancellation, typed failures and
cause-free defects retain their current owners. Lifecycle receipts are history,
not current ownership; observe status again. All command families preserve the
original fence on exact replay. No automatic mutation retry or persistent
session binding is introduced. See
[ADR 0039](../../../docs/decisions/0039-coordinate-explicit-fenced-browser-control.md).

## Does not own

- Run assignment, runtime control, backend approval policy, or application workflows.
- Evidence compilation, a live trace, multi-step span measurements or billing.
- React feature presentation, routes, or store composition.
- Tokens, persistent browser storage, or private transport diagnostics.

## Public API and dependencies

Import `createRunSupervisionClient`, `runSupervisionApi`,
`RunSupervisionDependencies`, validated projections, queries, results, failures,
and generated hooks from `@ergon/run-supervision-data-access-web`. Composition
supplies `{ runSupervision: client }` as Redux thunk extra arguments and registers
the reducer/middleware. Direct client calls return expected failures and reject
unexpected defects rather than masquerading as transport errors. Every RTK
endpoint contains those rejections as `{ kind: 'unexpected-defect' }`, without
name, message, stack, response body, or cause; they never trigger automatic retry.

`normalizeRunSupervisionFailure` narrows framework errors to the closed safe
failure union, validates integer HTTP statuses in 100–599, and discards extra
fields. Unknown values become unexpected defects, not invalid server responses.
Only RTK's exact plain-object abort fingerprint becomes cancellation; a rejected
client is always a defect, including when its signal concurrently aborts. RTK
itself may win an abort race before the endpoint settles; late client failures
still cannot leak to cache, actions, or raw framework logs.

Console features consume `useAssignedRunDiscovery(query)` and
`useAssignedRunDisclosure(query | null)`. Their `AssignedRunRead<T>` exposes
`closed`, `pending`, `failed`, or `ready`; only `ready` includes the current
RTK-owned projection. `recheck()` closes this consumer's gate in the committed
render before I/O acquisition. Opening/rechecking waits for existing same-key
pending requests to settle, then forces a new request, so pre-close results
cannot authorize a reopened view. Another active subscriber may finish its
existing request; reopening waits without subscribing or aborting that reader.
StrictMode's abandoned effect acquires no request. Local hook state stores only
gate identity/generation, never a resource copy. Direct generated hooks remain
available for integrations that do not own private fresh-disclosure semantics.

Only the pinned Effect, Redux Toolkit, React, and React Redux dependencies are
needed. There is no client-owned application policy or separate model package.

`AssignedRunConsole.execution` is missing when an older server does not supply
the projection, null when no terminal receipt is recorded, and otherwise the
sanitized result for the pinned step/capability. No receipt is not proof of no
external effect. `AssignedRunExecution.timing` is null for an unmeasured result;
valid zero remains a measurement. Nanoseconds stay exact strings, never Number
or BigInt cache values. Result persistence does not imply state advancement or
outcome proof. See [ADR 0028](../../../docs/decisions/0028-render-attributed-capability-execution.md).

`AssignedRunConsole.transitions` is optional only for older-server compatibility.
An empty array means a supported revision-zero prefix, not unsupported history.
Decode at most two known event shapes and validate contiguous sequence, initial
and chained states, final state/revision/update and receipt outcome/completion
before caching. UTC comparison preserves fractional precision and accepts
equivalent trailing-zero padding. Reject inconsistent/null histories without
retry or partial caching; strip unconsumed private fields. Existing cache keys,
fresh-read gates and receipt timing semantics stay unchanged. See
[ADR 0029](../../../docs/decisions/0029-display-sequence-aligned-run-transitions.md).

## Confirmed commands

Approval review is an optional member of the exact Console resource. Decoding
distinguishes unsupported omission, no request, pending, expiry and immutable
decision; inconsistent authority/lifecycle/eligibility fails closed. The
`decideApproval` client uses invocation-local CSRF, a complete command deadline
and no automatic retry. Receipts must match request/run/command/outcome and the
unchanged supervision epoch. RTK's `decideRunApproval` mutation contains safe
typed failures/defects and invalidates related resources on success. The
consumed command HTTP executor preserves handover's existing cancellation and
read-retry semantics. See [ADR 0031](../../../docs/decisions/0031-confirm-human-approval-prerequisites.md).

Confirmed handover extends this API with current-epoch recipient discovery and
session-CSRF transfer. `useRunSupervisorCandidates` closes/reopens with the same
fresh-disclosure mechanism as run reads; its key includes tenant, run, expected
supervision revision and private cursor. Tokens are invocation-local, not cached.
Transfers have one deadline across setup/POST/decoding and no automatic retry.
The receipt must match run, command and next epoch. Safe typed handover failures
and unexpected defects are contained at the cache boundary. Successful transfer
invalidates related discovery/detail/candidate subscribers; mutation feedback
is historical, never current supervision truth. See
[ADR 0030](../../../docs/decisions/0030-confirm-revisioned-supervisor-handover.md).

## Pinned evidence

`pinnedEvidence` is an optional member of the same gated Console resource, not
a separate endpoint/cache. Omission is unsupported; null or malformed attribution
fails closed. Decoding checks the exact case/pinned version, unique ordered
bindings and source identities, source-before-binding positions, matching account
references, supported values and bounded text/collection sizes. Only the first
100 bindings are returned with explicit truncation, never as current truth or
contradiction assessment. See [ADR 0032](../../../docs/decisions/0032-inspect-supervisor-scoped-pinned-evidence.md).

## Outcome verification

`outcomeVerification` extends the same gated resource. Omission means unsupported,
not unassessed. Status-specific decoding distinguishes missing evidence, mismatch,
mutable matching and immutable acceptance. Validate post-pin source/binding order,
subject, observed-after-action eligibility, successful receipt, state/transition
alignment and exact acceptance/closure coordinates before caching. Private extras
are discarded; null or malformed proof rejects the complete read. No case-event
recording time is invented. See [ADR 0033](../../../docs/decisions/0033-inspect-outcome-verification-and-accepted-proof.md).

## Proof finalization

`finalizeProof` and `useFinalizeRunProofMutation` accept the exact reviewed
supervision/run versions, assessed case version and source/fact identities.
One deadline includes invocation-local CSRF, POST and strict receipt decoding;
there is no automatic retry. Only the originating actor with current resolver
authority can replay unchanged intent. A receipt acknowledges atomic proof/run/
case completion, never present disclosure authority. Success invalidates related
run resources. `proofFinalizationSupported` omission means unsupported, false
means disabled rollout; it is not proof eligibility. See
[ADR 0034](../../../docs/decisions/0034-confirm-exact-outcome-proof.md).

## Execution and recovery

Execution adds explicit `getExecutionReview`, `submitExecution` and
`useRunExecutionReview` to the same cache/client composition. Review is requested
only on demand and is keyed by tenant/run and reviewed revisions. Closing the
modal retires its subscription; reopening forces a distinct authority check.
The feature compares returned epochs/prerequisites with the current Console.

The command union distinguishes first execution from an explicit recovery attempt.
Both use one deadline across invocation-local CSRF, POST and status-specific
decoding, with no automatic retry. An admitted identity only acknowledges status;
retrying an unadmitted identity may first admit the original confirmed intent. A new
confirmed attempt reuses the original command/reservation; the backend owns
originator and current-supervisor/resolver gates. Decode 202 INCOMPLETE or
RESULT_RECORDED separately from 200 COMPLETED, validate exact command/run/attempt
identities and result/state/nullability, and strip private extras. Every command
result invalidates related resources because even a lost acknowledgement may
follow an effect. Cache-boundary defects remain cause-free. See
[ADR 0035](../../../docs/decisions/0035-confirm-capability-execution-and-recovery.md).

## Failed-run retry

`getRetryReview`, `retryRun`, `useRunRetryReview` and `useRetryFailedRunMutation`
consume the separately enabled browser retry contract. Review is an advisory,
fresh RTK resource, not a grant or a retained feature snapshot. Decoding checks
rollout/eligibility parity, total-attempt budget, exact planning coordinates,
browser-safe revisions and receipt attribution; private extras are stripped.
The local expected attempt validates the acknowledgement and is never sent as
a server-selected field. Commands use invocation-local CSRF under one deadline
and never retry automatically. Every result invalidates related observations,
including uncertain acknowledgements. Historical replay may first commit absent
original intent and never restores successor access. See
[ADR 0036](../../../docs/decisions/0036-confirm-failed-run-retry-and-fresh-successor-access.md).

## Exhausted-run escalation

`getEscalationReview`, `escalateRun`, `useRunEscalationReview` and
`useEscalateExhaustedRunMutation` consume the separately enabled browser contract
from Ergon PR #168. Review is a fresh private RTK observation with exact epoch,
failed revision, attempt and runtime ceiling, never authority. Decode eligibility
parity, safe coordinates, fixed queue and every acknowledged fence; strip extras.
One non-retried deadline covers invocation-local CSRF, POST and receipt decoding.
Every result invalidates run observations because a lost response can follow a
commit. Cause-free failures/defects stay behind the cache boundary. Historical
OPEN acknowledges original creation, not current ownership or status. See
[ADR 0037](../../../docs/decisions/0037-confirm-exhausted-run-escalation-and-fresh-follow-up-access.md).

## Untouched-run cancellation

`getCancellationReview`, `cancelRun`, `useRunCancellationReview` and
`useCancelUntouchedRunMutation` consume Ergon PR #170. Validate supported/reason/
eligibility parity, version zero, safe revisions and every receipt coordinate;
strip extras. One non-retried deadline covers invocation-local CSRF and POST.
Every outcome invalidates private observations, including uncertain failures.
Exact historical replay may first apply an absent original command, never grant
access. CANCELLED/RUN_CANCELLED is terminal without an execution receipt, proof
or case closure. See [ADR 0038](../../../docs/decisions/0038-confirm-untouched-run-cancellation.md).

## Verification

```bash
pnpm nx lint @ergon/run-supervision-data-access-web
pnpm nx typecheck @ergon/run-supervision-data-access-web
pnpm nx test @ergon/run-supervision-data-access-web
```
