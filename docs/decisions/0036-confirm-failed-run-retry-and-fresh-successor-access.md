# ADR 0036: Confirm failed-run retry and fresh successor access

- Status: Accepted
- Date: 2026-10-17
- Milestone: M04 - Guarded Execution and Verification

## TL;DR

Consume the approved backend retry boundary: confirm exact current planning,
retain unchanged intent on uncertainty, and select only the acknowledged
successor identity before obtaining fresh protected facts. Retry creates a new
run with fresh requirements; it neither recovers an invocation nor executes it.

## Context

Ergon PR #166 implements the maintainer-approved policy in backend ADR 0054:
current predecessor supervisor/resolver authority, a versioned total-attempt
ceiling, exact reviewed planning, and atomic fresh successor supervision. The
browser must not infer another allowance, inherit prior authorization, adopt an
unrelated successor or treat a historical receipt as current access.

## Decision

- Keep wire schemas, Effect HTTP, typed failures and RTK resources in existing
  run-supervision data access. A fresh retry-review resource is keyed by
  tenant/run and expected supervision/run revisions. Reuse subscriber retirement
  and pending-request sequencing; closing/reopening cannot disclose an older
  pending review. Disabled, unsupported and exhausted remain distinct.
- Use a dedicated feature control and acknowledged RHF form in ModalDialog.
  Compare review epoch, run revision, attempt and pinned operation before
  confirming. Current policy/evidence may change safeguards; show those fresh
  values rather than requiring the failed run's old policy. Failed/stale review
  withdraws earlier Console disclosure before paint and creates no replay intent.
- Construct one immutable command only after valid mounted confirmation. Retain
  the exact versions, plan, retry policy and ceiling. The local expected attempt
  number validates receipt attribution; it is not a browser-selected server
  field. Decode and strip extras before constructing the POST payload.
- Reuse the committed-command barrier: private readers and modal retire before
  I/O, focus reaches the persistent execution heading, and StrictMode cannot
  replay the mutation. CSRF is invocation-local; one deadline includes setup,
  POST and decoding. Commands never retry automatically. Defects are contained
  cause-free before RTK serialization/logging.
- On uncertainty, offer only exact replay. It may first commit original intent
  if absent; if already stored, it acknowledges that original result without a
  new successor or assignment. A definite conflict needs fresh facts. Leaving
  may discard local intent, never cancel a committed retry.
- Pass the sanitized receipt to the existing command success callback and select
  only its successor ID locally. Reset traversal and acquire fresh discovery and
  exact detail through existing gates, even when discovery membership differs.
  A receipt is not current successor authority; denied access remains neutral.
  No previous approval, execution receipt or proof is copied into successor state.
- Superseding intent retires older command feedback. URL/storage lifetimes,
  shell/pane ownership, ui-web modality and production dependency edges remain
  unchanged. No application core, package or second resource cache is introduced.

| Responsibility                               | Owner before             | Owner after                          | Public contract                                           |
| :------------------------------------------- | :----------------------- | :----------------------------------- | :-------------------------------------------------------- |
| Retry HTTP, decoding, private remote cache   | Not consumed by browser  | Existing run-supervision data access | Retry client, outcomes, review/mutation hooks             |
| Confirmation, uncertainty, private selection | Existing Console feature | Same                                 | Dedicated retry control/controller and existing workspace |
| Modal lifecycle and placement                | ui-web                   | Same                                 | Existing ModalDialog                                      |
| Routes, shell, client binding                | Workbench app            | Same                                 | Existing composition                                      |
| Repeatable guide                             | Browser test harness     | Same                                 | Marked simulated retry walkthrough                        |

## Consequences

Failed work can continue as a discoverable fresh supervised attempt without
claiming execution or closure. The current backend permits two total attempts,
not two additional retries. Exhausted-run escalation remains a separate policy.

Deploy backend schema and every nullable-provenance assignment reader before
enabling ERGON_RUN_SUPERVISOR_RETRY_ENABLED. Old non-null readers are unsafe
after first use; disable commands and recover forward, preserving audit. UI
rollback removes this surface without undoing backend history.

Protocol/cache/component tests cover exact fences, malformed/foreign responses,
uncertainty, privacy, StrictMode and callback retirement. The twenty-step guide
adds actual Chromium keyboard, focus, narrow reflow and synthetic workflow checks.
It does not establish real OIDC, PostgreSQL atomicity or provider behavior.

## Alternatives considered

- Reuse invocation recovery: retains the old reservation instead of creating a
  policy-bounded fresh attempt and has different authority/side-effect meaning.
- Automatically mint another command after timeout: loses exact intent and can
  create an unintended successor or hide a committed retry.
- Render successor facts from the receipt or old Console: fabricates current
  authority and copies stale requirements outside the remote resource owner.
- Add another application layer/cache/runtime: duplicates existing executable
  mechanisms without independent platform-neutral client policy.
