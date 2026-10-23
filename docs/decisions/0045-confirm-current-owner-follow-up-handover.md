# ADR 0045: Confirm current-owner follow-up handover

- Status: Accepted
- Date: 2026-10-23
- Milestone: M05 - Adaptive Resolution Experience

## TL;DR

Confirm one direct follow-up transfer, withdraw private context before sending,
and recover uncertainty only with the original immutable intent. A historical
acknowledgement never restores owner-scoped disclosure.

## Context

Merged Ergon PR #188 and backend ADR 0064 supply a default-off browser handover
command. The current owner with current resolver authority can atomically replace
an open follow-up claim with a distinct eligible same-tenant recipient's claim.
Exact replay can return the original sender's historical receipt after ownership
has moved, provided current resolver authority remains. This differs from note
replay, which requires continued ownership, and from run-supervisor handover.

## Decision

- Follow-up model owns an inert historical receipt. Existing data access owns
  the typed command, Effect execution, safe failure mapping and RTK mutation.
  Reuse the synchronized session CSRF lifecycle; no automatic POST retry.
  Validate echoed intent, distinct successor claim, safe revision advance by
  two and UTC timestamps before exposing an acknowledgement.
- Feature owns an RHF recipient/acknowledgement form and a mounted command
  controller. Capture one command UUID, tenant/work item, original claim,
  expected revision and recipient. No actor directory, provider subject lookup,
  persistent replay record, URL parameter or sender authority field is added.
- Submission closes the selected Console context and commits a withheld phase
  before the effect starts network execution. Exact replay retains the original
  tuple; it never substitutes a newer claim, revision, recipient or command ID.
  StrictMode effect reattachment does not replay the mutation.
- The controller retains phase, immutable intent and historical acknowledgement,
  never copied RTK resources. All outcomes invalidate owned/inbox and exact
  case/notes observations. An explicit owned-work recheck is required before
  opening independently authorized context; a receipt does not reopen it.
- Pending, failed and acknowledged phases retain the app-supplied Console shell.
  Persistent Back receives focus before private controls disappear. Modal
  dismissal restores its live trigger. Close, tenant replacement and unmount
  retire subscriptions, abort browser work and suppress obsolete completions.
  Leaving discards local replay intent but cannot undo an already sent transfer.
- Reuse existing ui-web modal geometry and focus containment. No dependency,
  Nx project, application core, Redux slice or general command framework is added.

## Consequences

Resolvers can transfer responsibility without a release/claim gap and recover a
lost response without inventing a second transfer. Recipient eligibility remains
server-owned; the browser only validates UUID syntax. Neutral recipient errors
must not expose whether another-tenant or ineligible actor exists.

Deploy backend PR #188 before this client and enable handover only after compatible
clients are available. UI rollback removes the interaction without changing
durable ownership or receipts; already sent commands remain durable. No schema
or dependency change is required here.

Protocol/cache/component and browser tests cover exact replay, uncertainty,
committed withdrawal, late completion, keyboard containment and narrow reflow.
The executable simulated guide distinguishes historical acknowledgement from
current access and demonstrates independently loaded recipient note history.
Pinned Linux images require human review. Synthetic identity switching does not
certify live OIDC, PostgreSQL atomicity or actual resolver authority.

## Alternatives considered

- Release then claim for the recipient: rejected; creates an unowned race.
- Optimistically replace cached rows or reopen from the receipt: rejected;
  historical acknowledgement is not a current authorization observation.
- Retry all POST failures automatically or refresh ownership fences on replay:
  rejected; duplicates or changes the user's confirmed intent.
- Introduce an actor directory or cross-capability command framework: rejected;
  neither is required for this capability.
