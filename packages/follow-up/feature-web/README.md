# Follow-up web feature

## Purpose

Own the workbench's human-follow-up React behavior, keeping capability behavior
out of the deployable app and domain-agnostic UI primitives.

## Owns

- Shared-inbox queue filtering, pagination, revision-checked claim interaction,
  explicit same-command retry, and presentation.
- Resolver-owned pagination and lazy case-context disclosure, including a fresh
  ownership check on reopening and hiding prior evidence during revalidation.
- Evidence-first, responsive read-only case inspection: source observations and
  their provenance precede the failed automation handoff and pinned case
  contract. The view introduces no client-side authority or resolution claim.
- Confirmed owned-claim release, explicit same-tuple retry after uncertainty,
  closing case disclosure before release submission, and retiring success
  feedback when a later server-observed ownership revision supersedes it.
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
