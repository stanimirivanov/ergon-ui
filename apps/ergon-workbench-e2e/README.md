# Workbench browser checks and local user guide

## TL;DR

The tagged access-state, inbox-navigation, follow-up, owned-context,
claim-recovery, release-recovery, run-supervision, handover, approval,
pinned-evidence, outcome-verification, proof-finalization, execution/recovery,
failed-run retry, exhausted-run escalation, predecessor-inspection and admission-history scenarios
are ordinary assertion-first
Playwright tests in `pnpm e2e`. `pnpm guide:generate` reruns all nineteen with
annotations, screenshots, and video, then assembles a local nineteen-chapter Markdown
and static HTML guide. Their BFF responses and case data are simulated; the
result is **not** a live backend or OIDC verification. A successful `main` run
can publish the same labelled book to GitHub Pages after repository setup.

## Commands

From the `ergon-ui` repository root:

```powershell
pnpm e2e
pnpm guide:check
pnpm guide:generate
pnpm guide:preview
```

`guide:check` validates unique literal chapter orders and slugs before browser
recording, alongside the book and workflow tooling tests. Each `*-guide.ts`
exports one typed `GuideChapter` object with a positive integer order and a
lowercase hyphenated slug. Generation repeats this check before clearing output.

`guide:generate` builds the workbench, ensures Chromium is installed, clears
only the ignored `dist/user-guide` output, runs `@user-guide` scenarios in
recording mode, and validates and assembles their manifests. Open
`http://127.0.0.1:4173` after starting `guide:preview`; `GUIDE_PORT` may
select another loopback port. The preview server supports range requests for
video, rejects path escape, and serves no external scripts. Do not commit
generated screenshots, recordings, manifests, or rendered pages.

The `User guide artifact` GitHub Actions workflow runs on pull requests and
`main` pushes (or manually). Download its `simulated-user-guide-*` artifact
from the workflow run to review the rendered book. The artifact expires after
seven days. A failed recording uploads available guide and Playwright evidence
separately. The generation job has read-only repository permission.

## Exhausted-run escalation walkthrough

The escalation chapter has 17 assertion-backed steps: disabled rollout, exact
exhaustion review, acknowledgement/cancellation, keyboard containment and narrow
reflow, stale-epoch conflict, fresh review, hidden-before-POST disclosure, lost
committed acknowledgement, unchanged replay, terminal detail outside discovery,
held/denied revalidation, fresh recovery and independent shared-queue discovery
without auto-claim. Separate browser tests cover unsupported, denied, malformed
and remaining-budget reviews and first commit on uncertain uncommitted replay.
OPEN in a receipt is original creation status, never current work ownership.
Deploy backend PR #168/schema before enabling
ERGON_RUN_SUPERVISOR_ESCALATION_ENABLED (default false). Fixtures simulate
authority and work creation; real authorization, races and database atomicity
belong to Ergon verification, not this guide.

## Proof-finalization walkthrough

The proof-finalization chapter reviews a disabled/enabled matching outcome,
inspects its source, requires explicit acknowledgement, cancels without I/O,
checks narrow modal accessibility, rejects stale proof, reviews changed evidence,
hides private resources before a held command, recovers a lost response by exact
replay, reads terminal accepted proof after active discovery empties and hides it
on pending/denied revalidation. Its synthetic transaction and authority facts are
not real backend verification. The backend rollout defaults off; deploy schema
and backend before enabling browser commands.

## Execution and recovery walkthrough

The execution/recovery chapter has 20 assertion-backed steps covering disabled
rollout, explicit acknowledgement/cancellation, keyboard containment and narrow
reflow, stale-epoch rejection, committed private withdrawal, lost acknowledgements,
admitted status-only replay, possible first admission on exact-intent retry,
distinct same-command recovery, receipt-only projection
repair and VERIFYING without closure. Held/denied revalidation hides earlier private
facts. Separate browser checks cover unsupported and denied review without writes.
The fixture counts synthetic dispatch checkpoints; it does not prove real provider
idempotency, authority, PostgreSQL durability or production recovery. Deploy backend
schema/code before enabling the separate default-off execution flag.

## Failed-run retry walkthrough

