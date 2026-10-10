# ADR 0024: Contain client defects at cache boundaries

- Status: Accepted
- Date: 2026-10-10
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Contain client and dependency-binding defects at every session, follow-up, and
run-supervision RTK Query execution boundary. Cache only a diagnostic-free
`unexpected-defect` outcome; do not confuse it with an invalid server response,
cancellation, or proof that a mutation did not execute.

## Context

The clients return typed protocol failures and reject unexpected implementation
defects. Previously their cache adapters allowed those rejections, including
missing thunk-extra dependencies, to reach RTK's unhandled-error logging and
exception serialization. Raw causes can contain private diagnostic details.
Feature fallback mapping also called unknown framework errors invalid responses,
and some status-bearing failures accepted a fabricated zero status.

The approved Console remediation requires failure containment without changing
BFF routes, authorization, cache identities, or the existing direct-client
contract. Claim and release callbacks may fail after the server records a write;
catching an exception cannot establish that the command was never received.

## Decision

- Keep direct clients' distinction between typed expected failures and rejected
  defects. Put the cause-free catch around binding lookup, invocation, and result
  projection in each cache integration, before RTK sees a rejection.
- Add `unexpected-defect` to the capability-owned frontend failure contracts.
  Return only its discriminant; omit raw name, message, stack, body, and cause.
  Do not add a telemetry service or log the discarded cause through another path.
- Copy only recognized failure fields at the cache and presentation boundaries.
  Unknown kinds and invalid required HTTP statuses become unexpected defects.
  Status-bearing failures require an integer from 100 through 599; omitted
  status never becomes a made-up zero.
- Normalize framework errors once per feature boundary. Recognize RTK's exact
  cancellation fingerprint explicitly; do not relabel a caught defect because
  an abort signal happened to fire concurrently. Genuine client cancellation
  remains a typed outcome. RTK's own abort can win its result race and cancel
  the consumer, but later client rejections must still be contained.
- Preserve bounded retries only for existing classified transient reads. Defects
  are not automatically retried. Console read recovery is an explicit fresh
  gated read, with operator guidance if the defect persists. Session defects
  keep the workspace closed and direct the user to an operator. Malformed
  responses, identity, absence, and transient states retain distinct recovery.
- A mutation defect means the result is uncertain. Its explicit recovery keeps
  the original claim command ID and expected revision, or exact release claim
  and revision, under ADRs 0020 and 0021. Never start another intent automatically.
- Session revalidation outranks retained actor data: pending or failed checks
  keep authenticated content unmounted. Assignment invalid-page recovery resets
  local traversal and performs a fresh first-page read; copy and action agree.

## Consequences

No HTTP, persistence, deployment, or authority contract changes. Frontend unions
gain a variant, so all affected exhaustive consumers change together. The shared
cache and session seams require small legacy-consumer updates, not their redesign.
Failures lose diagnostic context deliberately; investigation needs an operator
and existing safe server evidence rather than browser cause export.

Tests must prove sentinel exclusion from cache, actions, and automatic logs,
expected failure preservation, cancellation/late-defect cleanup, fail-closed
session rechecks, first-page reset, and exact mutation replay. Synthetic guides
explain safe recovery but do not establish real backend execution or authority.

## Alternatives considered

- Let RTK serialize defects: violates the browser disclosure policy.
- Turn every rejection into transport, invalid-response, or cancellation:
  misrepresents cause and can select the wrong retry or recovery action.
- Catch only in components: logging and cache serialization have already happened.
- Make clients swallow every defect: conceals programming faults from direct
  callers and still leaves dependency-binding failures outside containment.
- Build a generic cross-capability error service: adds a shared dependency and
  policy coupling without a current need; capability-local boundaries suffice.
