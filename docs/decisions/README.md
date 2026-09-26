# UI architecture decisions

## TL;DR

Accepted ADRs are durable historical records. Supersede rather than rewrite a
decision whose context or outcome changes.

| ADR                                                                | Status     | Decision                                                      |
| :----------------------------------------------------------------- | :--------- | :------------------------------------------------------------ |
| [0001](0001-adopt-nx-and-separate-browser-trust-boundaries.md)     | Accepted   | Adopt Nx and separate workbench/requester browser deployables |
| [0002](0002-resolve-browser-sessions-with-rtk-query-and-effect.md) | Superseded | Resolve actor sessions through RTK Query and Effect           |
| [0003](0003-consume-confidential-bff-sessions.md)                  | Accepted   | Consume confidential same-origin BFF sessions                 |
| [0004](0004-consume-read-only-resolver-inbox.md)                   | Accepted   | Consume the read-only resolver follow-up inbox                |
| [0005](0005-claim-follow-up-with-ephemeral-csrf-tokens.md)         | Accepted   | Claim follow-up work with ephemeral CSRF tokens               |
| [0006](0006-recover-resolver-owned-follow-up-work.md)              | Accepted   | Recover active claims from the confidential BFF               |
| [0007](0007-render-owned-follow-up-case-context.md)                | Accepted   | Render server-authorized context inside owned follow-ups      |
| [0008](0008-render-failed-execution-and-retry-handoff.md)          | Accepted   | Explain failed execution and exhausted retry handoff          |
| [0009](0009-enforce-capability-and-dependency-boundaries.md)       | Accepted   | Enforce capability-specific ports and inward dependencies     |

Use [the template](0000-template.md) for decisions affecting compatibility,
security, deployment, foundational technology, persisted meaning, or multiple
applications.
