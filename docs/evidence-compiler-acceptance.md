# Evidence compiler browser acceptance

## TL;DR

Milestone: M06 - Evidence Compiler. The executable chapter
`evidence-review-and-bundles` demonstrates cited contradiction inspection,
explicit preference, exact command recovery, immutable bundle inspection and
access withdrawal on the existing evidence route. Every BFF response is synthetic
and marked. This proves browser interaction, not live compiler or database behavior.

The coordinated delivery is tracked by [UI issue #240](https://github.com/stanimirivanov/ergon-ui/issues/240)
and [backend issue #259](https://github.com/stanimirivanov/ergon/issues/259).
Separate repository PRs are explicitly authorized for PR14 and do not merge
atomically. No product behavior, dependency or browser API is added here.

## Coverage and workflow

The chapter is defined in
[guide metadata](../apps/ergon-workbench-e2e/src/guide/evidence-compiler-guide.ts)
and asserted by [the evidence browser scenario](../apps/ergon-workbench-e2e/src/evidence-knowledge.spec.ts).
Its shared simulated fixture also serves stale-publication and conservative
comparison tests. It keeps existing test intent while adding ordered narrated
checkpoints and the guide's network markers.

The guide starts with already accepted opposed claims. It reads both exact
quotations, preserves inert markup, exercises keyboard confirmation and 320-pixel
reflow, recovers unchanged adjudication/publication commands after uncertainty,
distinguishes selected claims from historical alternatives, and removes private
content after access withdrawal. Automated accessibility checks support these
assertions. A matching stale publication test reacquires historical decision
state without manufacturing replacement intent. Unknown/insufficient comparison
states cannot become automatic resolution.

The guide network boundary now admits the exact local tenant evidence document.
It still rejects internal APIs, unmarked BFF responses and external requests.
A browser regression checks allowed document navigation and internal-API denial;
recording uses the same boundary to prevent accidental live calls.

## Source-to-contract boundary

The backend acceptance record lives at
[Ergon M06 acceptance](https://github.com/stanimirivanov/ergon/blob/main/docs/roadmap/m06-acceptance.md),
with the implementation under backend issue #259 until merged. It includes
pinned licensed real Markdown/OpenAPI sources, digest/citation checks and a
Spring/PostgreSQL source-to-contract scenario. That scenario registers sources,
proposes and reviews claims/procedures, adjudicates typed conflict, publishes a
bundle and consumes it through case-pinned documentary contract readiness.

Do not confuse that server path with this browser recording. The UI has no source
upload editor, contract authoring, case bundle attachment or documentary-readiness
display. It must not call `/internal/v1` to invent those workflows. Existing
proposal review is covered separately by `evidence-review.spec.ts`.

A citation proves attribution to original bytes, not the truth of a manual
semantic binding. Bundle cutoff is historical. Server claim validity is evaluated
at the database-recorded case attachment time; documentary satisfaction neither
supplies a live operational observation nor grants capability, approval, execution
or outcome-proof authority. No M07 promotion is implied.

## Verification and reproduction

Run from this repository using Node 24 and the pinned pnpm version:

```bash
pnpm repository:check
pnpm architecture:check
pnpm guide:check
pnpm exec playwright test --config apps/ergon-workbench-e2e/playwright.config.mts evidence-knowledge.spec.ts --project chromium
pnpm guide:generate
pnpm verify
```

`guide:generate` owns local preview ports 4300 and 4301 for isolated recording.
Stop this checkout's old preview processes before recording; do not point the
scenario at a live backend. The ignored output under `dist/user-guide` contains
asserted screenshots, video and assembled HTML/Markdown; generated media is not
committed. Final command results and any failed/skipped gates are recorded on
the delivery PR.

## Remaining gaps

Simulated UI evidence does not establish PostgreSQL transaction guarantees,
real authority expiry, source retention, live OIDC, browser-to-backend integration
or production readiness. Backend database tests require Docker; a skipped test is
not a passing acceptance result. Live two-app/OIDC deployment remains unverified.
Extra formats, live models, arbitrary-prose contradiction inference, crawling,
workers/object storage and simulation/promotion remain separate scope.
