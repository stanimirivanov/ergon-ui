# ADR 0043: Inspect exact pinned contract declarations

- Status: Accepted
- Date: 2026-10-21
- Milestone: M02 - Evidence and contracts

## TL;DR

Inspect only the selected run's exact immutable normalized contract through fresh
protected access. Declarations are not readiness, effective policy, execution or proof.

## Context

Merged Ergon PR #180/backend ADR 0061 exposes normalized v1alpha1 contract meaning
to current supervisors with current tenant-wide resolver authority, including
terminal attempts. The Console previously showed only the compact pin and
effective safeguards. The user's standing authorization/disclosure approval
covers this dependent read-only UI; it introduces no new backend authority.

## Decision

- Existing supervision data access owns the typed client, bounded Effect GET,
  exact decoding, safe failures and private RTK resource. Feature owns opening
  intent and complete declaration presentation. App and ui-web retain shell,
  pane allocation, modality and focus. No new package, dependency edge, application
  core, Redux slice, persistent state or second remote cache is introduced.
- Read explicitly beneath fresh parent Console access, keyed by tenant/run/epoch
  and expected contract key/revision/step/capability. Expectations remain local,
  not sent as authority. Closing retires this subscription; reopening waits for
  older pending exact-key work before a distinct protected read. Commands use
  existing RunDetail invalidation. No control lease, CSRF or polling is added.
- Validate exact attribution, schema, safe coordinates, bounded identifiers and
  exact equality values, unique 1–50 ordered evidence/step declarations,
  applicability membership and the high-risk approval invariant. Strip unused
  fields and reject the entire inconsistent response. Do not require declared
  safeguards to equal effective policy or impose UTC causality.
- Present normalized meaning, never reconstructed original YAML. Preserve
  declaration order, exact case-sensitive equality and inert text. Mark only the
  pinned step and contrast declared risk/approval with effective run safeguards.
  Other declarations are not scheduled/performed work or a DAG. Applicability
  is not fresh readiness or historical selection reasoning; outcome condition
  is not assessment/accepted proof. Inspection does not certify reference
  registration or tenant connector availability.
- Pending rechecks hide prior definitions. Protected access failure, malformed
  data or unavailable observation uses the existing inspection barrier before
  paint to retire earlier workspace/modal/discovery and focus the persistent
  execution heading. Recovery reacquires parent gates before new inspection.
  Retired results cannot call the barrier or resurrect content.
- Unknown missing-route/method responses mean unsupported, not empty definitions
  or neutral private absence. Unsupported stays local under independently
  successful parent access; there is no latest-revision or internal fallback.
  Unexpected defects are contained before RTK serialization or logging.
- Existing modal owns keyboard containment, Escape, explicit return focus and
  long/narrow allocation. Parent withdrawal unmounts it. No raw HTML, private
  response diagnostics, source reconstruction or command controls are introduced.

## Consequences

Supervisors can read the exact declarations behind a run while understanding
stronger runtime policy and the limits of a one-step runtime. Access remains an
observation, not continuous or atomic with all parent reads. Contract recording
time can follow authorization observation under clock correction.

Deploy backend PR #180 first; no migration, dependency or flag changes. UI
rollback removes presentation without affecting durable contracts or commands.
Protocol/cache/feature and Chromium tests plus a substantial twenty-second
simulated chapter cover meaning, privacy, focus, retirement and reflow. Synthetic
fixtures do not certify production identity, database or provider safety.
Catalog/edit/publish, original authoring source, new readiness decisions,
multi-step execution and new authorization remain excluded.

## Alternatives considered

- Reconstruct YAML or load the latest catalog revision: rejected; original
  authoring text is absent and the run pins one exact immutable revision.
- Show every declaration as executed DAG work: rejected; declaration order
  supplies no causal/runtime execution evidence.
- Equate declared and effective safeguards: rejected; runtime policy may
  strengthen them.
- Preload/cache forever or build a new application core/modal: rejected;
  existing consumed boundaries provide the required behavior and lifetime.
