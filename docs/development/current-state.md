# Current UI implementation state

## TL;DR

Supporting inspection now uses four compact launch rows for the exact pinned
contract, pinned readiness, browser admissions and observed gateway attempts.
Each keeps its distinct purpose and visible unavailable reason. Shared framing
owns no eligibility, request or modal state; existing inspectors still own
explicit fresh reads, failure withdrawal and focus return. Their guides cover
the launch surfaces without claiming a live trace or outcome proof.

The assigned Console's compact supervision bar keeps identity, current control,
advisory countdown and explicit actions visible. Static authority/control prose
is available through native keyboard disclosures; failures, uncertainty and
recovery are never collapsed. Expanding guidance reflows the shell without
requests or authority changes. Supervision and control guides cover this layout.

The central Console is execution-first: recorded start/policy, receipt/measurement
and transitions precede Run actions, Supporting inspection and Attempt context.
All existing entry points remain directly available under their original fresh
access and confirmation rules. The four private sections retire together when
detail is withheld; no trace, authority, URL or cache contract changes.
The assigned-run guide demonstrates the reading order without another request.

Pinned case coordinates, bindings and source inspection now occupy a dedicated
Case evidence section in the leading investigation column beside discovery.
The trailing pane separates verification, accepted proof and recorded run state
from those inputs. Both views share the existing private disclosure gate;
the Evidence jump performs no read or authority change.

Assigned supervisors can now jump directly to the persistent Console section
headings from the toolbar, including during withheld or failed reads. This
focus-only navigation changes no selection, URL, authority, cache or command.
The assigned-run executable guide covers keyboard use and 320-pixel reflow.

The assigned Console now explicitly inspects readiness at the run's immutable
case/contract pin through merged Ergon PR #182. Missing requirements, exact
applicability and the selected citation (even beyond first-100 history) remain
distinct from historical planning, current-case readiness, execution and proof.
The twenty-third simulated guide covers fresh access, privacy and reflow. See
[ADR 0044](../decisions/0044-inspect-pinned-readiness-and-selected-evidence.md).

The assigned Console now explicitly inspects the exact normalized contract
revision pinned by its current run, using merged Ergon PR #180. Applicability,
required evidence, ordered declarations, pinned-step identification and outcome
conditions remain distinct from readiness, effective policy, execution and proof.
Fresh private access and safe failures reuse the existing inspection barrier.
The twenty-second simulated chapter covers the complete read-only flow; no
catalog, authoring YAML reconstruction or multi-step execution is introduced.

The assigned Console now explicitly inspects merged Ergon PR #178's protected
gateway-attempt history: preparation, no recorded completion, measured gateway
success/failure and UNKNOWN effects. Exact nanoseconds, partial coverage and
explicit truncation remain distinct from admissions, receipts, state and proof.
Fresh rechecks/retirement and shared failed-access withdrawal use existing owners.
The twenty-first simulated guide demonstrates keyboard/narrow inspection and
safe recovery without business writes. No live trace, cost or new retry policy
is implemented.

The repository contains a verified resolver-workbench shell, a fail-closed
confidential-BFF session boundary, a shared resolver inbox, and a web-only UI
package. Resolvers can claim visible work with an ephemeral session-bound CSRF
token, recover their active claims, release exact owned claims from a card or
the selected Console, and inspect server-authorized case context there. The
Console's case evidence and runtime state remain read-only. Assigned supervisors can also
discover active runs and inspect their recorded start, pinned policy, and
current state, sanitized terminal execution measurements and ordered recorded
transitions in a separate
three-pane Console with confirmed current-supervisor handover, exact human
approval prerequisites, pinned binding/source inspection and confirmed exact proof
acceptance with verified case closure, and approved pinned-capability execution
with explicit same-reservation recovery, plus confirmed failed-run successors
with fresh access and independently evaluated safeguards, plus explicit exhausted-run
escalation into unassigned work with independent fresh access. React Hook Form owns confirmation fields.
It has no general steering,
live trace, lease, logout flow, Motion animation,
requester app, or native app.

## Implemented

The assigned-run Console also confirms untouched-run cancellation through Ergon
PR #170's separately enabled browser contract. Fresh review checks version-zero
eligibility; explicit acknowledgement binds exact epoch/intent. Uncertainty
permits unchanged replay only, including possible first application. CANCELLED
detail and RUN_CANCELLED history are decoded without an execution receipt and
reacquired through fresh independent gates after active discovery empties.
This does not stop provider work, accept proof or close the case. See
[ADR 0038](../decisions/0038-confirm-untouched-run-cancellation.md). The seventeenth
simulated chapter records fifteen useful operator checkpoints; backend tests own
real authority, fencing and durability evidence.

