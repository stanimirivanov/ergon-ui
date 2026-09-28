# Follow-up React adapter

## Purpose

Provide the web workbench's inbound React adapter for human follow-up without
placing capability behavior in a deployable application or in domain-agnostic
UI primitives.

## Owns

- Shared-inbox queue filtering, pagination, claim interaction, and presentation.
- Resolver-owned pagination and lazy case-context disclosure.
- Translation of typed follow-up failures into resolver-facing copy.
- Accessible follow-up-specific interaction and rendering.

## Does not own

- Follow-up domain models, application ports, or policy.
- BFF protocol decoding, HTTP execution, CSRF state, or RTK Query cache policy.
- Session verification, sign-in URL construction, route hierarchy, or Redux
  store composition.
- Domain-agnostic web primitives.

## Public API and dependencies

Consumers import `HumanFollowUpInbox` and `ResolverOwnedHumanFollowUps` from
`@ergon/infrastructure-follow-up-react`. The workbench supplies tenant request
context and a trusted same-origin sign-in URL after its session boundary has
been composed. The adapter consumes generated cache hooks from
`@ergon/infrastructure-follow-up-web` and presentation primitives from
`@ergon/ui-web`.

## Verification

```powershell
pnpm nx lint @ergon/infrastructure-follow-up-react
pnpm nx typecheck @ergon/infrastructure-follow-up-react
pnpm nx test @ergon/infrastructure-follow-up-react
```
