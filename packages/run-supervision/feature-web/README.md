# Run-supervision web feature

## TL;DR

Own the assigned-supervisor Resolver Console's React interaction and complete
responsive three-pane presentation and confirmed supervision transfers. Reads
remain server-authoritative; handover changes access, never execution authority.
It also confirms the backend's bounded pinned execution/recovery contract;
it is neither a client application core nor a general steering surface.

## Owns

- A tenant-scoped workflow controller for local run selection, paired
  assignment-cursor traversal and heading-focus intent, with no run or case
  identity in URL or persistent storage.
- Assigned discovery, exact-run inspection, explicit recheck and recovery,
  accessible headings, status messages, policy disclosure, and narrow reflow.
- Cohesive supervisor presence/inspection toolbar, discovery, execution and
  outcome sections. Explicit named pane slots preserve the complete layout
  across selection, pending, failed and successful reads.
- Explicit selected-run rechecks and recovery move focus to the persistent
  execution heading before their button is withdrawn; pending and failed reads keep that target
  while private records remain hidden.
- Discovery rechecks and read recovery use that same stable heading before
  disabling or withdrawing the initiating control. These explicit interaction
  callbacks add no focus effects tied to background discovery phases.
- Closing the exact-run gate during revalidation or failed discovery and on
  close/tenant switch. Request retirement and zero-grace eviction are owned by
  data access, not workspace rendering.
- Committed workflow/gate changes that hide private DOM before synchronous or
  held I/O. Immediate same-run reopening obtains a distinct check after older
  same-key requests settle; retiring one view never aborts another active reader.
- Distinguishing recorded terminal states from inspected outcome proof.
  A dedicated execution-record section renders the pinned capability's sanitized
  receipt, connector result, exact gateway-call latency and keyboard-inspectable
  measurement provenance. Missing projection, absent receipt, unmeasured timing
  and measured zero remain distinct; cost is explicitly not measured. Result,
  state projection and outcome proof never substitute for each other.
  A selected terminal run may remain readable after leaving active discovery
  only while an exact assigned-run read still succeeds.
- Capability-specific failure copy and use of the app-composed sign-in URL.
  Cache errors are normalized by data access before the closed failure/recovery
  mapping selects sign-in, an explicit read retry, traversal reset, or no action.
  Reset starts a fresh first-page read and discards selection and cursor history,
  including when the rejected request was already for the first page.
  Unexpected defects are distinct from malformed responses and never trigger an
  automatic retry.

## Does not own

- Protocol decoding, Effect execution, cache policy, authentication, authority,
  tenant routing, store assembly, or supervisor assignment.
- App branding, global navigation, standard/focused shell, theme scope or
  viewport allocation. Presence can wrap without an assumed header height;
  panels never subtract fixed chrome dimensions from the viewport.
- Lease ownership, timers, grants, backend approval policy, steering,
  multi-step execution events, tool spans, billing or evidence compilation.
  Their absence is explicit rather than filled with synthetic data.
- Shared domain-agnostic primitives or an interface-only application layer.

## Public API and dependencies

`AssignedRunWorkspace` accepts tenant request context, a trusted same-origin
sign-in URL, an opaque verified-actor presence slot, and the required app-owned
`WorkspaceRenderer`. Mount it beneath the application's verified-session boundary.
Presence display is not authority. All server state stays in RTK Query;
private selection and pagination intent stay in React state.

The renderer receives focused mode, snapshot-derived command availability, a
capability-owned toolbar and content together during render. The app supplies
branding, the page heading, Back to follow-ups navigation and outer placement;
no visibility callback mirrors the workflow. `ThreePaneLayout` from
`@ergon/ui-web` owns named leading/primary/trailing wrappers and responsive
allocation. The feature supplies their domain landmarks in that order and
keeps both execution and outcome placeholders present when detail is hidden.

`useAssignedRunWorkflow` is an implementation boundary, not another resource
cache or platform-neutral application core. It composes the cache-owned fresh
discovery/detail gates and keeps a selected terminal run as local intent when
active discovery no longer contains it. The workspace renders explicit typed
read phases and callbacks; it owns no promises, subscription aborts, transport
decoding or mirrored visibility. Presentation consumes those same typed gates
without introducing another request or focus owner.

Execution presentation derives directly from the currently disclosed RTK
projection. It stores no receipt copy, disclosure state or elapsed timer.
Exact decimal placement formats nanoseconds in milliseconds without floating-
point rounding. The native provenance disclosure performs no request and is
withdrawn with the rest of the private snapshot on recheck, failure or close.
Completion/start timestamps are observations, not duration inputs. This is one
winning receipt caller's gateway call, not total provider-operation latency or
aggregated retries. See [ADR 0028](../../../docs/decisions/0028-render-attributed-capability-execution.md).

The feature consumes `@ergon/run-supervision-data-access-web` through its
public API and `@ergon/ui-web` for reviewed primitives. Its Nx tags are
`type:feature`, `scope:run-supervision`, and `platform:web`.

`AssignedRunTransitionHistory` derives from that same current gated projection.
It renders at most two durable transitions in append order, never timestamp
order, and keeps unsupported history separate from a revision-zero empty
prefix. No receipt, history or state copy is retained. Occurrence and recording
times are not latency. A proof-acceptance label is a recorded decision, not
inspected proof evidence itself. The separate verification section now supplies
only its selected citation and distinguishes mutable matching from durable proof.
See [ADR 0029](../../../docs/decisions/0029-display-sequence-aligned-run-transitions.md).

## Confirmed commands