- pnpm workspace managed by Nx 23;
- Node 24 and React 19.3 version contract;
- Vite-built workbench with React Router Data Mode;
- Tailwind CSS theme tokens, a dark scope for the selected Resolver Console,
  a shadcn-compatible button primitive, and a consumed native inspection modal;
- explicit app-owned standard/focused shell composition with one set of
  landmarks, branding/navigation and natural toolbar/viewport allocation;
  capability-owned presence controls and evidence/execution/outcome sections
  use consumed named pane slots in populated, pending and failure states.
  No feature-class chrome selectors or guessed shell-height subtraction remain;
- accessible home and unknown-route recovery screens;
- tenant route validation and confidential BFF session consumption;
- RTK Query cache ownership with Effect-based HTTP, timeout, bounded retry,
  cancellation, schema decoding, and typed failure mapping;
- cause-free defect containment at session, follow-up, and assigned-run cache
  boundaries, including missing bindings and rejection during cancellation;
  capability-owned normalization drops diagnostic extras, validates HTTP status,
  and distinguishes workbench defects from malformed server responses. Mutation
  defects preserve uncertainty and the exact intent for explicit replay;
- explicit local sign-in navigation from the validated BFF problem contract;
- explicit authentication-required, unregistered-actor, rejected-identity,
  transient-failure, invalid-response, and verified-session UI states;
- BFF follow-up page decoding with current-authority non-disclosure semantics;
- URL-owned queue filtering, local reversible keyset navigation, and explicit
  loading, empty, failure, and populated inbox states;
- session-bound CSRF acquisition kept outside Redux and persistent storage;
- revision-checked follow-up claiming, including released work, with explicit
  conflict, expiry, authority, ambiguous-result, and same-command retry states;
- confirmed exact-claim release from active-work cards or the Console with
  typed disabled/stale/absence outcomes, same-tuple explicit retry, and
  server-cache revalidation. Console context closes before the release POST;
  release still requires the backend's operator-controlled rollout flag;
- tenant-wide inbox invalidation after successful or stale-item claim results;
- browser-owned work decoding, neutral empty-state handling, reversible exact
  claim-cursor pagination, and post-claim cache refresh;
- locally selected, full-width Resolver Console on the existing tenant route,
  with no case URL or persistent selection. It presents recorded observations,
  provenance, and occurrence/recording times through a local source-observation
  inspector; the failed handoff and ordered durable attempts with expandable
  recorded transition, connector-result, and retry-link events; and the pinned,
  unassessed outcome condition in three responsive panes. The inspector
  distinguishes observations in the run's evidence snapshot from those
  recorded later, filters the list by that boundary, and compares two visible
  sources in a modal inspector without treating either as a verified claim or
  assessing a contradiction. A read-only execution-policy card groups the
  escalated run's recorded capability, effective risk, approval requirement,
  and policy revision without asserting a current approval decision. Section
  jumps focus each pane without creating a case URL or fragment. Its Current
  claim strip shows the server-verified actor ID and identity provider without
  implying a lease or claim authorization. It shows the last server-observed
  claim and offers an explicit recheck that hides evidence while ownership and
  case context are reread; it does not invent a lease or countdown. It does not
  portray attempts as a live tool trace;
- lazy owned-follow-up case context with contract/run consistency checks,
  evidence-boundary validation, full request-tuple cache identity, neutral
  absence handling, cache eviction when the Console closes, fail-closed
  revalidation on reopening, plain-text observation rendering, and private
  context hidden when an owned-work recheck fails or the exact claim disappears
  or changes;
- single-owned private Console workflows: data-access hooks acquire distinct
  fresh gates and retire subscriptions without aborting another active reader;
  feature controllers derive current rows from exact selection coordinates and
  commit hidden recheck/release phases before I/O. Inbox detours suspend rows
  and reads while preserving traversal and exact uncertain claim-retry intent;
- strict TypeScript, source-owned TSDoc for non-obvious public contracts,
  ESLint project boundaries, Prettier, Vitest, and Playwright;
