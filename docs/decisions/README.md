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

Use [the template](0000-template.md) for decisions affecting compatibility,
security, deployment, foundational technology, persisted meaning, or multiple
applications.
