# Resolver Console architecture remediation

- Status: Proposed implementation sequence; harness changes accompany this plan
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Repair the already redesigned owned-follow-up and assigned-run Consoles in four
complete PRs: safe failures, disclosure workflows, shell/panes, and observation
inspection. Do not redesign the landing, session screens, inbox, or owned-work
cards now. Apply their remaining findings when those pages adopt the agreed
design. Preserve current BFF facts, authority boundaries, and executable guides.

## Scope and assessment

The review is substantially correct about mixed responsibilities, implicit
contracts, and lifecycle/error handling. These are verified ownership problems,
not failures inferred from source length.

| Finding                                       | Evidence and disposition                                                                                                                                                                                                                                                                                          |
| :-------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Defects can be logged/serialized by RTK Query | [Supervision cache integration](../../../packages/run-supervision/data-access-web/src/cache/run-supervision-api.ts) does not contain rejected client calls. Fix the redesigned Console endpoints and shared session gate first.                                                                                   |
| Failure normalization/recovery is incomplete  | [Supervision copy](../../../packages/run-supervision/feature-web/src/run-supervision-copy.ts) repeats unknown-shape probes; invalid-page advertises a reset that [the message](../../../packages/run-supervision/feature-web/src/assigned-run-message.tsx) cannot offer.                                          |
| Shell ownership is implicit                   | [App CSS](../../../apps/ergon-workbench/src/styles.css) infers chrome mode from a feature class; both Consoles render branded headers.                                                                                                                                                                            |
| Disclosure and selection have multiple owners | [Assigned workspace](../../../packages/run-supervision/feature-web/src/assigned-run-workspace.tsx) mixes request retirement and layout. [Owned selection](../../../packages/follow-up/feature-web/src/resolver-owned-human-follow-ups.tsx) retains a row and mirrors visibility through the containing workspace. |
| Inspector owns modal platform behavior        | [Inspector](../../../packages/follow-up/feature-web/src/resolver-observation-inspector.tsx) schedules unretired focus work; [comparison](../../../packages/follow-up/feature-web/src/resolver-observation-comparison.tsx) owns dialog lifecycle and positioning.                                                  |

Qualifications: current owned detail is derived from the current response and
fails closed; the redundant row is not proof of a stale-evidence leak. The
retirement promise protects a tested fresh-read invariant, not a second cache.
The exhaustive failure-copy Record remains exhaustive before Map conversion.
File/class counts and native semantic elements are review signals, not
violations. Local cursors are accepted by ADRs 0004, 0006, and 0023.

