# Ergon UI coding harness

## TL;DR

- Use the [documentation map](../README.md) to load only guidance relevant to
  the task.
- Run `pnpm repository:check` and `pnpm architecture:check` for fast,
  deterministic structural feedback.
- Run `pnpm verify` before handoff; it retains the complete formatting,
  workspace, build, and Chromium acceptance gate.
- Report unavailable checks as not run with the blocker and residual risk.
- Turn recurring review findings into clearer guidance, an early deterministic
  sensor, a behavioral test, or an explicit owned exception.

## Purpose

The coding harness helps people and coding agents understand the repository
before editing and detect drift afterward. Feed-forward guidance explains
intent and boundaries. Feedback sensors prove structural invariants and
observable behavior. Cheap checks run early without weakening the complete
acceptance gate.

This inventory does not replace the workflow in
[CONTRIBUTING.md](../../CONTRIBUTING.md), the implementation rules in
[engineering standards](engineering-standards.md), or the exact CI workflow in
[`verify.yml`](../../.github/workflows/verify.yml).

## Cost and timing tiers

| Tier                        | Intended timing                 | Current feedback                                                                                                                          |
| :-------------------------- | :------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------- |
| T0 — route                  | Before editing                  | Read-only task routing through the [documentation map](../README.md), then the relevant architecture, package, security, and ADR sources. |
| T1 — structure              | During editing                  | `pnpm repository:check` and `pnpm architecture:check`; deterministic and network-independent after dependencies are installed.            |
| T2 — workspace              | Before handoff                  | `pnpm verify:workspace`: formatting, linting, strict type checking, unit/component tests, and production builds.                          |
| T3 — browser and specialist | Before handoff or when affected | `pnpm e2e`, plus explicitly applicable security, performance, compatibility, or deployment checks.                                        |

`pnpm verify` composes T1 through the current browser acceptance gate. A tier
describes cost and timing, not permission to omit an applicable check.
Dependency resolution is a separate networked, mutating bootstrap step:
`pnpm install --frozen-lockfile`.

## Feed-forward guidance

| Guide                                             | What it supplies                                                   | Load when                           |
| :------------------------------------------------ | :----------------------------------------------------------------- | :---------------------------------- |
| [AGENTS.md](../../AGENTS.md)                      | Concise tool-facing agreement and canonical links                  | Every task                          |
| [CONTRIBUTING.md](../../CONTRIBUTING.md)          | Workflow, issue shape, review, verification, and completion policy | Every task                          |
| [Documentation map](../README.md)                 | Progressive task-to-source routing                                 | Every task                          |
| [Architecture](../architecture.md)                | Capability ownership, dependencies, state, and trust boundaries    | Boundary or code changes            |
| [Engineering standards](engineering-standards.md) | TypeScript, React, Effect, accessibility, security, and tests      | Implementation work                 |
| [Current state](current-state.md)                 | Delivered behavior and explicit limits                             | Before assuming a capability exists |
| [ADR index](../decisions/README.md)               | Accepted durable decisions and supersession history                | Decisions relevant to the task      |
| [Security policy](../../SECURITY.md)              | Vulnerability reporting and sensitive-change expectations          | Security-sensitive work             |

## Feedback sensors

| Command                   | What it proves                                                                                                                  | Tier  |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------ | :---- |
| `pnpm repository:check`   | Local Markdown navigation, TL;DR policy, ADR lifecycle/index integrity, and issue/PR template contracts                         | T1    |
| `pnpm architecture:check` | Nx metadata/dependencies and adversarial tests of the frontend lint configuration                                               | T1    |
| `pnpm verify:workspace`   | Formatting, linting, type checking, unit/component behavior, and production builds                                              | T2    |
| `pnpm e2e`                | Critical resolver behavior in Chromium                                                                                          | T3    |
| `pnpm guide:check`        | User-guide manifest, content, and media-path validation tests                                                                   | T1    |
| `pnpm guide:generate`     | Tagged browser recording, fixture-network isolation, and static-book generation                                                 | T3    |
| `User guide artifact` CI  | Regenerated, validated simulated book uploaded for review; `main` alone packages and deploys it to Pages after repository setup | T3    |
| `pnpm verify`             | The complete current local acceptance sequence                                                                                  | T1–T3 |

Focused project checks remain useful during editing but do not replace an
applicable aggregate before handoff.

## Repository policy

`pnpm repository:check` discovers policy-controlled Markdown and reports every
violation in deterministic path and line order. Diagnostics identify the rule,
problem, correction, and canonical policy. The checker validates:

- repository-local Markdown destinations, exact path casing, repository
  containment, percent encoding, and GitHub-style heading anchors;
- a visible, non-empty `## TL;DR` as the first level-two section in long or
  policy-oriented guides;
- ADR filenames, headings, ordered sections, lifecycle metadata, dates,
  milestone shape, contiguous numbering, retained high-water mark, index
  coverage, status agreement, and reciprocal supersession;
