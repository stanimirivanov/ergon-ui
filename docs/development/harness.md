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

Console presentation changes also require `pnpm visual:check` (T3) using the
[pinned renderer and review procedure](visual-baselines.md). CI runs a separate
comparison-only job; it never approves or updates a baseline automatically.
Repository-policy tests reject skipped/tolerated visual gates and renderer drift.

| Command                   | What it proves                                                                                                                  | Tier  |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------ | :---- |
| `pnpm repository:check`   | Local Markdown navigation, TL;DR policy, ADR lifecycle/index integrity, and issue/PR template contracts                         | T1    |
| `pnpm architecture:check` | Nx metadata/dependencies and adversarial tests of the frontend lint configuration                                               | T1    |
| `pnpm verify:workspace`   | Formatting, linting, type checking, unit/component behavior, and production builds                                              | T2    |
| `pnpm e2e`                | Critical resolver behavior in Chromium                                                                                          | T3    |
| `pnpm guide:check`        | Literal source chapter order/slug uniqueness plus user-guide manifest, content, and media-path validation tests                 | T1    |
| `pnpm guide:generate`     | Tagged browser recording, fixture-network isolation, and static-book generation                                                 | T3    |
| `User guide artifact` CI  | Regenerated, validated simulated book uploaded for review; `main` alone packages and deploys it to Pages after repository setup | T3    |
| `pnpm verify`             | The complete current local acceptance sequence                                                                                  | T1–T3 |

Focused project checks remain useful during editing but do not replace an
applicable aggregate before handoff.

The guide metadata sensor uses the pinned TypeScript parser without executing
scenario modules. Each `*-guide.ts` declares one exported `GuideChapter` object
with a positive literal order and a lowercase hyphenated literal slug, both
unique across chapters. Generation checks these identities before clearing
output or recording. This early sensor does not prove content, media, or browser
behavior; the book validator and recorded assertions still own those checks.

Guide actions and result checkpoints require exactly one visible target in both
ordinary browser verification and recording mode. The non-recording regression in
`apps/ergon-workbench-e2e/src/guide-checkpoints.spec.ts` rejects ambiguous targets.
This catches locator collisions before expensive recording instead of letting a
green `pnpm e2e` silently skip the checkpoint's browser contract. Generated book
content and media still require the full `pnpm guide:generate` gate.

Recording captions are measured after wrapping, clamped to viewport gutters and
placed outside their highlighted target when space permits. The same annotation
helper is exercised directly in Chromium at 320 and 1440 pixels, including long
unbroken labels, above/below placement, replacement and cleanup. Native-modal
paint-order checks at both widths prove non-interactive manual popovers
keep captions above the modal top layer without moving focus. A high z-index
alone is not evidence that a caption is visible. These tests run without recording
video; visual review still checks that a checkpoint targets
the complete relevant message rather than hiding its explanation with a caption.

The guide workflow regression derives the failure-diagnostic directory from the
installed Nx Playwright preset and its config location. Nx output paths are
config-relative; accepting a matching suffix alone can silently upload no traces.
The CI artifact must retain the actual output/report directory alongside partial
guide recordings, without relaxing the generation or publication gate.

The workspace formatting gate uses `nx format:check --all`: all eligible source
files are checked without Git base/head discovery. Shallow, detached pull-request
checkouts need no local `main` ref or extra fetch credentials. The repository
policy's verification-workflow regressions protect that command, the full
workspace target set, and fail-closed CI steps. Do not rely on Nx's missing-ref
fallback, which prints an error before continuing with all files.

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

The companion [verification-workflow sensor](../../tools/repository-policy/verification-workflow.test.mjs)
also runs in `pnpm repository:check`. It rejects Git-range formatting, dropped
workspace checks, conditional or tolerated CI verification failures, and changes
to read-only checkout permissions. It validates configuration, not execution:
`pnpm verify` and the remote CI job still have to run successfully.

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

| Boundary                   | Required evidence when affected                                                                                                                                                                                                                                                    |
| :------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Effect/client to RTK Query | Sentinel defects/missing bindings stay out of cache, actions and raw logs; typed protocol failures remain distinct; abort does not hide a concurrent defect.                                                                                                                       |
| Private disclosure         | Pending/fulfilled immediate reopen, obsolete responses, failed revalidation, tenant/query changes and StrictMode preserve fresh access; committed phases hide before I/O, retiring one reader leaves other active readers intact, and detours retain only traversal/replay intent. |
| Failure presentation       | Closed failure/action mapping and executable sign-in, retry, reset or replay behavior; no advertised unavailable action.                                                                                                                                                           |
| Modal and focus            | Keyboard/Escape, return focus, filtering, unmount and authority-driven disappearance retire focus/timer work; long content and narrow reflow remain usable.                                                                                                                        |
| Shell and panes            | Explicit app-owned chrome and outer layout; complete loading/failure/populated surfaces at desktop, narrow width and zoom.                                                                                                                                                         |

Console committed-phase tests now replace the previous `flushSync` dependency;
cache hooks own fresh-read sequencing and subscriber retirement under
[ADR 0025](../decisions/0025-own-private-console-disclosure-workflows.md).
App chrome now consumes an explicit derived workspace slot under
[ADR 0026](../decisions/0026-compose-console-shell-and-named-panes.md).
Named panes retain loading/failure layout. Shell regressions cover one set of
landmarks, route-preserving skip navigation, wrapped presence allocation, valid
long context text at short desktop heights, and narrow/zoom-equivalent reflow.
Every independently scrolling pane needs a named keyboard focus target and a
visible focus indicator, including an outcome pane with no interactive controls;
prove actual keyboard scrolling as well as axe compliance. Rechecks and recovery
must move focus to a persistent control or heading before withdrawing their
trigger. Feature-class chrome selectors and guessed header-height subtraction
are not allowed.

Inspection modal mechanics now have a consumed ui-web boundary under
[ADR 0027](../decisions/0027-own-inspection-modal-lifecycle-in-ui-primitives.md).
Feature tests must prove exact current-source selection, permanent retirement of
removed comparison identities, and open-modal withdrawal through held/failed
cache revalidation. Primitive tests cover explicit synchronous return focus,
StrictMode and obsolete close events, disconnected targets and teardown without
feature dismissal. jsdom doubles do not prove a top layer or inertness: browser
checks must exercise real forward/backward tab containment, background-focus
rejection, pointer/Escape dismissal, long inert content and narrow reflow.
Do not use timer-based focus restoration or weaken these assertions to match
an extraction. Native modality is not a substitute for verifying its behavior.

The [scoped remediation plan](plans/resolver-console-architecture-remediation.md)
orders the remaining work while retaining current safety regressions.
It defers unrelated landing/session/inbox decomposition until those pages are
redesigned. Do not turn a deferred finding into a broad suppression.

## Browser-control regression evidence

Changes to session control must prove explicit lifecycle-only writes, fresh
status after historical acknowledgement, exclusive advisory expiry, retirement
of an open confirmation and unchanged fences across uncertain business replay.
A missing route is never simulated as DISABLED by production code. Existing
guide chapters explicitly model rollout off; the control chapter exercises
fenced rollout-on behavior. Real PostgreSQL/session authorization remains the
backend gate; simulated browser evidence must not claim it.

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
