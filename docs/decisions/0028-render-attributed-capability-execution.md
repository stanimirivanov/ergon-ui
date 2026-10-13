# ADR 0028: Render attributed capability execution

- Status: Proposed
- Date: 2026-10-13
- Milestone: M04 - Guarded Execution and Verification

## TL;DR

Consume the additive assigned-only execution receipt, preserving exact timing
and compatibility absence. Display one recorded gateway call, never an inferred
live trace, state transition, outcome proof or billing estimate.

## Context

Ergon core's measured-execution slice is merged and adds optional `execution`
to the existing assigned Console GET. Its runtime receipt belongs to the pinned
step/capability and may be recorded before state projection. Historical and
older-writer receipts have no timing. Older servers omit the projection.
See core's [timing decision](https://github.com/stanimirivanov/rag-help-center/blob/main/docs/decisions/0046-record-runtime-capability-invocation-timing.md).

The browser already has private fresh-read gates, one RTK cache and cohesive
execution/outcome panes. No client-owned execution policy is needed.

## Decision

- Extend run-supervision data access's consumed Console contract, not discovery
  or follow-up contracts. Preserve omitted execution as unsupported/unknown,
  null as no recorded terminal receipt, null timing as an unmeasured result,
  and measured zero as a valid sample. No receipt is not proof of no effect.
- Decode result fields, UTC observations, exact step/capability attribution,
  known measurement source and canonical non-negative decimal nanoseconds up to
  signed 64-bit maximum. Reject malformed/misattributed results as invalid
  responses without retry. Strip unconsumed fields before caching.
- Keep nanoseconds as serializable strings in RTK. Convert to milliseconds by
  exact decimal placement in feature presentation, never Number coercion or
  subtraction of wall-clock timestamps. A start observation later than completion
  is allowed after clock correction; units do not promise clock resolution.
- A dedicated feature section renders result, connector, completion/recording
  observations, latency and unavailable cost. A native keyboard disclosure
  shows measurement provenance. It has no request, timer or resource state.
- Preserve ADRs 0023–0026: existing exact gate, cache identity, zero-grace
  retirement, hide-before-I/O, neutral absence, terminal reads, app-owned shell
  and named panes. Result presence cannot update the displayed run state or
  establish proof. No dependency edge, package or application core is added.

## Consequences

Assigned supervisors can inspect genuinely attributed backend measurements.
Old-server rollout remains readable without falsely claiming absent receipts.
The UI remains read only and snapshot-based; explicit rechecks hide the entire
receipt and measurement until a fresh gate succeeds. A crash before durable
receipt recording and provider idempotent-result retrieval limit what a sample
describes; it is the winning caller's gateway call, not total operation latency.

Regression tests prove protocol rejection, exact large integers, serializable
cache state, inert strings, fresh withdrawal/recovery, keyboard disclosure and
narrow/zoom-equivalent reflow. The executable guide switches marked synthetic
responses to demonstrate compatibility states; production receipts remain
immutable. These checks do not establish live OIDC/backend integration,
provider measurement accuracy, actual browser zoom or non-Chromium behavior.
Rollout requires no UI migration; rollback removes presentation as a unit while
leaving the additive backend record intact.

## Alternatives considered

- Numeric nanoseconds or UTC subtraction lose precision or conflate waiting
  with measured execution. Neither supplies trustworthy latency.
- Treating missing/null/unmeasured as zero erases compatibility and durability
  meaning. A mandatory field would block independent browser/backend rollout.
- A model/application package or separate cache has no independent executable
  policy in this slice. Existing data-access and feature owners are sufficient.
- Synthetic spans, inferred state advancement or cost would resemble the target
  mock while misrepresenting unavailable runtime facts. Multi-step execution,
  live spans and real cost attribution require separate reviewed capabilities.