The error-boundary correction follows [RTK Query's query-function guidance](https://redux.js.org/toolkit/rtk-query/usage/customizing-queries).
Derived-state and render-forcing choices are evaluated against
[React's effect guidance](https://react.dev/learn/you-might-not-need-an-effect)
and [flushSync constraints](https://react.dev/reference/react-dom/flushSync),
plus the installed library's behavior and the existing privacy regressions.

## Invariants and boundaries

- Keep capability-first ownership from [ADR 0011](../../decisions/0011-adopt-capability-first-frontend-boundaries.md); no new application core or generic framework is justified.
- RTK Query owns resources. Local state may own exact selection identities,
  workflow phases, immutable replay intent, and historical receipt feedback.
- Preserve [ADR 0019](../../decisions/0019-revalidate-case-context-after-disclosure-closes.md) and [ADR 0023](../../decisions/0023-consume-assigned-run-console-snapshots.md): pending/failed checks hide detail; immediate pending reopen requires a distinct fresh gate; terminal detail still requires exact access.
- Preserve [ADR 0020](../../decisions/0020-use-revision-checked-browser-claim-commands.md) and [ADR 0021](../../decisions/0021-release-owned-follow-up-through-the-browser-bff.md): no automatic mutation retry, exact replay coordinates, private DOM hidden before release I/O.
- Keep private identities/cursors out of shareable URLs. URL-pagination changes
  require a separately approved superseding ADR, not this cleanup.
- Change only redesigned surfaces and their necessary integration seams.
  No backend HTTP, persisted-state, authority, or production rollout change.
  Frontend failure/presentation contracts change deliberately in their owning
  PR, with minimal exhaustive-mapping updates for every affected consumer.

## Ordered PR-sized tasks

Every title below belongs to **M05 - Human follow-up and resolver console**.
Each implementation includes components, state binding, responsive behavior,
tests, documentation, and the affected executable guide in one complete slice.

### 1. Contain unexpected failures at Resolver Console cache boundaries

Own safe failure outcomes in supervision and Console-serving follow-up data
access plus the shared current-actor gate. Catch defects before RTK serialization
and logging, preserve expected failures/cancellation, and normalize each
capability's UI error once. Match recovery actions exhaustively; supply an
assigned-traversal reset for invalid-page instead of unusable retry copy.

Acceptance: throwing clients and missing bindings expose no sentinel
message/stack/cause in Redux, actions, or automatic logs; concurrent abort does
not hide a genuine defect; malformed responses and defects render distinctly;
permanent errors do not auto-retry. Release uncertainty preserves its replay
tuple. No new telemetry service or broad legacy-page restyle.
Shared failure-contract additions may require small legacy-consumer mapping
updates; they do not authorize that page's full architectural or visual rewrite.

### 2. Make private Console disclosure a single-owned workflow

Replace the owned-row snapshot with the exact claim/work-item/case/run/revision
selection tuple and derive the current row. Remove mirrored Console visibility.
Encapsulate request retirement in cache integration hooks and selection,
recheck/release phases, and focus intent in cohesive feature controllers.
Replace synchronous render forcing only after committed workflow phases prove
equivalent safety. Preserve inbox traversal/retry intent across Console detours
through the smallest composition seam, without retaining private Console detail.

Acceptance: hide-before-I/O tests cover synchronous and held responses; late
completion after close/tenant switch cannot affect a new view; pending/fulfilled
reopen, StrictMode, terminal retention, exact claim changes, and cancellation
remain covered in both Consoles. Add the pending-close/reopen regression missing
from the follow-up Console; cancellation must not abort unrelated active readers.
Do not replace pending-read sequencing with an unproved
refetch/skip option or broaden the legacy card redesign.

### 3. Make Resolver Console shell and pane ownership explicit

Compose both Consoles through an app-owned standard/focused shell contract driven
by the single workflow owner, using render slots rather than a mirrored mode
callback. Centralize branding/navigation; remove feature-class chrome selectors.
Extract cohesive presence/toolbar and evidence, execution, and outcome sections.
Use explicit pane slots instead of fragments that implicitly complete a grid.
Let the shell allocate viewport space without assumed header-height subtraction.

Acceptance: both complete Consoles retain the approved dark visual direction,
correct chrome/landmarks and section focus, variable-height presence bars, narrow
reflow and 200% zoom; loading/failure panes preserve the layout. No landing or
session-screen redesign and no fabricated execution/proof facts.

### 4. Separate observation inspection and accessible comparison boundaries

Compose independently owned filter, observation list, source detail, and
comparison sections. Put modal lifecycle, Escape, focus trapping/restoration and
cleanup in a consumed, tested ui-web primitive. Keep source selection derived
from current authorized observations. Reuse toggle/disclosure/button styling
only where current consumers have identical semantics; do not build a catalog.

Acceptance: keyboard and pointer dismissal restore sensible focus; unmount,
filter changes and failed revalidation retire modal/focus work; source text
remains inert; long content/narrow layouts and axe checks pass. Native or Radix
implementation is a reviewed implementation choice, not a class-count mandate.

## Deferred redesign findings

| Surface                           | Apply when its new design is implemented                                                                                                                                                                                                                            |
| :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Landing route                     | Compose WorkbenchFrame; separate hero, principles and other cohesive sections; remove copied branding/footer.                                                                                                                                                       |
| Session screens                   | Separate gate, panels, actor display and typed recovery; move URL parsing to its owning pure model/data-access boundary, never add Effect to a platform-neutral model. Only shared session failure containment and necessary typed recovery mapping are in task 1.  |
| Shared inbox and owned-work cards | Deconstruct list/filter/pager/notices; derive receipt feedback; retain only required immutable retry intent; consolidate genuinely identical recovery/pager behavior and parent-owned spacing. Only Console selection/disclosure and detour seams are in tasks 2–3. |
| Future redesigned pages           | Apply the same ownership, safe-failure, cleanup, primitive and layout review before implementation; no exemptions for new code.                                                                                                                                     |

Do not automatically convert all pagination to URL state, all native controls
to Radix, or simple navigation forms to RHF. Those would change decisions or add
unused dependencies rather than repair the demonstrated problems.

## Verification, rollout and sequencing

The harness PR adds review fields and tested lint enforcement without changing
application behavior. Its checks do not claim that the planned defects are fixed.
Statically check Effect execution boundaries and hook correctness; prove cache
sanitization, commit ordering and focus lifetime with behavioral regressions.

For every implementation run repository/architecture checks, focused owning
tests, full `pnpm verify`, and regenerate affected guides with
`pnpm guide:generate`. Preserve existing close/reopen, release ordering, neutral
absence, tenant isolation, modal and responsive assertions rather than relaxing
them to fit the extraction. Guides remain labelled synthetic.

Merge/review each slice before the next. Roll back a slice as a unit if disclosure
or keyboard behavior regresses; no migration is needed. After these four fixes,
resume the approved backend task **Record and project ordered resolution-step
execution with attributable measurements** (M04). GitHub issues own live status;
this document is a proposed sequence, not a claim of delivered runtime fixes.
