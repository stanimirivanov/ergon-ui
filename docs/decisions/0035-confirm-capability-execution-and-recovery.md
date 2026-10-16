# ADR 0035: Confirm capability execution and explicit recovery

- Status: Accepted
- Date: 2026-10-16
- Milestone: M04 - Guarded Execution and Verification

## TL;DR

Consume the merged, approved backend execution boundary. An admitted identity
only acknowledges status; retrying an unadmitted identity may first admit the
original confirmed intent. Additional recovery requires a distinct reviewed
attempt. Successful execution is not independent outcome proof or closure.

## Context

Ergon PR #164 implements the maintainer-approved authorization and recovery
policy in backend ADR 0053. The browser must not treat uncertain completion as
permission to mint replacement intent, infer execution authority from supervision,
or expose internal development endpoints. Existing Console command and disclosure
mechanisms already own the necessary interaction and transport lifetimes.

## Decision

- Request execution review explicitly for the current disclosed run. RTK Query
  owns this separate private resource, keyed by tenant/run and reviewed revisions.
  Every opening is fresh; pending/failed reads expose no retained review. Compare
  returned epochs and prerequisite identities before confirmation. Failed access
  review withdraws earlier Console context before paint, without creating intent.
- Omitted endpoints and disabled support are unavailable, never revision zero or
  implicit permission. No polling, internal fallback or additional client cache.
- A dedicated feature control confirms the pinned action, risk, revisions and
  irreversible reservation through an acknowledged RHF form in ModalDialog.
  Only immutable intent and historical feedback survive submission. Existing
  committed phases withdraw all private resources before acquiring mutation I/O.
- Data access owns invocation-local CSRF, one deadline, strict status-specific
  decoding, typed failures and RTK defect containment. Only reads may retry;
  mutations never retry automatically. Bind acknowledgement command/run/attempt
  identities and outcome/state/nullability. No private extras or raw causes enter
  Redux, logs, URLs or persistent browser storage.
- INCOMPLETE and RESULT_RECORDED are non-terminal 202 acknowledgements. COMPLETED
  is a historical 200 sequence-one result: SUCCEEDED reaches VERIFYING; FAILED
  reaches ACTION_FAILED. None independently verifies the outcome or closes a case.
- Retry an uncertain original command/attempt only with its unchanged tuple.
  If already admitted, this is status-only. If the prior request never admitted
  it, the retry may first admit and dispatch that originally confirmed intent;
  never advertise an uncertain POST as a side-effect-free status read. Additional
  recovery needs fresh Console/review access and a distinct confirmed attempt UUID
  against the same command and current epoch. The server enforces original actor,
  current supervision and resolver evidence. Incoming supervisors cannot adopt
  another actor's command. No authority or new intent is granted by retrying.
- An admitted effect cannot be cancelled by leaving, timeout, handover or later
  authority expiry. Navigation retires callbacks and may discard local replay
  intent, not reverse the server's reservation. No autonomous recovery is added.

| Responsibility                             | Owner before                | Owner after | Public contract                                                 |
| :----------------------------------------- | :-------------------------- | :---------- | :-------------------------------------------------------------- |
| Protocol, Effect and private RTK resources | run-supervision data access | Same        | Execution review, intent, acknowledgement, client and endpoints |
| Confirmation, feedback and disclosure      | run-supervision feature     | Same        | Existing workspace composition, dedicated execution control     |
| Modal focus and placement                  | ui-web                      | Same        | Existing ModalDialog                                            |
| Route, shell and dependency binding        | workbench app               | Same        | Existing composition                                            |

No package, dependency edge, model/application core or second cache is added.
Unrelated legacy pages remain outside this redesigned Console slice.

## Consequences

The operator can distinguish status recheck from explicit recovery and action
success from verified resolution. Fresh reads remain observations rather than
authorization tokens. Deploy backend schema/code first; execution defaults off
under ERGON_RUN_SUPERVISOR_EXECUTION_ENABLED. Older servers remain readable.
Only the original actor can recover; trusted operator recovery is still necessary
when they cannot return. The executable guide uses clearly marked synthetic
responses and does not verify real IdP, database or provider guarantees.

## Alternatives considered

Automatic mutation retry or a new command on timeout could duplicate intent.
Treating 202 as terminal success would fabricate completion. Calling internal
endpoints bypasses the approved browser boundary. Copying review into local state
creates stale authority hints. A new command runtime or application package would
duplicate already consumed mechanisms without an independent client use case.
