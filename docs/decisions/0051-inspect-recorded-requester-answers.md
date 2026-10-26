# ADR 0051: Inspect recorded requester answers

- Status: Accepted
- Date: 2026-10-26
- Milestone: M05 - Adaptive Resolution Experience

## TL;DR

Extend existing owner-scoped question history with narrow recorded answers,
without changing command receipts or disclosure lifetimes. Omission is unsupported
coverage; null is no answer in this snapshot. Neither is evidence of delivery.

## Context

Merged Ergon PR #216 adds a nullable response to protected question histories.
M05-PR22 spans resolver inspection, requester history and requester answer commands;
these need independently reviewable deliveries before adding submission/recovery.

## Decision

The model owns a history-only question extension and exact recorded-answer values.
Data access owns optional/null/object decoding, Unicode constraints, valid UTC
calendar instants and unique response identities within the bounded question page.
Nested unknown fields are stripped; malformed supplied responses reject the whole
observation. Preserve original text and fractional precision without asserting
clock order between question, command and database instants. Answers never reorder
questions or change truncation. Question POST receipts remain separate and unchanged.

Feature owns inert answer presentation below the existing fresh private history
gate. RTK Query remains the resource owner; pending/failed observations outrank
retained answers. Parent ownership/case barriers, ui-web modality/focus and app
shell composition remain unchanged. No project, dependency edge, endpoint, cache,
polling or client application core is introduced.

Omitted response means an older server supplied no answer coverage. Explicit null
means no answer in that read snapshot, not permanent absence or non-delivery.
An object carries only responseId, answer, respondedAt and recordedAt. Render it
as untrusted text, not consent, accepted evidence, execution authority or proof.

## Consequences

PR22a delivers resolver answer inspection, simulated guide and reviewed pixels.
[The delivery plan](../development/plans/m05-requester-responses.md) keeps requester
history and answer submission/recovery separate; no placeholder controls appear.
Deploy backend PR #216 before expecting answer coverage. Older servers remain
usable with explicit unsupported messaging; application rollback does not mutate
stored questions or answers. No backend or browser-storage migration is needed.

Protocol/component/browser tests cover all three states, malformed/private data,
exact text/instants, withdrawal, focus and narrow reflow. Simulated guide/pixels
do not prove live identity, database authorization, delivery or proof acceptance.

## Alternatives considered

- Treat omission as null: rejected because unsupported coverage is not an unanswered question.
- Extend command receipts: rejected because history snapshots and immutable acknowledgements evolve differently.
- Add a shared cross-capability answer package: rejected; requester ownership can be implemented within its existing capability when consumed.
- Combine requester reads, submission and recovery now: rejected to preserve complete, reviewable slices without omitting tests.
