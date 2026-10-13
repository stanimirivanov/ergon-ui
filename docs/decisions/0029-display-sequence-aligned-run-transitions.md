# ADR 0029: Display sequence-aligned run transitions

- Status: Proposed
- Date: 2026-10-13
- Milestone: M04 - Guarded Execution and Verification

## TL;DR

Display the current assigned Console's immutable transition prefix in append
order. Validate its state and receipt alignment at data access; preserve the
existing private disclosure gate and distinguish missing history from empty.

## Context

Ergon's current runtime supports one capability result and one terminal
decision per attempt. Its new assigned-only response exposes only sequence,
type, source/destination states and occurrence/recording instants. A prefix
through the returned state revision excludes later concurrent appends.
See core's [read-model decision](https://github.com/stanimirivanov/rag-help-center/blob/main/docs/decisions/0047-expose-sequence-aligned-assigned-run-transitions.md).

## Decision

- Keep the contract and decoder in run-supervision data access and rendering
  in its web feature. No package, application core, cache key or runtime owner
  is needed for this server-authoritative metadata.
- Missing `transitions` means an older server supplies no history projection.
  An empty array means a supported revision-zero prefix. Null, unknown event
  types, gaps, duplicates, unsupported lengths and broken state chains are
  invalid responses, not automatically retried or partially cached.
- Validate the entire prefix against initial approval requirements, current
  state/revision/update instant, and first-event receipt outcome/completion.
  Compare UTC instants without losing fractional precision; normalize only
  equivalent trailing-zero padding. Never sort by timestamps or infer latency.
- A dedicated stateless section renders sequence, event meaning, state change
  and both observed times from the currently disclosed RTK projection. It owns
  no requests, timers, copied resources or mutation controls. Existing gates
  withdraw it with the receipt, policy and outcome context before recheck I/O.
- A recorded proof-acceptance transition reports a runtime decision, not an
  inspected proof payload. Keep the outcome pane's explicit proof limitation.

## Consequences

Supervisors can see real result projection and terminal decisions without a
fabricated six-stage waterfall. Independent server/browser rollout remains
possible, with unknown support visible. Current history has at most two events;
multi-step execution, spans, costs and proof inspection need separate contracts.

Tests cover precise alignment, backwards clocks, all current terminal paths,
compatibility, private withdrawal/recovery and narrow accessible layout. The
updated guide shows controlled revision-zero, projected and terminal fixtures;
it is not live runtime, proof-acceptance or OIDC verification. No migration or
dependency change; rollback removes this presentation as a unit.

## Alternatives considered

- Rendering current state as invented stages conflates a snapshot with history.
- Timestamp sorting loses append meaning under clock correction.
- UI-owned validation or copied history creates competing owners; decoding
  belongs before serializable RTK caching.
- Mandatory history blocks independent rollout; missing must remain distinct
  from explicit empty or malformed values.