- twelve local executable guides for simulated workbench access states,
  shared-inbox pagination and filtering, the claim and release workflow,
  owned-case-context revalidation, competing or uncertain claim recovery, and
  disabled or uncertain release recovery, and assigned-run snapshot supervision
  and revalidation, with annotated screenshots, video,
  recovery guidance, and validated Markdown/static HTML output; CI uploads
  them as an expiring review artifact and has a `main`-only GitHub Pages
  publication job; recording fails on unexpected HTTP(S) traffic or unmarked
  synthetic BFF responses;
- a capability-located session model plus a cancellation-aware current-actor
  client owned by session web data access, with no ceremonial application
  project;
- capability-located follow-up model with platform-neutral values, pure
  claim/work-item pairing and case-summary refinements, and verified Nx project
  metadata; follow-up request and failure contracts live in web data access
  without an interface-only application project;
- a capability-located follow-up web data-access package with separated wire
  contracts, read execution, claim/CSRF execution, protocol failure
  translation, and explicit RTK Query cache integration;
- a capability-located follow-up web feature package with capability-owned
  orchestration, presentation, failure copy, and independently verified
  component tests;
- a capability-located session web data-access package owning its typed client
  contract, wire decoding, failure classification, read execution, cancellation
  normalization, and tenant-keyed RTK Query integration;
- a capability-located session web feature that validates tenant navigation
  context, renders fail-closed verification states, and mounts app-supplied
  authenticated content only after a verified actor is returned;
- an independent run-supervision web data-access and feature capability for
  assigned active-run discovery, paired keyset paging, local selection, exact
  tenant/run cache identity, zero unused-detail retention, read-only pinned
  capability policy, neutral absence, explicit fail-closed recheck, and terminal
  detail retained only after a successful BFF read. The app composes both work
  areas under session verification; `view=runs` names the area without storing
  a run ID in navigation or browser persistence;
- executable first-page reset for rejected assignment traversal, without putting
  private cursors in URLs or retrying a rejected cursor; failed session rechecks
  keep authenticated work unmounted even while RTK retains the previous actor;
- assigned-only execution receipt presentation, with exact decimal-string
  nanoseconds, gateway-call milliseconds and keyboard provenance disclosure;
  older-server omission, no receipt, unmeasured timing and measured zero are
  distinct. Receipts never imply run-state advancement or outcome proof, and
  their private fields withdraw under the existing fresh-read gate;
- capability-first `type:*`, `scope:*`, and `platform:*` boundaries with a
  finite ledger for packages still under the old global-layer paths and a
  DOM-free TypeScript configuration for model and application cores;
- sequence-aligned assigned-run transition presentation: revision-zero empty,
  capability-result projection and terminal decision retain distinct meanings.
  Data access validates chain, revision, timestamps and receipt attribution;
  explicit rechecks hide the history with all other private context. Missing
  old-server history is unsupported, not empty. The current stream is bounded
  to two events; no live spans or proof payloads are inferred;
- CommonMark-aware repository policy for local links, summaries, ADR history,
  milestone fields, and GitHub templates;
- progressively routed harness guidance and staged GitHub verification; and
- accepted workbench/requester topology decision.

- Confirmed browser supervision handover uses an ephemeral recipient and
  acknowledgement form, fresh current-epoch candidate reads, committed private
  withdrawal before POST and explicit exact-command replay. Success is a
  historical receipt followed by fresh assigned discovery, not execution or
  current-owner inference. The eighth synthetic guide records this workflow
  and recovery.

- The assigned Console now derives human approval lifecycle and exact observed
  eligibility from its gated RTK projection. An acknowledged modal can confirm
  APPROVED/REJECTED through session CSRF and a supervision-fenced command.
  Private reads withdraw before POST; uncertain results keep exact replay intent,
  while conflicts require revalidation. Historical success triggers fresh work
  discovery, never optimistic runtime advancement. The ninth guide covers 21
  synthetic steps and explicitly distinguishes a prerequisite from a grant,
  execution, resumption and proof.

- Pinned evidence now extends the same gated Console resource, with exact
  case/boundary, subject/source, stream-order and size validation. The trailing
  pane presents binding history and keyed source modals as inert text. Unsupported,
  empty, malformed and truncated snapshots stay distinct; resource withdrawal
  retires inspection. The tenth synthetic guide records 17 steps, keyboard/narrow
  behavior, failed/held rechecks and zero writes. No general claim, confidence,
  validity or contradiction model is implied.

The assigned Console now displays one real pinned outcome condition, current
assessment and exact selected post-action citation, or immutable accepted proof
and paired case closure. MATCHING is explicitly not durable acceptance. The
eleventh synthetic guide records 16 verification steps, including later mismatch,
keyboard/narrow source inspection, terminal discovery, failed/held rechecks and
malformed attribution. No new cache, package or dependency edge is added. See
[ADR 0033](../decisions/0033-inspect-outcome-verification-and-accepted-proof.md).

