# ADR 0015: Name the follow-up model by capability and role

- Status: Accepted
- Date: 2026-10-01
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Rename the private follow-up model package to `@ergon/follow-up-model`.
Checked-in consumers change together; the platform-neutral values,
refinements, exports, and behavior remain unchanged.

## Context

ADR 0011 defines `model` as the role for platform-neutral capability values
and pure semantic refinements. The follow-up project lives at
`packages/follow-up/model` and has the `type:model` tag, but its
`@ergon/domain-follow-up` import name still reflects the superseded global
layer taxonomy. The follow-up feature and data-access packages now use
capability-and-role names. Package names are compile-time compatibility
boundaries even inside a private workspace.

The follow-up data-access and feature packages are the checked-in production
consumers. The model has no runtime dependencies and is not published as an
independently supported npm package. These consumers can move atomically.

## Decision

Name the package `@ergon/follow-up-model`. Update its manifest and Vitest
identity, live source imports and workspace dependencies, the pnpm lockfile,
and current documentation together. Retain its directory, exports, Nx tags,
platform-neutral TypeScript configuration, tests, and runtime behavior. Do
not provide an alias for the old private import name.

Historical ADRs and legacy-path test fixtures retain the names used for their
original decisions or hypothetical projects. Session package identities are
outside this decision.

## Consequences

The three follow-up package identities now match their capability paths and
concrete roles. No dependency direction, BFF contract, cache identity,
browser route, stored data, or deployment topology changes. An untracked
external consumer of the old private name must update its import; no supported
external consumer is known. A frozen install and the complete workspace and
browser verification gate check the checked-in consumers.

Session model and data-access identities remain legacy names for separate,
reviewable changes.

## Alternatives considered

Keeping the old name avoids an import change but leaves the model as the only
follow-up package with the global-layer taxonomy. Providing an alias would
retain an obsolete private identity without a current consumer. Renaming
session packages in this change would combine distinct compatibility
boundaries and broaden review and rollback.
