# ADR 0013: Name the follow-up feature by capability and role

- Status: Accepted
- Date: 2026-10-01
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Rename the private follow-up React package to `@ergon/follow-up-feature-web`.
Its path, exports, and behavior stay unchanged; all checked-in consumers move
atomically, without a compatibility alias.

## Context

ADR 0011 assigned React orchestration and presentation to the `feature` role.
The follow-up project now lives at `packages/follow-up/feature-web`, but its
old `@ergon/infrastructure-follow-up-react` import name still suggests that
presentation is infrastructure. The session feature already uses a
capability-and-role name. Package imports are a compile-time compatibility
boundary even when the package is private to the workspace.

The package has one checked-in production consumer, the workbench. It is not
published as an independently supported npm package. The repository can
therefore change that import and its workspace link in one verified change.

## Decision

Name the follow-up feature package `@ergon/follow-up-feature-web`. Update its
manifest and Vitest project identity, every current source import and package
dependency, the pnpm lockfile, and current documentation together. Keep the
existing package directory, public exports, Nx role and scope tags, and runtime
behavior. Do not provide an alias for the old private import name.

This decision is limited to the follow-up feature. Other legacy package names
remain valid until separate reviewable changes migrate their consumers.
Historical ADRs retain the names that described their original decisions.

## Consequences

New imports identify the owning capability and frontend role consistently
with the session feature. A consumer outside the checked-in workspace using
the private old name will need to update its import; no external compatibility
promise or published package is known. A clean frozen install, workspace build,
component tests, and browser tests verify current consumers and behavior.

The package name remains a compile-time identifier, not a change to BFF
contracts, browser URLs, stored data, cache keys, or deployment topology.
Other legacy names remain visible migration debt.

## Alternatives considered

Keeping the old name avoids an import change but keeps the misleading
infrastructure role after the architecture migration. Adding an alias makes a
private obsolete contract durable without a current consumer. Renaming every
model and data-access package in the same PR would broaden review and rollback
beyond this feature's identity.