## Pinned capability execution

The assigned Console now explicitly reviews, confirms and recovers the exact
approved pinned action through Ergon PR #164's merged browser contract. Fresh
eligibility remains RTK-owned; acknowledgement and immutable intent reuse the
existing command disclosure barrier. Admitted identities acknowledge only;
retrying an unadmitted identity may first admit the original confirmed intent.
New recovery attempts retain the original command/provider reservation and need
fresh original-actor/current-supervisor/resolver gates. Receipt-only projection
repair does not repeat connector I/O. Successful execution reaches VERIFYING,
not proof acceptance or closure. The thirteenth synthetic guide has 20 steps,
including acknowledgement/cancellation, narrow keyboard interaction, stale intent,
lost acknowledgement, explicit recovery and pending/denied revalidation. See
[ADR 0035](../decisions/0035-confirm-capability-execution-and-recovery.md).

Execution defaults off under `ERGON_RUN_SUPERVISOR_EXECUTION_ENABLED`; backend
schema/code must be deployed first. No real-provider, live session-to-database
execution or production operator recovery is established by the synthetic guide.
Incoming supervisors cannot adopt another actor's command. Navigation can discard
local replay intent without undoing admitted effects.

## Failed-run retry

The fourteenth simulated guide records twenty steps for the merged Ergon PR
#166 retry contract. A fresh review exposes narrow current planning and the
versioned total-attempt ceiling. Confirmed session-CSRF intent atomically creates
and assigns only its fresh successor at the backend; the browser neither invokes
a connector nor inherits approval, grant, receipt or provider key. Uncertainty
retains the exact command and plan for explicit replay, which may first commit
the original intent if absent. Success selects only an identity and reacquires
fresh discovery/detail; a historical acknowledgement cannot restore access after
handover. Exhaustion offers no third attempt; explicit escalation is separate. See
[ADR 0036](../decisions/0036-confirm-failed-run-retry-and-fresh-successor-access.md).

The backend defaults off under ERGON_RUN_SUPERVISOR_RETRY_ENABLED. Every nullable-
provenance assignment reader must be upgraded before enabling. After first use,
disable commands and recover forward, preserving audit. Guide recording remains
synthetic, not real IdP/provider/database-backed browser verification.

## Exhausted-run escalation

The fifteenth simulated guide records seventeen steps for merged Ergon PR #168.
Fresh review confirms the exact supervisor/run/attempt and runtime exhaustion
policy. RHF acknowledgement creates immutable intent; the existing barrier hides
all private resources before one bounded CSRF/POST. Conflicts need fresh facts;
uncertainty offers unchanged explicit replay, potentially first committing absent
intent. Success reacquires authorized terminal detail even outside active
discovery. Historical OPEN is original unassigned creation, not current ownership.
Existing Back to follow-ups navigation reopens independently authorized discovery;
there is no automatic claim, third attempt, execution, proof or case closure.

Deploy backend schema/code before enabling
ERGON_RUN_SUPERVISOR_ESCALATION_ENABLED (default false). Disabling preserves
history; recover forward. Protocol, cache, feature and Chromium regressions plus
the recorded guide cover browser behavior, not real IdP/provider/database-backed
browser certification. See
[ADR 0037](../decisions/0037-confirm-exhausted-run-escalation-and-fresh-follow-up-access.md).

## Recorded attempt navigation

The assigned Console now exposes the existing immediate predecessor relationship
in a dedicated attempt-context section. Explicit inspection and one-level return
retain identities only and acquire fresh independently authorized exact-run reads,
including terminal runs outside active discovery. Pending/denied/malformed reads
withhold earlier snapshots; returning cannot restore previous authority. Ordinary
selection, close, traversal reset and tenant changes discard return intent.

The sixteenth simulated guide records thirteen steps for keyboard/320-pixel
interaction, terminal detail after empty discovery, neutral denial on either side,
late response retirement, malformed data and zero commands. Existing backend
contracts and authorization remain unchanged. No full retry tree, successor search,
new budget, automatic traversal or live identity/database certification is added.

## Deliberate limits

- OIDC client credentials and provider tokens remain entirely server-side.
- No logout, refresh, or revocation UI exists.
- Claimed work includes read-only case/run inspection and confirmed release
  back to the shared queue, not direct handover or case completion. There is
  no live trace, lease countdown, steering, approval, verification
  checklist, completion, resolution, reassignment, or dedicated case route.