- the ordered, required YAML issue-form fields and milestone placeholder; and
- pull-request headings, prompts, exact verification commands, not-run risk
  field, and ordered review checklist.

ADRs and GitHub templates are exempt from the general TL;DR threshold because
their own fixed structures are checked separately. The UI repository does not
duplicate or query Ergon core's milestone catalog: offline policy validates
the local `MNN - Outcome` field, while semantic milestone ownership remains a
core-repository and review responsibility.

Raw HTML, comments, code fences, and image-only text cannot satisfy required
visible fields. External URL availability, factual accuracy, and prose
freshness remain outside this deterministic offline sensor.

## Frontend architecture feedback

[Engineering standards](engineering-standards.md#react-and-routing) define
cohesive route/workspace boundaries, one owner per kind of state, explicit
shell/pane contracts, and private-disclosure lifecycle evidence. The pull-request
template requires UI scope/deferred findings, state/replay intent, and
shell/focus/request boundaries; repository policy rejects removed or hidden
prompts and checklist items.

The [shared ESLint configuration](../../tools/frontend-boundary-rules.mjs)
uses the pinned built-in import restriction and React Hooks plugin:

- app, feature, and UI source cannot import Effect execution namespaces or
  runtime subpaths, including literal dynamic/CommonJS access; named Schema and
  erased type imports remain allowed;
- hook order and dependency correctness are errors in presentation and
  data-access hook source, including package-local lint configurations.

[Adversarial tests](../../tools/frontend-boundary-rules.test.mjs), included in
`pnpm architecture:check`, exercise the actual root/project configurations,
aliases, namespace/subpath access, allowed decoding/type imports, permitted
data-access runners, hook order, and missing dependencies. Workspace lint checks
the actual source. Configuration tests alone do not establish source compliance.
The shared configuration is explicitly included in `namedInputs.sharedGlobals`
in `nx.json`: Nx does not recursively hash imported ESLint helpers. Changing it
invalidates default-based target caches, including source lint, without replacing
inferred inputs or creating an otherwise unused Nx custom-rule plugin.
Computed specifiers and indirect runtime acquisition require semantic review;
these rules are not an execution sandbox.

These sensors deliberately do not infer state meaning from variable names,
enforce file/class counts, prohibit native semantic controls, or require every
cursor to be shareable. Accepted ADRs govern cursor privacy and immutable replay
intent. They also do not prove safe error serialization or request/focus lifetime.
Those require owning behavioral tests and the semantic review:

| Boundary                   | Required evidence when affected                                                                                                                                                             |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Effect/client to RTK Query | Sentinel defects/missing bindings stay out of cache, actions and raw logs; typed protocol failures remain distinct; abort does not hide a concurrent defect.                                |
| Private disclosure         | Pending/fulfilled immediate reopen, obsolete responses, failed revalidation, tenant/query changes, StrictMode and owned-request cleanup preserve fresh access and hide-before-I/O ordering. |
| Failure presentation       | Closed failure/action mapping and executable sign-in, retry, reset or replay behavior; no advertised unavailable action.                                                                    |
| Modal and focus            | Keyboard/Escape, return focus, filtering, unmount and authority-driven disappearance retire focus/timer work; long content and narrow reflow remain usable.                                 |
| Shell and panes            | Explicit app-owned chrome and outer layout; complete loading/failure/populated surfaces at desktop, narrow width and zoom.                                                                  |

Existing documented `flushSync` ordering and feature-class chrome selectors
remain known migration debt, not proof of completed cleanup or permission for
new copies. The [scoped remediation plan](plans/resolver-console-architecture-remediation.md)
orders their replacement while retaining their current safety regressions.
It defers unrelated landing/session/inbox decomposition until those pages are
redesigned. Do not turn a deferred finding into a broad suppression.

## Steering loop

When a review finding or escaped defect recurs, close the earliest reliable
feedback loop:

1. Clarify intent in the narrow canonical guide and route readers to it.
2. Add or improve a deterministic T1 sensor for a structural invariant.
3. Add a focused behavioral test for an observable regression.
4. If automation would be noisy, record an explicit exception, owner, reason,
   and review trigger.

A sensor must be deterministic, actionable, cross-platform at its owning tier,
and built from repository-pinned tools. It must not silently rewrite expected
behavior, weaken invariants, depend on undeclared ambient tools, or report an
unavailable check as passing.

## Multi-PR execution plans

Use a versioned plan under `docs/development/plans/` only when one approved
outcome needs several dependent pull requests. Create the directory with the
first slice, not speculatively. A plan records invariants, exclusions, ADRs,
ordered slices, compatibility, rollout, rollback, and verification; GitHub
issues remain authoritative for live delivery state.

## Extending the harness

Add guidance or a sensor only for a demonstrated gap. Extend this repository's
existing Node policy or Nx checks before creating a parallel tool. New checks
need focused adversarial tests, useful diagnostics, documented timing and CI
ownership, and low false-positive risk. Review harness dependencies as tooling
dependencies and keep them out of browser bundles and capability packages.
