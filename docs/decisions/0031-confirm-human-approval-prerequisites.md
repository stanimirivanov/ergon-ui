# ADR 0031: Confirm human approval prerequisites in the Resolver Console

- Status: Proposed
- Date: 2026-10-14
- Milestone: M03 - Human authority and policy

## TL;DR

Use the current gated Console projection for approval lifecycle and exact
eligibility. Confirm decisions through session/CSRF commands with immutable
replay intent; never infer a grant, runtime continuation or outcome proof.

## Context

The assigned Console displays pinned policy but lacked current request and
decision facts. Ergon's [approval decision](https://github.com/stanimirivanov/rag-help-center/blob/main/docs/decisions/0049-confirm-supervisor-scoped-approval-decisions.md)
requires current supervision plus exact matching authority for first application,
and supports private historical replay. Handover already uses a committed private
disclosure barrier and invocation-local CSRF. Both mechanisms are current consumers,
not reasons to create an interface-only application core.

## Decision

- Decode optional `approvalReview` within the existing RTK-owned Console resource.
  Omission means older-server unsupported; distinguish not-required, no-request,
  pending, expired and decided states. Verify pinned authority, request interval,
  decision validity and canDecide/state/revision consistency. Strip private extras.
  Server observation is not a browser countdown or continuing authority.
- A dedicated feature card presents current request and historical outcome,
  separately from recorded capability policy. Only current decoded eligibility
  enables approve/reject. REQUESTER scope is exact case evidence; resolver authority
  is no substitute. Neither response means grant, execution, resumption or proof.
- Use the reviewed ui-web modal and React Hook Form acknowledgement. Local form
  validation and cancellation send nothing. Retire asynchronous form callbacks
  on access withdrawal; no form, private selection or token enters storage/URL.
- Capture one exact command/request/outcome/expected-supervision tuple. Commit
  blocked disclosure for discovery, detail and recipient controls before I/O;
  focus the persistent execution heading after modal teardown. Use a consumed
  feature-local command controller for approval and handover to preserve the same
  StrictMode, late-callback and lifecycle guarantees without duplicated plumbing.
- A consumed data-access HTTP executor owns controller lifetime through body,
  deadline and typed transport handling for the two command clients. Protocol
  decoders and failure mapping remain capability-specific. Approval obtains
  fresh invocation-local CSRF and performs one bounded attempt, never automatic
  mutation retry. Shared read retry remains explicitly opt-in and classified.
- RTK contains defects before logging/serialization. Closed failure recovery
  distinguishes revalidation, sign-in, leave and exact replay. Lost, malformed,
  cancelled, timed-out or defective responses retain uncertain exact intent;
  definite conflicts require current facts before a different confirmation.
- Success is historical feedback, not a second current decision/ownership cache.
  Reset private selection/traversal and recheck assigned work; reopening requires
  fresh detail. The mutation invalidates other discovery/detail/recipient readers.
  Navigation may lose local intent without undoing a server commit.

## Consequences

One end-to-end M03 capability uses existing capability-first project boundaries:
data access owns protocol/Effect/cache, feature owns interaction/presentation,
ui-web owns DOM modality and app owns shell/composition. No dependency, project,
application core, cache layer or URL contract is introduced. Existing handover
behavior must pass unchanged after consuming shared mechanics.

Deploy Ergon's additive schema/upgraded backend before enabling its default-off
approval flag. Older UI consumers ignore added fields; newer UI consumers keep
inspection but show unsupported review on an older backend. Request creation,
requester-facing UI, authority provisioning, withdrawal, grants, runtime steering
and leases remain outside this slice.

Protocol/cache/component checks verify exact receipt attribution, malformed
lifecycle denial, timeout/body cancellation, defects, explicit confirmation,
private hiding, StrictMode and retired callbacks. Chromium and the ninth guide
chapter verify current/expired/unsupported states, stale and uncertain recovery,
approval/rejection, keyboard/inert modal behavior and 320-pixel reflow. All guide
responses are marked synthetic; they do not verify real IdP or database browser
deployment. Other browser engines remain unverified.

## Alternatives considered

- Copy review into local state or add a separate query/cache: unnecessary when
  it belongs to the exact protected Console snapshot and disclosure lifetime.
- Automatically retry or change outcome/epoch after an unavailable response:
  risks unintended new intent and mistakes uncertainty for a failed write.
- Render an Authorize/Execute button or infer requester authority from resolver
  presence: bypasses independent deterministic gates and the approved scope.
- Repeat controller/Effect mutation plumbing for approval: current consumers
  demonstrate shared mechanics; policy and protocol differences stay explicit.
- Add mandatory hexagonal layers or a local lease timer: no client-owned pure
  application policy or fenced runtime lease justifies those abstractions.
