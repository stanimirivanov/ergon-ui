# Follow-up web feature

## Purpose

Own the workbench's human-follow-up React behavior, keeping capability behavior
out of the deployable app and domain-agnostic UI primitives.

## Owns

- Shared-inbox queue filtering, pagination, revision-checked claim interaction,
  explicit same-command retry, and presentation.
- Resolver-owned pagination and local selection of an exact owned claim. A
  selected case opens a full-width Resolver Console on the same tenant route;
  it is not a shareable case address. The feature hides private context while
  ownership is rechecked and unmounts it when the claim changes or disappears.
- Responsive, read-only, three-pane case inspection: recorded observations
  and provenance through a locally selected source-observation inspector, the
  failed automation handoff and ordered durable attempts with native disclosure
  of recorded transitions, connector results, and retry linkage, and the pinned
  but unassessed outcome condition. The inspector keeps untrusted source content
  inert, labels whether it was available at the run's pinned snapshot, and
  locally filters observations by that temporal boundary without another read.
  Evidence precedes execution and proof in the reading order when panes stack.
  The view introduces no verified-claim graph, client-side authority, live
  trace, lease, approval, or resolution claim.
- One confirmed exact-claim release flow shared by active-work cards and the
  selected Console. It closes private Console context before the POST, supports
  explicit same-tuple retry after uncertainty, and retires success feedback
  when a later server-observed ownership revision supersedes it. Release means
  return to the original shared queue, not direct handover or case completion.
- Follow-up workspace introduction and composition of the two work views.
- Translation of typed follow-up failures into resolver-facing copy.
- Accessible follow-up-specific interaction and rendering.

## Does not own

- Follow-up models or executable application policy.
- BFF protocol decoding, HTTP execution, CSRF state, or RTK Query cache policy.
- Session verification, sign-in URL construction, route hierarchy, or Redux
  store composition.
- Domain-agnostic web primitives.

## Public API and dependencies

Consumers import `HumanFollowUpWorkspace`, `HumanFollowUpInbox`, and
`ResolverOwnedHumanFollowUps` from
`@ergon/follow-up-feature-web`. The workbench supplies tenant request
context and a trusted same-origin sign-in URL after its session boundary has
been composed. This `type:feature` project consumes generated cache hooks from
`@ergon/follow-up-data-access-web` and presentation primitives from
`@ergon/ui-web`. The workbench supplies the session-owned verified-actor
display as an opaque slot; this feature never inspects session identity.

## Verification

```powershell
pnpm nx lint @ergon/follow-up-feature-web
pnpm nx typecheck @ergon/follow-up-feature-web
pnpm nx test @ergon/follow-up-feature-web
```
