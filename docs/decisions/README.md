# UI architecture decisions

## TL;DR

Accepted ADRs are durable historical records. Supersede rather than rewrite a
decision whose context or outcome changes.

## Naming and lifecycle

Published decisions use `NNNN-lowercase-kebab.md`, a matching
`# ADR NNNN: Title`, a real ISO date, one `MNN - Outcome` milestone, and the
section order in the template. Supported statuses are `Proposed`, `Accepted`,
`Rejected`, `Deprecated`, or `Superseded by` an exact ADR link.

A replacement adds `- Supersedes:` with exact links to every decision it
replaces; each older record points back through its status. The published ADR
high-water mark is `0048`. It may advance with the next decision but must never
decrease, even when the newest record is later superseded or deprecated.

## Index

| ADR                                                                         | Status     | Decision                                                         |
| :-------------------------------------------------------------------------- | :--------- | :--------------------------------------------------------------- |
| [0001](0001-adopt-nx-and-separate-browser-trust-boundaries.md)              | Accepted   | Adopt Nx and separate workbench/requester browser deployables    |
| [0002](0002-resolve-browser-sessions-with-rtk-query-and-effect.md)          | Superseded | Resolve actor sessions through RTK Query and Effect              |
| [0003](0003-consume-confidential-bff-sessions.md)                           | Accepted   | Consume confidential same-origin BFF sessions                    |
| [0004](0004-consume-read-only-resolver-inbox.md)                            | Accepted   | Consume the read-only resolver follow-up inbox                   |
| [0005](0005-claim-follow-up-with-ephemeral-csrf-tokens.md)                  | Superseded | Claim follow-up work with ephemeral CSRF tokens                  |
| [0006](0006-recover-resolver-owned-follow-up-work.md)                       | Accepted   | Recover active claims from the confidential BFF                  |
| [0007](0007-render-owned-follow-up-case-context.md)                         | Superseded | Render server-authorized context inside owned follow-ups         |
| [0008](0008-render-failed-execution-and-retry-handoff.md)                   | Accepted   | Explain failed execution and exhausted retry handoff             |
| [0009](0009-enforce-capability-and-dependency-boundaries.md)                | Superseded | Enforce capability-specific ports and inward dependencies        |
| [0010](0010-extract-capability-react-adapters.md)                           | Superseded | Extract capability React code as inbound adapters                |
| [0011](0011-adopt-capability-first-frontend-boundaries.md)                  | Accepted   | Adopt capability-first roles and selective application cores     |
| [0012](0012-enforce-repository-documentation-policy.md)                     | Accepted   | Enforce repository documentation policy                          |
| [0013](0013-name-follow-up-feature-by-capability-and-role.md)               | Accepted   | Name the follow-up feature by capability and role                |
| [0014](0014-name-follow-up-data-access-by-capability-and-role.md)           | Accepted   | Name follow-up data access by capability and role                |
| [0015](0015-name-follow-up-model-by-capability-and-role.md)                 | Accepted   | Name the follow-up model by capability and role                  |
| [0016](0016-name-session-data-access-by-capability-and-role.md)             | Accepted   | Name session data access by capability and role                  |
| [0017](0017-name-session-model-by-capability-and-role.md)                   | Accepted   | Name the session model by capability and role                    |
| [0018](0018-bind-case-context-cache-to-full-request-identity.md)            | Accepted   | Bind case-context cache to the validated request tuple           |
| [0019](0019-revalidate-case-context-after-disclosure-closes.md)             | Accepted   | Recheck case context after disclosure closes                     |
| [0020](0020-use-revision-checked-browser-claim-commands.md)                 | Accepted   | Use revision-checked browser claim commands                      |
| [0021](0021-release-owned-follow-up-through-the-browser-bff.md)             | Accepted   | Release owned follow-up through the browser BFF                  |
| [0022](0022-publish-simulated-user-guide-from-main.md)                      | Accepted   | Publish the simulated user guide from main                       |
| [0023](0023-consume-assigned-run-console-snapshots.md)                      | Accepted   | Consume assigned-only active-run Console snapshots               |
| [0024](0024-contain-client-defects-at-cache-boundaries.md)                  | Accepted   | Contain client defects before cache serialization and logging    |
| [0025](0025-own-private-console-disclosure-workflows.md)                    | Accepted   | Own private Console gates and committed feature workflows        |
| [0026](0026-compose-console-shell-and-named-panes.md)                       | Accepted   | Compose app chrome and capability panes through explicit slots   |
| [0027](0027-own-inspection-modal-lifecycle-in-ui-primitives.md)             | Accepted   | Own inspection modal lifecycle and source-selection retirement   |
| [0028](0028-render-attributed-capability-execution.md)                      | Proposed   | Render exact attributed execution with compatibility absence     |
| [0029](0029-display-sequence-aligned-run-transitions.md)                    | Proposed   | Display state-aligned immutable transition prefixes              |
| [0030](0030-confirm-revisioned-supervisor-handover.md)                      | Proposed   | Confirm handover with exact replay and committed disclosure      |
| [0031](0031-confirm-human-approval-prerequisites.md)                        | Proposed   | Confirm exact human prerequisites without granting execution     |
| [0032](0032-inspect-supervisor-scoped-pinned-evidence.md)                   | Proposed   | Inspect pinned bindings and only their linked sources            |
| [0033](0033-inspect-outcome-verification-and-accepted-proof.md)             | Proposed   | Distinguish mutable matching from durable proof acceptance       |
| [0034](0034-confirm-exact-outcome-proof.md)                                 | Proposed   | Confirm exact reviewed proof with replay-safe case closure       |
| [0035](0035-confirm-capability-execution-and-recovery.md)                   | Accepted   | Confirm execution, status-only replay and explicit recovery      |
| [0036](0036-confirm-failed-run-retry-and-fresh-successor-access.md)         | Accepted   | Confirm failed-run retry and fresh successor access              |
| [0037](0037-confirm-exhausted-run-escalation-and-fresh-follow-up-access.md) | Accepted   | Confirm exhausted escalation and independent fresh access        |
| [0038](0038-confirm-untouched-run-cancellation.md)                          | Accepted   | Confirm untouched-run cancellation with exact recovery           |
| [0039](0039-coordinate-explicit-fenced-browser-control.md)                  | Accepted   | Coordinate explicit session control and original command fences  |
| [0040](0040-inspect-recorded-execution-admissions.md)                       | Accepted   | Inspect sanitized admissions without inventing provider traces   |
| [0041](0041-recover-independently-visible-retry-successors.md)              | Accepted   | Recover direct successors through independently fresh access     |
| [0042](0042-inspect-recorded-gateway-attempts.md)                           | Accepted   | Inspect partial gateway facts without causal or proof inference  |
| [0043](0043-inspect-exact-pinned-contract-declarations.md)                  | Accepted   | Inspect exact immutable declarations without execution inference |
| [0044](0044-inspect-pinned-readiness-and-selected-evidence.md)              | Accepted   | Inspect pinned readiness without planning or authority inference |
| [0045](0045-confirm-current-owner-follow-up-handover.md)                    | Accepted   | Confirm direct follow-up handover with exact historical recovery |
| [0046](0046-confirm-terminal-follow-up-completion.md)                       | Accepted   | Confirm terminal administrative completion with exact recovery   |
| [0047](0047-confirm-independent-follow-up-priority.md)                      | Accepted   | Confirm independent metadata with original-active-owner recovery |
| [0048](0048-compose-requester-owned-case-progress.md)                       | Accepted   | Separate requester app and fresh owner-scoped progress           |
| [0049](0049-inspect-private-requester-question-history.md)                  | Accepted   | Distinct private observations for owner-scoped question history  |
| [0050](0050-record-requester-questions-with-exact-recovery.md)              | Accepted   | Confirmed exact question recording and uncertain recovery        |
| [0051](0051-inspect-recorded-requester-answers.md)                          | Accepted   | Narrow answer inspection under existing private question gates   |
| [0052](0052-gate-requester-history-with-case-progress.md)                   | Accepted   | Fresh requester progress and narrow question/answer history      |
| [0053](0053-record-requester-answers-with-exact-recovery.md)                | Accepted   | Requester answer submission and mounted exact uncertain recovery |
| [0054](0054-create-requester-cases-with-exact-recovery.md)                  | Accepted   | Requester intake and exact uncertain recovery                    |
| [0055](0055-check-historical-notification-targets-independently.md)         | Accepted   | Historical notifications with fresh session and target access    |

Use [the template](0000-template.md) for decisions affecting compatibility,
security, deployment, foundational technology, persisted meaning, or multiple
applications.
