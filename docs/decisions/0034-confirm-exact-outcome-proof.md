# ADR 0034: Confirm exact outcome proof acceptance

- Status: Proposed
- Date: 2026-10-15
- Milestone: M04 - Guarded Execution and Verification

## TL;DR

Confirm only the reviewed matching proof through Ergon's supervisor-authorized
browser command. Preserve exact intent on uncertainty, withdraw private resources
before I/O and read terminal proof afresh after historical acknowledgement.

## Context

The user approved current-supervisor, current-resolver finalization of exact
reviewed proof. MATCHING is mutable; action success and a matching read do not
close a case. Backend ADR 0052 adds a default-off audited command that atomically
accepts proof, completes its run and closes the case. Broader steering, connector
execution and forced closure are not approved by this boundary.

## Decision

- Add optional `proofFinalizationSupported` to the same gated Console resource.
  Omission means unsupported; false means disabled. Null/malformed support fails
  the read. Enabled support is not proof eligibility or authority: the control
  additionally requires MATCHING, VERIFYING revision one and a supervision epoch.
- Confirm the condition, exact case/source/fact identities, assessed case version,
  supervision/run revisions and irreversible closure through an acknowledged RHF
  form. Key confirmation to the reviewed resource coordinates. Cancellation before
  submit performs no command; stale forms cannot confirm replacement evidence.
- Data access owns invocation-local CSRF, one complete deadline, typed failures,
  exact receipt decoding and RTK mutation/invalidations. No automatic command retry.
  Verify every reviewed coordinate, terminal sequence and immediate closure version
  before acknowledging success. Strip private extras and contain defects before RTK
  serialization or logging. Do not retain tokens or raw causes.
- Reuse the existing feature-local confirmed-command disclosure barrier. Withdraw
  all private resources before I/O and focus the persistent heading after modal
  teardown. Keep exact intent for explicit uncertain replay only; definite conflicts
  require a fresh read and new acknowledgement. Navigation retires callbacks.
- Success feedback is historical. Retain selection, not proof data, and reopen
  discovery/detail through fresh gates. A terminal run may leave active discovery
  while its exact protected detail remains inspectable. A later denial hides proof
  even though acceptance is durable. No continuous revocation guarantee is added.

| Responsibility                              | Owner before                | Owner after | Public contract                                                           |
| :------------------------------------------ | :-------------------------- | :---------- | :------------------------------------------------------------------------ |
| Console/proof protocol and cache            | run-supervision data access | Same        | Optional support flag, typed finalization command/client/receipt/mutation |
| Confirmation, recovery and pane composition | run-supervision feature     | Same        | Existing workspace API unchanged                                          |
| Modal focus, containment and placement      | ui-web                      | Same        | Existing ModalDialog unchanged                                            |
| Route, shell, store and dependency binding  | workbench app               | Same        | Existing composition unchanged                                            |

Dependency edges remain feature → data access/UI and app → feature/data access.
No package, application core, dependency or second resource cache is introduced.

## Consequences

Operators can deliberately finalize reviewed proof without rerunning the action
or mistaking a mutable match for closure. Exact uncertainty recovery costs local
intent and explicit UI states; leaving can discard replay coordinates without
undoing a server write. The backend flag defaults off and needs schema/backend
deployment before enabling. Old servers remain readable without this command.
Existing proof readers remain read-only; their synthetic fixtures intentionally
omit command support. The new substantial guide covers confirmation, stale review,
lost-response replay, terminal inspection and denial using marked synthetic data.
It does not verify deployed OIDC, PostgreSQL or a connector.

## Alternatives considered

Automatically accept any match: obscures a durable human decision and can accept
evidence the operator never reviewed. Call the internal acceptance endpoint: lacks
the approved session/CSRF/attribution/precondition boundary. Copy proof into local
state: creates a competing resource owner and risks stale disclosure. Add another
command runtime: duplicates an existing mechanism already used by real commands.
