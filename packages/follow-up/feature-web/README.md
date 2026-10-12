# Follow-up web feature

## TL;DR

Keep follow-up interaction and protected read-only panes capability-local.
The app-supplied `WorkspaceRenderer` owns shell chrome and available space;
RTK Query owns resources, and the feature workflow owns selection and replay.

## Purpose

Own the workbench's human-follow-up React behavior, keeping capability behavior
out of the deployable app and domain-agnostic UI primitives.

## Owns

- Shared-inbox queue filtering, pagination, revision-checked claim interaction,
  explicit same-command retry, and presentation.
- Resolver-owned pagination and local selection of an exact owned claim. A
  cohesive workflow controller retains only claim/work-item/case/run/revision
  identity and derives its row from the current authorized cache response. Its
  committed recheck/release phases withdraw the private DOM before starting I/O,
  without synchronous render forcing. Late completions retire on close, phase
  replacement, tenant change, or unmount. A selected case opens a full-width
  Resolver Console on the same tenant route;
  it is not a shareable case address. The feature hides private context while
  ownership is rechecked and unmounts it when the claim changes or disappears.
  The Console offers a deliberate claim recheck: it hides case evidence during
  the owned-work read and requests fresh owner-scoped context only if the exact
  claim remains visible. This is not a lease renewal.
- Capability-local toolbar/presence and responsive, read-only, three-pane case inspection: recorded observations
  and provenance through a locally selected source-observation inspector, the
  failed automation handoff and ordered durable attempts with native disclosure
  of recorded transitions, connector results, and retry linkage, and the pinned
  but unassessed outcome condition. A recorded execution-policy card groups the
  capability, effective risk, approval requirement, and policy revision from
  the escalated run; it is not a current approval decision or action. The
  inspector keeps untrusted source content inert, labels whether it was
  available at the run's pinned snapshot, and
  locally filters observations by that temporal boundary without another read.
  The inspector composes separately owned timing controls, source list, detail
  and comparison content, with one provenance renderer for both presentations.
  Only exact selection and comparison-pair identities are retained; removed
  identities retire permanently rather than silently reopening when records
  return. The consumed ui-web modal owns platform show/close, initial title focus,
  keyboard containment, Escape/visible dismissal and viewport placement.
  Explicit dismissal restores the live Compare sources control synchronously;
  filter changes or access withdrawal retire the modal without queued focus work.
  A modal inspector compares two currently visible source records and their
  provenance without claiming that either is verified or contradictory.
  Local section jumps focus evidence, attempts, or outcome without a URL
  fragment; evidence precedes execution and proof when panes stack.
  Named leading/primary/trailing slots delegate evidence, execution, and outcome
  to cohesive feature panes. Pending or failed private reads and owned-claim
  rechecks preserve the three-pane allocation with withheld-state sections,
  without retaining case goals, claim presence, source content or policy facts.
  The view introduces no verified-claim graph, client-side authority, live
  trace, lease, approval, or resolution claim.
- One confirmed exact-claim release flow shared by active-work cards and the
  selected Console. It closes private Console context before the POST, supports
  explicit same-tuple retry after uncertainty, and retires success feedback
  when a later server-observed ownership revision supersedes it. Release means
  return to the original shared queue, not direct handover or case completion.
- Follow-up workspace introduction and composition of the two work views.
  The owned surface supplies derived Console mode and content through an
  optional `renderWorkspace` slot instead of mirroring visibility. The inbox
  remains mounted but suspended during detours, retaining traversal and exact
  uncertain command intent without rendering rows or holding a subscription.
  `HumanFollowUpWorkspace` forwards mode, status, capability toolbar and one
  stable content subtree through its required app-supplied `WorkspaceRenderer`.
  The app owns branding, navigation, initial Console heading focus, dark scope,
  and viewport allocation; this feature has no chrome selector or assumed
  header-height subtraction. Its toolbar remains in document flow when claim
  information or release confirmation wraps.
  Explicit claim recheck and Console read recovery move focus to the stable Back
  control before retiring their controls; failed ownership rechecks retain the
  existing failure-heading focus. Successful recovery does not lose focus when
  the withheld body is replaced by fresh context.
  No response callback schedules focus work or replays an action.
- Translation of data-access-normalized follow-up failures into resolver-facing
  copy. Unexpected read defects hide retained case context and offer only an
  explicit retry; they are not reported as malformed server responses. Claim
  and release defects preserve uncertainty and the original immutable replay
  tuple rather than assuming no write occurred or minting a replacement intent.
- Accessible follow-up-specific interaction and rendering.

## Does not own

- Follow-up models or executable application policy.
- BFF protocol decoding, HTTP execution, CSRF state, or RTK Query cache policy.
- Session verification, sign-in URL construction, route hierarchy, or Redux
  store composition.
- Domain-agnostic web primitives.
- App branding, global navigation, shell chrome, or viewport-height policy.

## Public API and dependencies

Consumers import `HumanFollowUpWorkspace`, `HumanFollowUpInbox`, and
`ResolverOwnedHumanFollowUps` from
`@ergon/follow-up-feature-web`. The workbench supplies tenant request
context and a trusted same-origin sign-in URL after its session boundary has
been composed. This `type:feature` project consumes generated cache hooks from
`@ergon/follow-up-data-access-web` and presentation primitives from
`@ergon/ui-web`. The workbench supplies the session-owned verified-actor
display as an opaque slot; this feature never inspects session identity.
The compact Console slot appears only after a case is selected and the current
owned-work read permits the Console to mount. It is display-only: claim
ownership and case disclosure continue to depend on BFF reads.
The app supplies a `WorkspaceRenderer` that preserves the content position while
changing between standard and focused mode. The feature supplies current
capability controls as an opaque toolbar; it never calls a shell-mode setter.

## Verification

```powershell
pnpm nx lint @ergon/follow-up-feature-web
pnpm nx typecheck @ergon/follow-up-feature-web
pnpm nx test @ergon/follow-up-feature-web
```
