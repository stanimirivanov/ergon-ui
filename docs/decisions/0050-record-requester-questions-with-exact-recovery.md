# ADR 0050: Record requester questions with exact recovery

- Status: Accepted
- Date: 2026-10-26
- Milestone: M05 - Adaptive Resolution Experience

## TL;DR

Confirm exact question intent, commit history/form withdrawal before POST, and
recover uncertainty only by explicit original-intent replay. Historical
acknowledgement never authorizes history, delivery, a response or proof.

## Context

M05-PR20a supplies current-owner history. The merged backend records questions
under current authority and exact active claim/revision on an OPEN explicitly
requester-bound case. Creation returns 201; exact authorized recovery returns
the original 200 receipt. Replays still require current access. Conflicting or
unavailable ownership cannot be recovered from receipt possession.

## Decision

- Keep existing capability owners and project edges. Model owns exact Unicode
  constraints. Data access shares a receipt schema between reads and writes,
  normalizes safe failures and joins the existing session CSRF adapter.
- POST only requestId, claimId, expectedOwnershipRevision and exact question.
  Validate echoed request/case/claim/revision/text and attribution shape. No
  automatic POST retry, optimistic history insertion or caller recipient/time.
- RHF owns text, acknowledgement and errors. A mounted feature controller owns
  intent/phases; committed pending state withholds history/form before effect
  I/O. StrictMode and duplicate activation cannot issue another POST. Form
  retirement also fences asynchronous RHF validation callbacks before dispatch.
- Uncertainty permits explicit exact replay only. A definite invalid-request
  response may return text to RHF with acknowledgement cleared; correction is
  new deliberate intent. Identity/access denial or claim/intent conflict
  withdraws enclosing private case context.
- Receipt feedback retains only a historical request identity. Independently
  refresh history before showing it or another form. Failed reads withhold
  retained history even after acknowledgement. ADR 0049 remains unchanged.
- Closing/rechecking discards drafts; closing/replacement also retires replay
  and pending callbacks. Abort/reset owns only the client mutation, never
  server rollback. No draft, intent or payload enters persistent storage/URLs.

## Consequences

Recording means attributable intent, not delivery, consent, evidence, case
completion or a run transition. Backend checks every POST, including replay.
Deploy PR19a/b/c before this UI; rollback removes recording controls without
deleting immutable data. Responses and notifications remain separate slices.
Protocol/cache, commit-ordering, retirement, browser and pinned-Linux tests plus
the simulated guide verify their boundaries, not live OIDC or SQL atomicity.

## Alternatives considered

- Reuse internal-note commands: rejected; audience and disclosure differ.
- Automatic retries/replacement UUIDs: rejected; they obscure durable intent.
- Treat receipts as current history/access: rejected; acknowledgement is not authority.
- Generic command framework or interface-only core: rejected; existing owners
  already execute this cohesive cache-centric behavior.
