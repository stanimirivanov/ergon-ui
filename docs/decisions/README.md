# UI architecture decisions

## TL;DR

Accepted ADRs are durable historical records. Supersede rather than rewrite a
decision whose context or outcome changes.

## Naming and lifecycle

Published decisions use `NNNN-lowercase-kebab.md`, a matching
`# ADR NNNN: Title`, a real ISO date, one `MNN - Outcome` milestone, and the
section order in the template. Supported statuses are `Proposed`, `Accepted`,
`Rejected`, `Deprecated`, or `Superseded by` an exact ADR link.

A replacement adds `- Supersedes:` with exact links to every decision it
replaces; each older record points back through its status. The published ADR
high-water mark is `0019`. It may advance with the next decision but must never
decrease, even when the newest record is later superseded or deprecated.

## Index

| ADR                                                                | Status     | Decision                                                      |
| :----------------------------------------------------------------- | :--------- | :------------------------------------------------------------ |
| [0001](0001-adopt-nx-and-separate-browser-trust-boundaries.md)     | Accepted   | Adopt Nx and separate workbench/requester browser deployables |
| [0002](0002-resolve-browser-sessions-with-rtk-query-and-effect.md) | Superseded | Resolve actor sessions through RTK Query and Effect           |
| [0003](0003-consume-confidential-bff-sessions.md)                  | Accepted   | Consume confidential same-origin BFF sessions                 |
| [0004](0004-consume-read-only-resolver-inbox.md)                   | Accepted   | Consume the read-only resolver follow-up inbox                |
| [0005](0005-claim-follow-up-with-ephemeral-csrf-tokens.md)         | Accepted   | Claim follow-up work with ephemeral CSRF tokens               |
| [0006](0006-recover-resolver-owned-follow-up-work.md)              | Accepted   | Recover active claims from the confidential BFF               |
| [0007](0007-render-owned-follow-up-case-context.md)                | Superseded | Render server-authorized context inside owned follow-ups      |
| [0008](0008-render-failed-execution-and-retry-handoff.md)          | Accepted   | Explain failed execution and exhausted retry handoff          |
| [0009](0009-enforce-capability-and-dependency-boundaries.md)       | Superseded | Enforce capability-specific ports and inward dependencies     |
| [0010](0010-extract-capability-react-adapters.md)                  | Superseded | Extract capability React code as inbound adapters             |
| [0011](0011-adopt-capability-first-frontend-boundaries.md)         | Accepted   | Adopt capability-first roles and selective application cores  |
| [0012](0012-enforce-repository-documentation-policy.md)            | Accepted   | Enforce repository documentation policy                       |
| [0013](0013-name-follow-up-feature-by-capability-and-role.md)      | Accepted   | Name the follow-up feature by capability and role             |
| [0014](0014-name-follow-up-data-access-by-capability-and-role.md)  | Accepted   | Name follow-up data access by capability and role             |
| [0015](0015-name-follow-up-model-by-capability-and-role.md)        | Accepted   | Name the follow-up model by capability and role               |
| [0016](0016-name-session-data-access-by-capability-and-role.md)    | Accepted   | Name session data access by capability and role               |
| [0017](0017-name-session-model-by-capability-and-role.md)          | Accepted   | Name the session model by capability and role                 |
| [0018](0018-bind-case-context-cache-to-full-request-identity.md)   | Accepted   | Bind case-context cache to the validated request tuple        |
| [0019](0019-revalidate-case-context-after-disclosure-closes.md)    | Accepted   | Recheck case context after disclosure closes                  |

Use [the template](0000-template.md) for decisions affecting compatibility,
security, deployment, foundational technology, persisted meaning, or multiple
applications.
