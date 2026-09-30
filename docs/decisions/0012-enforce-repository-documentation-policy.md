# ADR 0012: Enforce repository documentation policy

- Status: Accepted
- Date: 2026-09-29
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Add a fast, CommonMark-aware repository-policy checker that keeps local
documentation, ADR history, and GitHub review templates coherent before the
slower workspace and browser gates run.

## Context

Ergon UI has concise agent guidance, strong TypeScript and accessibility rules,
an exhaustive Nx boundary sensor, and a complete browser acceptance command.
Most documentation, ADR lifecycle, milestone-field, and review-template rules
remain dependent on manual review. A renamed heading can break navigation, the
latest ADR can disappear without detection, and contributor policy and GitHub
templates can drift or be weakened together.

The repository already owns Node ESM architecture tooling outside production
packages. It also deliberately treats Ergon core as the authority for product
milestones, so an offline UI checker must not duplicate that catalog or depend
on network or sibling-repository state.

## Decision

Add `pnpm repository:check` as a repository-owned Node ESM sensor. Use a pinned
CommonMark-aware parser for rendered Markdown structure and a pinned YAML
parser for the GitHub issue form. Keep checker modules and dependencies in the
root tooling surface so they cannot enter browser bundles or capability
packages.

The checker reports all deterministic violations in stable path and line
order. It validates local links, exact casing, containment, heading anchors,
long-guide TL;DR sections, ADR numbering and lifecycle, reciprocal
supersession, retained ADR high-water state, index coverage, and canonical
issue and pull-request template structure. Required policy fields must be
visible; comments, raw HTML, image alt text, and code fences cannot satisfy
them.

Validate only the local `MNN - Outcome` issue-field shape and the current
placeholder. Ergon core remains authoritative for milestone numbering, titles,
and scope. Ignore external URL availability and factual documentation
freshness in the blocking offline check.

Run repository policy before the existing architecture sensor, workspace
checks, and Chromium flow in local verification and CI. Disable persisted Git
credentials in CI checkouts.

## Consequences

Broken navigation, missing summaries, ADR drift, and review-template weakening
fail early with actionable corrections. The documentation map can route tasks
progressively, and recurring review findings have a defined path into guidance,
sensors, or behavioral tests.

The root development dependency graph gains Markdown and YAML parsers. Checker
constants must advance intentionally when publishing a new ADR or changing a
review contract. Passing repository policy proves structure and local
navigation, not prose correctness, external-link health, or alignment with a
future core milestone change.

## Alternatives considered

Keeping these rules review-only was rejected because deterministic drift would
continue consuming reviewer attention and could escape unnoticed.

Line-oriented regular expressions alone were rejected because they cannot
reliably distinguish rendered policy from comments, code fences, image text,
or raw HTML. Querying Ergon core during checks was rejected because ordinary UI
verification must remain deterministic and network-independent after
bootstrap.
