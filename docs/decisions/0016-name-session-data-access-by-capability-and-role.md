# ADR 0016: Name session web data access by capability and role

- Status: Accepted
- Date: 2026-10-01
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Rename the private session web data-access package to
`@ergon/session-data-access-web`. Checked-in consumers move together; its
exports, trust boundary, and behavior remain unchanged.

## Context

ADR 0011 assigns BFF protocol execution and RTK Query integration to the
`data-access` role. The session project lives at
`packages/session/data-access-web` with that Nx role, but its
`@ergon/infrastructure-session-web` import name retains the superseded
global-layer taxonomy. Follow-up packages and the session feature already
use capability-and-role names. Private package imports are still compile-time
compatibility boundaries.

The workbench and session feature are the checked-in production consumers.
The package is not published as an independently supported npm package, so
their imports and workspace links can change atomically.

## Decision

Name the package `@ergon/session-data-access-web`. Update its manifest,
Vitest project identity, every live source import and workspace dependency,
the pnpm lockfile, and current documentation in one change. Keep its
directory, public exports, Nx tags, and runtime behavior. Do not provide an
alias for the old private import name.

The session model retains its current identity until a separate reviewable
change. Historical ADRs retain the names used for their original decisions.

## Consequences

Imports identify the session web data-access role without changing dependency
direction, same-origin BFF requests, timeout and cancellation policy,
authentication disclosure, tenant-keyed cache identity, browser routes,
stored data, or deployment. An untracked external consumer of the old private
name must update its import; no supported external consumer is known. A frozen
install and the full workspace and browser verification gate check the
checked-in consumers.

## Alternatives considered

Keeping the old name avoids an import change but obscures the role after the
path migration. Providing an alias would preserve an obsolete private
identity without a current consumer. Renaming the session model in the same
change would combine distinct compatibility boundaries and broaden review.