The retry chapter has twenty assertion-backed steps: disabled/enabled fresh
review, exact plan/budget and fresh safeguards, required acknowledgement,
cancellation, keyboard/320-pixel reflow, stale case planning, held-command
privacy withdrawal, lost committed acknowledgement, unchanged replay and fresh
successor access. It also records held/denied successor revalidation, fresh
access recovery and an exhausted second attempt without a third run or automatic
escalation. Separate browser checks cover unsupported/denied/malformed review
and first commitment when the original POST never committed. Fixture counters
are synthetic protocol checkpoints, not real authorization or transaction proof.
Deploy Ergon PR #166's schema/readers before enabling its default-off retry flag.
No guide media or generated book is committed.

## Publication

The [publication decision](../../docs/decisions/0022-publish-simulated-user-guide-from-main.md)
limits the Pages artifact and deployment job to successful `main` runs. Pull
requests and manual runs from other refs remain review-only. The separate
deployment job receives only `pages: write` and `id-token: write`, uses the
`github-pages` environment, and reports the URL supplied by GitHub. No
generated files are committed to a publishing branch.

Before the first deployment, a maintainer must set **Settings → Pages → Build
and deployment → Source** to **GitHub Actions** and review the `github-pages`
environment protection rules. The workflow does not change that setting. See
[GitHub's Pages source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
GitHub Pages may be public even for a private repository: review the generated
media and text for synthetic-only data before merging. A missing Pages setting
or failed build prevents publication; it must not be bypassed by relaxing
the simulation boundary or granting PR jobs deployment authority.

## Content and trust boundary

The reader-facing chapter definition is co-located with the browser scenario
under `src/guide/`. It supplies audience, overview, prerequisites, actions,
expected results, troubleshooting, and limitations. Each declared step ID must
be executed in order by the tagged scenario. Actions/result checkpoints also
require one visible target in ordinary test mode, so locator ambiguity cannot
hide until recording. The assembler rejects missing or
escaping media, malformed structure, an unlabelled verification mode, and a
chapter too thin to explain a multi-step workflow. These checks are a floor,
not a substitute for reviewing the rendered prose and screenshots for clarity
and accuracy.

The access chapter compares mutually exclusive synthetic session states; the
recording swaps fixture responses between reloads and never performs a real
login. It verifies the safe local sign-in path, failure-state non-disclosure,
and retry into a simulated verified session. The inbox chapter uses 26 synthetic
items to exercise the real 25-row UI page boundary, a paired keyset cursor,
shareable exact-queue filtering, and a neutral empty result. The follow-up
chapter uses a synthetic resolver, case, and follow-up to verify browser
claim/release, evidence disclosure, and accessibility. The claim-recovery
chapter distinguishes a definite competing claim from an uncertain response
and asserts an explicit replay of the original command. The owned-context
chapter demonstrates lazy disclosure, an explicit current-claim recheck with
fresh context, hidden evidence during revalidation, pending close/reopen with a
distinct fresh read, and a neutral unavailable result. Closing removes private
Console content immediately; another active reader's shared transport lifetime
is verified separately by cache-hook regressions. Inbox traversal and exact
uncertain claim-retry intent survive Console detours in workspace tests.
The chapter also identifies the verified session actor in the Current claim strip
without treating that display as claim authority, and distinguishes recorded
capability risk and approval requirements from a current approval decision.
The release-recovery chapter compares a disabled rollout with a separately
enabled synthetic state, then verifies
exact claim-and-revision replay after a lost response. None verifies a real
provider, control plane, database, or authorization decision. Keep that
distinction visible in each chapter and the index. A later disposable
full-stack environment is required before calling these operational guides.

The run-supervision chapter opens the assigned-only active-run Console,
distinguishes pinned capability-policy requirements from approval decisions,
and explains absent evidence/proof detail. It inspects a synthetic measured
gateway-call receipt and its keyboard provenance disclosure, measured zero,
an unmeasured failed result, explicit null receipt and older-server omission.
Those fixture switches demonstrate compatibility, not mutation of production
receipts. Result-before-state projection and wall-clock correction are explicit;
its 37 steps also show the revision-zero empty history, projected capability
result and two-event terminal prefix. Sequence, not timestamp order, is
authoritative; proof acceptance metadata is not inspected outcome evidence.
The fixtures simulate returned records, not real runtime commands or persistence.
milliseconds preserve exact nanoseconds and cost is never inferred. It records private snapshot hiding
during pending and failed revalidation, safe retry, terminal detail after active
discovery empties, and neutral protected absence. It also checks keyboard
navigation and narrow reflow. The separate layout regression verifies that the
named desktop outcome viewport receives keyboard focus and actually scrolls
with PageDown when its existing fixture content overflows. Assignment, current
authority, and terminal state
are synthetic backend facts, not browser authorization or outcome proof.
It also records a rejected paired assignment cursor and a fresh first-page reset,
proving that recovery does not repeatedly send the rejected traversal or restore
private selection. The access, owned-context, claim, and release chapters explain
workbench-defect recovery separately: programming defects are covered by cache
and component regressions, not fabricated as HTTP problem responses in the guide.

Recording mode blocks service workers and permits only local preview documents
and static assets to reach the preview server. The synthetic BFF routes must
fulfill their responses with a fixture marker. An unmatched request, external
HTTP(S) request, or unmarked BFF response fails generation even if the browser
UI recovers; request diagnostics omit query values. This guards the simulated
artifact against accidental live-data capture, but it is not a substitute for
reviewing test routes and generated media before sharing an artifact.

The generator and static-book layout adapt the
[Omoikane user-guide pattern](https://github.com/stanimirivanov/chat-hub-99);
Ergon owns the richer content
schema, simulation disclosure, and security checks. The guide runtime remains
inside this `type:test` project and adds no browser-bundle dependency.

## Shell regression coverage

The handover chapter covers confirmed run-supervision handover in 25 executable
steps: disabled rollout, recipient paging, required fields, cancellation,
fresh reopening, stale-epoch rejection, revalidation, hidden-before-POST
context, an uncertain committed transfer, exact replay, recipient recovery,
keyboard containment and 320-pixel reflow. The test-owned wire fixture is
independent of client contract types. It explicitly changes synthetic session
and epoch responses; it never performs live login or updates a real database.
The guide distinguishes current supervision from the unchanged initial
assignment and runtime state, and documents lost local retry intent on navigation.

`console-shell.spec.ts` also verifies both redesigned surfaces through one
app-owned focused shell, explicit pane slots during pending/failed reads,
standard-shell restoration, naturally wrapping presence controls and actual
toolbar-height allocation. Desktop, 320-pixel stacked and 720-pixel reflow
are covered; 720 is the CSS-width equivalent of a 1440-pixel viewport at 200%
zoom, not browser zoom automation. These fixtures prove browser presentation,
not live control-plane authority.

`observation-inspection.spec.ts` uses long source text, an unbroken token and
literal markup to prove native modal keyboard scrolling, forward/backward
containment, rejected background focus, inert content, pointer/Escape dismissal
and desktop/320-pixel reflow. The owned-context guide records title focus and
keyboard containment before comparing sources. Open-modal retirement during
held/failed ownership checks is separately covered by feature/cache integration
tests; recording does not fabricate a live revocation event.

## Approval walkthrough

The approval chapter has 21 approval-review steps: older-server omission, absent
request, exact requester scope, exclusive expiry, explicit acknowledgement and
cancellation, stale-epoch rejection, fresh recovery, hidden-before-POST context,
uncertain committed approval and exact replay, immutable APPROVED/REJECTED facts,
keyboard containment and 320-pixel reflow. A later replacement fixture advances
past the earlier expiry; snapshot switches are labelled simulations, not live
authority provisioning or browser request creation. No grant, execution or run
advancement is inferred. PostgreSQL authorization/migration evidence belongs
to Ergon, not this synthetic guide.

## Pinned evidence walkthrough

The pinned-evidence chapter records 17 steps covering older-server omission,
supported empty history, exact binding/source inspection, ordinary historical
value changes without contradiction inference, inert long text, keyboard and
320-pixel reflow, held/denied revalidation, malformed attribution, explicit
100-binding truncation and zero writes. The fixture uses producer-owned evidence
types; it does not implement actual backend filtering or authority changes.
Real PostgreSQL and browser-security verification belongs to Ergon.

## Outcome verification walkthrough

The outcome-verification chapter records 16 steps distinguishing unsupported,
unassessed, missing, mismatching, mutable matching and durably accepted proof.
It verifies exact post-action inspection, literal long source text, keyboard
containment, 320-pixel reflow, terminal detail after active discovery empties,
held/denied revalidation, fresh recovery, malformed proof and zero writes. All
snapshots are synthetic comparisons; actual evaluator/acceptance/authorization
evidence belongs to Ergon's PostgreSQL tests.

## Attempt navigation walkthrough

The sixteenth chapter has thirteen read-only steps: immediate predecessor
inspection, keyboard/320-pixel reflow, fresh terminal access after discovery
empties, neutral predecessor and origin denial, explicit recovery, held response
retirement, malformed detail and close. Each attempt is independently authorized;
the return target stores an identity, not a resource snapshot. No command is sent.
Its producer-owned wire fixture changes only marked synthetic responses, not real
assignment, OIDC, database or provider behavior. Full retry graphs, budget and
arbitrary run lookup are excluded.

The consumed annotation helper measures wrapped captions before clamping them
to viewport gutters. Direct 320/1440-pixel regressions in `guide-checkpoints.spec.ts`
cover placement, long labels, replacement and cleanup without video recording.
Denial checkpoints highlight the complete message so the caption does not cover
its non-disclosure explanation. This affects test-owned guide overlays only.

## Untouched-run cancellation walkthrough

The seventeenth chapter records fifteen assertion-backed checkpoints: disabled
rollout, fresh eligibility, acknowledgement, dismissal, keyboard/320-pixel
reflow, epoch conflict, hidden-before-POST context, lost committed response,
unchanged replay, fresh CANCELLED detail outside discovery, and held/denied then
restored access. Separate checks reject unsupported, denied, stale and durable-
authorization review and prove replay can first apply absent original intent.
The guide distinguishes run termination from provider cancellation and accepted
proof/case closure. Read its code-first migration rollout warning before enabling
the backend flag; old writers cannot resume after trigger installation even
with commands disabled. Synthetic facts are not actual authority/durability
verification. No generated media is committed.

## Browser-control walkthrough

The eighteenth chapter records fifteen assertion-backed checkpoints covering
explicit acquisition/renewal/release, lost lifecycle acknowledgement, identical
replay, another session, expiry, monotonic reacquisition, keyboard/320-pixel
reflow, separately acknowledged fenced cancellation, hidden-before-POST context,
unchanged business replay, terminal status and neutral denial. A separate browser
regression advances its controlled clock to retire an open confirmation at
advisory expiry. Existing chapters explicitly simulate enforcement off; a missing
production endpoint is not a fallback. The guide does not verify real sessions,
PostgreSQL races or provider behavior. Deploy Ergon PR #172 and all compatible
writers/readers/UI before quiesced control enablement. No generated media is
committed.

## Failure handling

The nineteenth chapter inspects sanitized browser execution admissions in fourteen
assertion-backed checkpoints: lazy access, supported absence, historical epochs,
recording-order ties and admission backsteps, keyboard/320-pixel reflow,
pending/denied withdrawal, fresh recovery, unsupported/malformed responses,
100-entry truncation, parent-gate retirement and terminal detail outside active
discovery. It sends no command and requires no control lease. A separate browser
regression retires a held late history response. Protocol/cache/feature tests own
strict validation, shared-reader isolation and private modal retirement. These
fixtures are not live audit, authorization, provider-call or exactly-once proof.
Deploy Ergon PR #174 first; no generated media is committed.

A failed browser scenario removes its incomplete chapter directory and retains
the normal Playwright failure artifacts. CI uploads them from the config-relative
`apps/ergon-workbench-e2e/test-output/playwright` directory, not a similarly named
repository-root directory. The workflow regression derives this path from the
installed Nx preset. The assembler runs only after all
tagged scenarios pass. The guide scripts do not start, reset, or mutate a
shared database. A live guide environment remains out of scope. Both the
review artifact and Pages output have the same synthetic trust boundary as
local output.