The approval card derives current request/decision facts from the gated Console,
never a local resource copy. An eligible supervisor can confirm APPROVED or
REJECTED through an acknowledged RHF form in the reviewed modal. The shared
feature-local confirmed-command controller blocks all private resources before
I/O, retires callbacks and keeps exact intent for explicit uncertain replay.
Conflicts require revalidation. Success is historical feedback and resets private
selection before fresh discovery. Neither outcome grants, executes, resumes or
verifies anything. See [ADR 0031](../../../docs/decisions/0031-confirm-human-approval-prerequisites.md).

Recipient lookup rechecks supervision. Any failed candidate read withdraws the
earlier run snapshot and dialog before paint, without manufacturing a command
or offering mutation replay. Recovery must establish fresh run access.

The handover surface owns a confirmed React Hook Form recipient/acknowledgement
form, local private candidate traversal and immutable command intent. The
existing ui-web modal owns native focus/inertness and layout. A committed
submitting phase suspends all private discovery/detail before I/O and focuses
the persistent execution heading after modal teardown. Uncertain results offer
only exact replay; definite conflicts require revalidation before a new choice.
Late callbacks are retired after navigation or tenant change. The original
assignment timestamp is historical, and a receipt never asserts current ownership.
No state enters URLs or persistent storage. See
[ADR 0030](../../../docs/decisions/0030-confirm-revisioned-supervisor-handover.md).

## Pinned evidence

The trailing case/outcome pane also owns pinned binding history and exact linked
source inspection. Each keyed binding owns only modal visibility; all facts stay
in the current RTK projection. The ui-web modal owns keyboard/focus behavior, and
the private gate withdraws source content during revalidation, denial, mutations
or navigation. Source text/references are inert plain text. Unsupported, empty and
truncated history have different copy; no confidence, contradiction, latest-value
or proof claim is inferred. See [ADR 0032](../../../docs/decisions/0032-inspect-supervisor-scoped-pinned-evidence.md).

## Outcome verification

`AssignedRunVerification` renders one real pinned condition, status and exact
assessment or accepted proof in the outcome pane. Its keyed inspector owns only
modal visibility, never a source copy. Proof withdraws with the Console gate;
replaced run/status/version/fact identities cannot resurrect an old modal. No
multi-check count, confidence or generalized contradiction is inferred. The shared
modal owns focus and narrow reflow. See
[ADR 0033](../../../docs/decisions/0033-inspect-outcome-verification-and-accepted-proof.md).

An enabled MATCHING snapshot can open a separate acknowledged exact-proof
confirmation. The server owns authorization and reassessment; the feature owns
only form/modal state, exact command intent and historical feedback. It reuses
the command disclosure barrier, retires stale callbacks and offers exact replay
only on uncertainty. A definite conflict needs a fresh review. Success retains
selection while fresh gated reads recover the terminal accepted proof even when
active discovery is empty. No proof snapshot is copied into local state. See
[ADR 0034](../../../docs/decisions/0034-confirm-exact-outcome-proof.md).

## Execution and recovery

The pinned execution control opens a fresh eligibility review and an acknowledged
RHF confirmation. Disabled/unsupported/stale/denied review never creates command
intent; failed access review withdraws the earlier private Console and modal.
Execution and recovery show risk, scope, revisions and irreversible admission.
Submission uses the existing committed disclosure barrier before I/O; navigation
retires callbacks, not server effects. Only immutable intent or historical feedback
is retained, never a review/Console copy.

An uncertain POST offers **Retry exact execution intent**, preserving its tuple.
An admitted identity only acknowledges status; an unadmitted one may first admit
and dispatch that original confirmation. Additional recovery requires a fresh review
and **Confirm new recovery attempt** on the original command. INCOMPLETE,
RESULT_RECORDED and COMPLETED remain distinct; success reaches VERIFYING, not
independent proof or case closure. New command intent clears superseded command
feedback so execution cannot mask later proof/handover feedback. The existing
modal owns focus/placement; app shell and project edges are unchanged. See
[ADR 0035](../../../docs/decisions/0035-confirm-capability-execution-and-recovery.md).

## Failed-run retry

The dedicated retry control opens fresh eligibility for ACTION_FAILED at its
eligible revision. The RHF form shows the current plan, retry policy, total
ceiling and fresh safeguards; failed or stale review withdraws earlier private
context. Valid confirmation creates immutable intent and uses the existing
committed disclosure barrier. Only explicit unchanged replay is offered for
uncertainty; conflicts require fresh review. Acknowledgement selects just the
successor identity before fresh discovery/detail gates. No predecessor approval,
receipt or proof is copied, and historical feedback grants no access after
handover. Exhaustion offers no third attempt; escalation is a separate control.
Modal/focus ownership and shell composition are unchanged. See
[ADR 0036](../../../docs/decisions/0036-confirm-failed-run-retry-and-fresh-successor-access.md).

## Exhausted-run escalation

The dedicated escalation control reacquires private eligibility on each opening
and confirms the exact exhausted budget in an acknowledged RHF modal. Failed or
stale review withdraws earlier context without creating intent. The shared
committed barrier removes private resources before command acquisition and keeps
only immutable local intent for explicit uncertain replay. Conflicts need fresh
facts; callbacks retire on navigation. No resource snapshot or new layer exists.

Success reacquires selected terminal detail independently of active discovery.
Creation feedback labels OPEN as historical, not current status/ownership. The
existing app-owned Back to follow-ups navigation leads to independently gated
queue discovery and a separate claim decision; no work ID grants private access.
No third attempt, connector, notification, claim, proof or case closure follows.
See [ADR 0037](../../../docs/decisions/0037-confirm-exhausted-run-escalation-and-fresh-follow-up-access.md).

## Verification

```powershell
pnpm nx lint @ergon/run-supervision-feature-web
pnpm nx typecheck @ergon/run-supervision-feature-web
pnpm nx test @ergon/run-supervision-feature-web
```