- The BFF session contains no provider subject, and none is cached or shown.
- No production deployment configuration or ingress exists.
- The guide uses synthetic BFF responses; no live OIDC or database-backed
  browser guide environment exists. Pages publication requires repository
  settings and a successful `main` workflow run; neither a live deployment nor
  its public URL has been verified locally.
- The Console's extended run history and outcome-proof response is covered by
  synthetic browser fixtures here. Backend `main` now returns those fields;
  cross-repository live-browser compatibility has not yet been verified.
- Source-observation inspection and comparison are local to the current
  authorized Console response. They do not create claim nodes, contradiction
  edges, a graph, evidence editing, or a source-fetch command.
- No `/internal/v1` endpoint is treated as a supported browser contract.
- Assigned-run reads require Ergon core's assigned-only BFF and an immutable
  assignment created by a separately authorized machine integration or by the
  approved atomic fresh-successor retry boundary. This UI cannot generally
  assign existing runs or rewrite their initial assignment. Current supervisors can
  explicitly hand over current supervision when the backend rollout flag is
  enabled. It has no automatic polling or
  continuous revocation guarantee. The active-run Console receives pinned
  account-access bindings and a separate narrowly selected post-action proof
  citation, not unrelated later/unbound case evidence, ordered multi-step
  execution events or nested spans/costs. It displays runtime acceptance rather
  than independently observing the external outcome. Real session-to-PostgreSQL browser compatibility
  remains unverified by the synthetic guide.
- Backend handover is disabled by default during reader upgrades. Old backend
  readers are unsafe after transfer; disable new commands and recover forward.
- Backend browser approvals default off until its additive schema/backend is
  deployed. The browser cannot create/extend requests, provision authority,
  substitute resolver evidence for requester scope or withdraw a response. An
  approval decision alone cannot derive grants or invoke/advance a run; execution
  uses its separate reviewed command. Earlier servers show unsupported approval review.
- No requester, widget, or native placeholder has been created.
- React Hook Form owns the handover form; Motion remains deferred until a behavior needs it.

The Resolver Console now confirms exact reviewed matching proof through the
supervisor-authorized BFF command. RHF acknowledgement, cancellation, stale-proof
recovery and exact uncertain replay reuse the committed private-disclosure
barrier. Fresh protected reads recover terminal accepted proof and paired case
closure after active discovery empties. Protocol tests and the 19-step
twelfth guide cover the behavior; the guide's backend facts remain synthetic.
Ergon's `ERGON_RUN_PROOF_FINALIZATION_ENABLED` defaults off until additive schema
and backend deployment. This grants neither arbitrary steering nor forced closure.

Explicit session-bound browser control now consumes Ergon PR #172: fresh status,
acquire/renew/release, an advisory countdown and original fences across all seven
browser command families. Exact replay retains its original fence and never
renews. Terminal work takes no new lease; control loss does not stop admitted
execution. The eighteenth simulated guide explains lifecycle and business
recovery. Missing status fails closed; explicit DISABLED preserves rollout off.
No real cross-repository session deployment is certified by the guide. See
[ADR 0039](../decisions/0039-coordinate-explicit-fenced-browser-control.md).

Future resolver slices must use reviewed browser contracts for priority,
reassignment, completion, or resolution. Existing `/internal/v1` routes remain
ineligible for production UI use.

The Console now inspects Ergon PR #174's sanitized browser execution admissions
on demand, without a control lease. Fresh tenant/run/epoch reads distinguish
supported absence, neutral denial, unsupported servers and capped histories.
Returned recording order is not causal execution order; admission rows carry no
provider-call count, result, cost or duration. The nineteenth simulated guide
records privacy retirement, failure recovery, terminal inspection and accessible
320-pixel reflow. See [ADR 0040](../decisions/0040-inspect-recorded-execution-admissions.md).

The Console now recovers Ergon PR #176's independently visible direct retry
successor on demand. Strict data-access decoding and fresh RTK gates preserve
null/unsupported/denied distinctions and independent source/target epochs.
The feature reuses the inspection failure barrier and existing identity-only
related selection; opening and returning never restore snapshots or authority.
The twentieth simulated guide records sixteen checkpoints including terminal
access outside discovery, changed target epoch, pending/denied retirement,
keyboard/320-pixel reflow and zero commands. See
[ADR 0041](../decisions/0041-recover-independently-visible-retry-successors.md).
