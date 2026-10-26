# ADR 0052: Gate requester history with case progress

- Status: Accepted
- Date: 2026-10-26
- Milestone: M05 - Adaptive Resolution Experience

## TL;DR

Read narrow questions/answers within the requester canvas. Progress and history
remain separate RTK resources; both fresh reads must succeed before disclosure.
No requester mutation is added.

## Context

Ergon PR #216 supplies requester-owned history, including closed cases, without
resolver attribution. M05-PR22b must not reuse the resolver audience's DTOs.
ADR 0048's progress canvas now needs a second authorized projection.

## Decision

Existing requester data access owns `readQuestions`, its RTK endpoint and strict
decoding, reusing the current bounded timeout/retry/cancellation policy. Validate
Unicode text, UTC instants, unique question/answer IDs and descending latest-100
recording-time/UUID order. Strip private/unknown fields, preserve exact text and
precision, and distinguish omitted answer coverage from explicit null.

The fresh hook acquires progress then history, waiting out older same-key pending
reads before each forced check. Progress failure prevents history acquisition.
Both must succeed before mounting private facts. Recheck commits withdrawal
before I/O. Cleanup releases only owned subscriptions; zero-grace last-reader
eviction owns cancellation. These are separate snapshots, not an atomic read.

A dedicated feature section renders inert history before explanatory cards.
Server-command and database timestamps are not delivery/read times or reliable
cross-clock ordering. Answers are not consent, evidence, permission or proof.
Closed owned cases retain read history. No form or placeholder action is added.

## Consequences

BEHAVIOR-ADJACENT: history failure now withholds progress too. Deploy the history
endpoint first; older answer omission is supported. Injected `ProgressClient`
implementations must supply `readQuestions`. App composition, sign-in routes,
store lifetime and dependency edges remain unchanged. No migration is needed.

Protocol/cache/component/browser tests and guide checkpoints cover private
withdrawal, retirement, bounds, closure and narrow keyboard use. Simulations do
not certify live IdP, PostgreSQL or two-origin deployment. PR22c owns submission
and uncertain recovery. UI rollback preserves immutable backend history.

## Alternatives considered

- Resolver DTOs/imports: rejected because audience and disclosure differ.
- Retain progress after history failure: rejected to avoid stale private canvas content after a fresh failure.
- Feature-owned copies or another framework/package: rejected; existing RTK and requester owners suffice.
