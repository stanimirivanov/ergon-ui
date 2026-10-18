# ADR 0037: Confirm exhausted-run escalation and fresh follow-up access

- Status: Accepted
- Date: 2026-10-18
- Milestone: M04 - Guarded Execution and Verification

## TL;DR

Consume Ergon PR #168's approved supervisor-scoped exhaustion contract. Confirm
exact intent, retain it on uncertainty, and independently re-establish run and
follow-up access. A creation receipt is history, never ownership or resolution.

## Context

The runtime ceiling permits two total attempts. The maintainer approved backend
issue #167 and ADR 0055, and merged PR #168 before this dependent UI slice.
Retry cannot create a third attempt; escalation is a separate explicit terminal
decision that opens unassigned human work, without a connector or case closure.

## Decision

- Existing run-supervision data access owns fresh no-store escalation review,
  strict related-field/receipt decoding, safe failures and RTK integration.
  Validate browser-safe revisions, positive bounded attempts, rollout/reason/
  eligibility parity, the fixed queue and every acknowledged command fence.
  Strip private extras. The backend remains the sole authority and budget owner.
- The existing feature owns a dedicated review/control, acknowledged RHF form,
  immutable local command tuple and historical feedback. Review compares the
  current Console's epoch, failed revision and attempt. Disabled, unsupported,
  remaining-budget, stale or failed review cannot create intent. Failed access
  review withdraws earlier private disclosure before paint.
- Reuse the committed command barrier and ui-web modal. Retire discovery, detail
  and modal before CSRF/POST acquisition; focus the persistent execution heading.
  One deadline covers invocation-local CSRF, POST and decoding. Commands never
  retry automatically; defects are contained cause-free before RTK logging/state.
  Navigation retires callbacks without claiming to cancel server effects.
- Explicit uncertain replay preserves command ID, epoch, failed revision, source
  attempt, retry policy, ceiling and reason. If absent, it may first commit that
  original confirmation. Exact historical replay requires the original actor and
  current resolver evidence, not continued supervision. Changed intent conflicts;
  never adopt an unrelated internal or other browser escalation.
- Success preserves only selection identity and historical creation feedback,
  resets traversal and opens fresh discovery/detail gates. Terminal detail may
  remain readable after active discovery empties, but only a fresh exact read
  permits it. Denied reads must not reconstruct private facts from the receipt.
- Feedback explains that OPEN is the original creation status, not current work
  status or ownership. Use the existing app-owned Back to follow-ups navigation
  for independent queue discovery; claiming is a separate deliberate operation.
  Never pass receipt IDs into owned case disclosure, auto-claim, or infer closure.
- No project, application core, cache, storage, dependency edge, shell mode or
  route is introduced. Shared transport, fresh-read retirement and modality keep
  their existing owners. Superseding command intent clears older command feedback.

| Responsibility                | Owner before                        | Owner after                      | Public contract                                    |
| :---------------------------- | :---------------------------------- | :------------------------------- | :------------------------------------------------- |
| Escalation HTTP/private cache | Backend only                        | Existing supervision data access | Escalation client, outcomes, review/mutation hooks |
| Confirmation and uncertainty  | Existing Console command mechanisms | Existing supervision feature     | Dedicated control/controller/feedback              |
| Modal, shell, routes          | ui-web / workbench                  | Unchanged                        | Existing explicit composition                      |
| Repeatable guide              | Test harness                        | Same                             | Marked simulated escalation chapter                |

## Consequences

Exhausted recovery can become actionable human work without another attempt,
implicit ownership or fabricated resolution. More local confirmation/feedback
states require protocol, cache, lifecycle and browser regressions, not a second
client policy engine. Local replay coordinates disappear on navigation/reload.

Deploy additive backend schema/code before enabling
ERGON_RUN_SUPERVISOR_ESCALATION_ENABLED (default false). Disabling commands or
rolling back this UI does not remove committed history; preserve audit and
recover forward. Browser-session deployment remains separately configured.

The executable guide covers confirmation, conflict, lost acknowledgement,
unchanged replay, private withdrawal, terminal reads and independent queue access.
Its fixtures are synthetic, not real OIDC, provider or database-backed browser
verification. Backend tests own actual authority, transaction and race evidence.

## Alternatives considered

- Automatically escalate on exhaustion or claim for the supervisor: hides
  accountable intent and conflates run supervision with follow-up ownership.
- Read the internal endpoint or disclose its full receipt: bypasses the reviewed
  browser boundary and exposes private actor/authority attribution.
- Treat OPEN in the receipt as current queue state or restore private data from
  it: mistakes immutable creation history for live access and ownership.
- Add another client core/cache or invent new attempt policy: duplicates existing
  ownership without independent platform-neutral behavior.
