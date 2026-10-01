# ADR 0017: Name the session model by capability and role

- Status: Accepted
- Date: 2026-10-01
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Rename the private session model package to `@ergon/session-model`.
Checked-in consumers change together; its platform-neutral identity value,
exports, and behavior remain unchanged.

## Context

ADR 0011 defines the `model` role for platform-neutral capability values and
pure semantic invariants. The session project lives at `packages/session/model`
with the `type:model` tag, but its `@ergon/domain-session` import name retains
the superseded global-layer taxonomy. ADR 0016 renamed session web data
access. This model is the last live package identity in the two current
capabilities that does not match its capability path and role.

The session data-access and feature packages are its checked-in production
consumers. The model has no runtime dependencies and is not published as an
independently supported npm package, so these consumers can move atomically.
An import name remains a compile-time compatibility boundary even when
private to a workspace.

## Decision

Name the package `@ergon/session-model`. Update its manifest, live source
imports and workspace dependencies, the pnpm lockfile, and current
documentation together. Keep its directory, public exports, Nx tags,
platform-neutral TypeScript configuration, and runtime behavior. Do not
provide an alias for the old private import name.

Historical ADRs retain the names used for their original decisions. This
change does not introduce a client-owned application core or move session
contracts out of web data access.

## Consequences

All current follow-up and session package identities now match their
capability paths and concrete roles. No dependency direction, BFF contract,
authentication authority, tenant-keyed cache identity, browser route, stored
data, or deployment topology changes. An untracked external consumer of the
old private name must update its import; no supported external consumer is
known. A frozen install and the complete workspace and browser verification
gate check the checked-in consumers.

## Alternatives considered

Keeping the old name avoids an import change but leaves one misleading
global-layer identity in the current package graph. Providing an alias would
retain an obsolete private identity without a current consumer. Moving or
expanding session semantics in the same change would mix behavior with a
compile-time compatibility rename.
