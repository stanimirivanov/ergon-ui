# ADR 0014: Name follow-up web data access by capability and role

- Status: Accepted
- Date: 2026-10-01
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Rename the private follow-up web data-access package to
`@ergon/follow-up-data-access-web`. Its ownership, exports, and behavior remain
unchanged; checked-in consumers move together without a compatibility alias.

## Context

ADR 0011 assigns BFF protocol execution and RTK Query integration to the
`data-access` role. The follow-up project now lives at
`packages/follow-up/data-access-web`, but its
`@ergon/infrastructure-follow-up-web` import name still uses the superseded
global-layer taxonomy. The follow-up feature adopted a capability-and-role
identity in ADR 0013. An import name is a compile-time compatibility boundary
even for a private workspace package.

The workbench and follow-up feature are the only checked-in production
consumers. The package is not published as an independently supported npm
package, so these consumers and the workspace link can change atomically.

## Decision

Name this package `@ergon/follow-up-data-access-web`. Update its manifest,
Vitest project identity, every live source import and workspace dependency,
the pnpm lockfile, and current documentation in one change. Keep its directory,
public exports, Nx role and scope tags, and runtime behavior. Do not create an
alias for the old private import name.

Other legacy package identities remain valid until separately reviewed.
Historical ADRs retain the names used when their decisions were made.

## Consequences

Imports now distinguish the web data-access role from the feature role without
changing dependency direction, BFF requests, cache identity, CSRF lifetime,
browser routes, stored data, or deployment. An untracked external consumer of
the old private name must update its import; no supported external consumer is
known. A frozen install and the complete workspace and browser verification
gate check the in-repository consumers.

The follow-up model and session data-access package still have legacy import
names. Their names do not gain an alias or implicit migration through this
decision.

## Alternatives considered

Keeping the old name avoids an import change but obscures the role after the
path migration. Providing an alias would make a private obsolete identity
durable without a current consumer. Renaming every remaining legacy package
would combine unrelated compatibility boundaries in one pull request.
