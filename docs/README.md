# Ergon UI documentation map

## TL;DR

- Read [CONTRIBUTING.md](../CONTRIBUTING.md), then use this map to load only
  the sources relevant to the task.
- Architecture, engineering policy, delivered state, durable decisions, and
  backend contracts have separate canonical owners.
- Update this map when a canonical source moves or a recurring task lacks a
  clear route.
- Ergon core owns product vocabulary, HTTP contracts, and milestone titles;
  this repository owns browser architecture and implementation policy.

## Purpose and authority

This is the progressive-disclosure entry point for contributors and coding
agents. It routes tasks to canonical sources rather than repeating their
policy. [CONTRIBUTING.md](../CONTRIBUTING.md) owns workflow, issue shape,
verification, and completion reporting. [AGENTS.md](../AGENTS.md) is the
concise tool-facing entry point.

Read the rows relevant to the change. Do not bulk-read unrelated ADRs or every
package README. Always consult architecture when responsibility ownership or a
dependency edge changes.

## Route by task

| Task or changed area                                                             | Read before changing it                                                                                                                                | Verify or consult as needed                                       |
| :------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------- |
| Routes, providers, store assembly, or application composition                    | [Architecture](architecture.md), affected app README                                                                                                   | Relevant ADRs, `pnpm architecture:check`                          |
| Model values, semantic refinements, or application policy                        | [Architecture](architecture.md), [engineering standards](development/engineering-standards.md)                                                         | Relevant capability README and ADR, focused tests                 |
| BFF protocol, Effect execution, RTK Query, timeout, retry, cancellation, or CSRF | [Engineering standards](development/engineering-standards.md), affected data-access README                                                             | Backend contract/ADR, protocol and cache tests                    |
| React feature behavior, copy, accessibility, responsive layout, or interaction   | [Engineering standards](development/engineering-standards.md), affected feature README                                                                 | Testing Library and applicable Playwright behavior                |
| UI primitives, Tailwind tokens, or DOM behavior                                  | `packages/ui-web/README.md`, [engineering standards](development/engineering-standards.md)                                                             | Primitive tests, accessibility and reduced-motion review          |
| Authentication, authorization, tenant context, privacy, or browser storage       | [Architecture](architecture.md), [security policy](../SECURITY.md)                                                                                     | Relevant BFF decision and negative-path tests                     |
| Nx projects, tags, paths, or dependency direction                                | [Architecture](architecture.md), [ADR 0011](decisions/0011-adopt-capability-first-frontend-boundaries.md)                                              | `pnpm architecture:check`                                         |
| Documentation, templates, CI, repository policy, or agent guidance               | [Coding harness](development/harness.md)                                                                                                               | `pnpm repository:check`, `pnpm architecture:check`                |
| Dependencies, Node, pnpm, React, or Nx versions                                  | [Engineering standards](development/engineering-standards.md), root `package.json`                                                                     | Frozen install, affected checks, licensing and maintenance review |
| Issue or milestone planning                                                      | [CONTRIBUTING.md](../CONTRIBUTING.md), Ergon core [milestones](https://github.com/stanimirivanov/rag-help-center/blob/main/docs/roadmap/milestones.md) | Relevant product, contract, architecture, and UI decisions        |

## Canonical sources

- [Architecture](architecture.md) describes deployables, responsibility
  ownership, dependency direction, state, and security boundaries.
- [Engineering standards](development/engineering-standards.md) govern React,
  TypeScript, accessibility, data access, tests, and documentation.
- [Current state](development/current-state.md) records implemented behavior
  and deliberate limits.
- [Coding harness](development/harness.md) inventories guidance, feedback
  tiers, repository policy, and the steering loop.
- [Resolver Console remediation plan](development/plans/resolver-console-architecture-remediation.md)
  scopes the verified architectural findings to redesigned Consoles and records
  the remaining findings for their future page redesigns. Consult it before
  changing either Console or assuming its planned fixes are delivered.
- [ADRs](decisions/README.md) preserve durable UI decisions and their lifecycle.
- [Security policy](../SECURITY.md) defines private reporting and expectations
  for security-sensitive changes.
- [Ergon core](https://github.com/stanimirivanov/rag-help-center) owns product
  meaning, backend contracts, SQL, and the milestone catalog.

## Keeping the map useful

Update this page when a source is added, moved, renamed, or removed, or when a
recurring task has no clear route. Avoid listing transient implementation
details. `pnpm repository:check` validates local navigation and mechanical
document policy; semantic accuracy and external-link freshness still require
review.
