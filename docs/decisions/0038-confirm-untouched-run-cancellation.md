# ADR 0038: Confirm untouched-run cancellation

- Status: Accepted
- Date: 2026-10-18
- Milestone: M04 - Guarded Execution and Verification

## TL;DR

Consume Ergon PR #170's approved cancellation contract in existing supervision
projects. Explicitly confirm untouched-run termination, preserve exact uncertain
intent, and independently re-establish access. Cancellation is not resolution.

## Context

The maintainer approved backend issue #169 and ADR 0056 and merged PR #170.
Only an initial version-zero run without any durable authorization or execution
record may be cancelled. Even an unconsumed grant disqualifies it. The UI must
not suggest provider cancellation or derive permission from missing receipts.

## Decision

- Existing run-supervision data access owns no-store review, eligibility parity,
  exact receipt attribution, safe failures and RTK integration. Recognize
  CANCELLED and RUN_CANCELLED before enabling commands. Validate a single
  initial-to-terminal transition at version one without an execution receipt;
  never manufacture capability or proof evidence. Strip private server extras.
- The existing feature owns fresh review, RHF acknowledgement, immutable local
  command intent and historical feedback. Compare review with the current
  Console's epoch and version. Failed or stale review withdraws private context
  before paint without creating intent. Unsupported or disabled means no command.
- Reuse the committed disclosure barrier and ui-web modality. Remove discovery,
  detail and modal before CSRF/POST acquisition and focus the persistent heading.
  One deadline covers fresh invocation-local CSRF, POST and decoding. Never
  automatically retry commands. Cache boundaries contain unexpected defects.
- Explicit uncertain replay preserves UUID, epoch and version zero. It may
  first apply absent original intent under current first-application gates.
  Historical replay needs the original actor and current resolver evidence,
  not continuing supervision. Changed own intent conflicts; foreign context
  remains neutral absence. No replacement command resolves uncertainty.
- Success keeps selection identity and labelled history only. Reacquire fresh
  discovery, then independently gated exact detail even when CANCELLED has left
  active discovery. Denied reads cannot reconstruct private context from history.
  Other new commands retire old feedback; navigation retires late callbacks.
- Cancellation does not stop/revoke provider work, compensate, accept proof,
  close a case, open follow-up, refund a retry or restart. Authorized/admitted or
  uncertain work uses the existing execution recovery instead.

| Responsibility           | Owner before               | Owner after                      | Public contract                         |
| :----------------------- | :------------------------- | :------------------------------- | :-------------------------------------- |
| Cancellation HTTP/cache  | Backend only               | Existing supervision data access | Cancellation client, outcomes and hooks |
| Confirmation/recovery    | Existing command mechanism | Existing supervision feature     | Dedicated control, form and feedback    |
| Modal, shell, navigation | ui-web / workbench         | Unchanged                        | Existing explicit pane composition      |
| Repeatable documentation | Test-owned guide harness   | Unchanged                        | Marked simulated cancellation chapter   |

No project, application core, dependency edge, cache or persistent state owner
is added. RTK owns observations; React owns interaction/intent; RHF owns fields.

## Consequences

Operators can terminate untouched work without false provider-stop or outcome
claims. Additional protocol, cache, lifecycle and browser checks protect privacy
and exact recovery. Local replay intent is lost on reload/navigation/sign-in;
leaving does not undo server effects. The guide is synthetic, not live authority
or PostgreSQL/provider verification; those guarantees belong to backend tests.

Roll out every backend writer with cancellation false and Flyway target
20261017120000 before installing V20261018120000, then remove the target; or
quiesce all approval/authorization/execution writes during schema-and-code
deployment. Triggers change locking even with the flag off: old child-first
writers cannot resume from migration installation onward. Deploy compatible
readers including this UI before enabling ERGON_RUN_SUPERVISOR_CANCELLATION_ENABLED.
Disabling commands retains history; recover forward. Old enum readers are unsafe
after first cancellation. Browser-session enablement is separately configured.

## Alternatives considered

- A generic stop control: falsely promises termination/revocation of provider
  work and crosses the approved untouched-only boundary.
- Derive eligibility from a missing displayed receipt: ignores durable grants
  and admission records intentionally absent from the browser projection.
- Automatically retry or replace uncertain UUIDs: loses accountable intent and
  mistakes transport loss for rollback.
- Restore terminal data from history or require active-list membership: either
  bypasses current authorization or incorrectly hides authorized terminal detail.
- Add another core/cache/package: duplicates current owners without new behavior.
